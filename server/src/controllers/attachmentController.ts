import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { Attachment } from '../models/Attachment';
import jsonStore from '../config/jsonStore';
import { DB_AVAILABLE } from '../config/db';
// Transport import not needed here
import { encryptFile, decryptFileToStream } from '../utils/fileCrypto';
import { parsePdfForFlightAndPrice, autoAssignToTransportIfFlightMatches, parseDocxForFlightAndPrice, docxToHtml, sanitizeHtml } from '../services/attachmentParser';
import { authenticateToken } from '../middleware/auth';
import { query } from '../config/db';

// Helper to convert snake_case JSON to camelCase to keep API consistent with DB objects
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(item => toCamelCase(item));
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      if (value instanceof Date) acc[camelKey] = value.toISOString();
      else acc[camelKey] = toCamelCase(value);
      return acc;
    }, {});
  }
  return obj;
};

const uploadDir = process.env.UPLOAD_DIR || '/app/uploads/attachments';
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uid = (process.env.NODE_ENV === 'test') ? Date.now() : crypto.randomUUID();
    cb(null, `${uid}-${file.originalname}`);
  }
});

const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) } });

export const uploadAttachmentHandler = [
  authenticateToken,
  upload.single('file'),
  async (req: any, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'File is required' });

      // If DB is not available, persist to JSON store instead
      const { journeyId, stopId, transportId } = req.body;

      const originalFilename = req.file.originalname;
      const filePath = req.file.path;
      const destFilename = `${req.file.filename}.enc`;
      const destPath = path.join(uploadDir, destFilename);

      // NOTE: We intentionally do not auto-parse or auto-assign on upload.
      // Parsing/extraction should be triggered manually via the /attachments/:id/extract endpoint.

      // Encrypt file
      const { iv, authTag } = await encryptFile(filePath, destPath);

      // Remove original plain file after encryption
      fs.unlinkSync(filePath);
      if (!DB_AVAILABLE) {
        // Save metadata in JSON store
        const newAttach = await jsonStore.insert('attachments', {
          journey_id: journeyId || null,
          stop_id: stopId || null,
          transport_id: transportId || null,
          filename: destFilename,
          original_filename: originalFilename,
          file_path: destPath,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          uploaded_by: (req as any).user?.id || null,
          is_encrypted: true,
          iv,
          auth_tag: authTag,
          created_at: new Date().toISOString(),
        });

        return res.status(201).json({ attachment: toCamelCase(newAttach) });
      }

      // Persist metadata to DB

      // Save metadata
      const attachment = await Attachment.create({
        journeyId: journeyId || null,
        stopId: stopId || null,
        transportId: transportId || null,
        filename: destFilename,
        originalFilename,
        filePath: destPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: (req as any).user?.id || null,
        isEncrypted: true,
        iv,
        authTag
      });

      // No auto-parsing or assignment here; extraction is manual.

      res.status(201).json({ attachment: attachment.toJSON() });
    } catch (err) {
      console.error('File upload error', err);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  }
];

export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) {
      attachment = await jsonStore.getById('attachments', id);
    } else {
      attachment = await Attachment.findByPk(id);
    }
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Check permissions: uploader or shared users
    const userId = (req as any).user?.id;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      // Check journey_shares (user accepted and accepted)
      if (!checkAttachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const shareRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [checkAttachment.journeyId, userId, 'accepted']);
        if (!shareRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const filePath = (!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath;
    const iv = (!DB_AVAILABLE) ? checkAttachment.iv : attachment.iv;
    const authTag = (!DB_AVAILABLE) ? checkAttachment.authTag : attachment.authTag;

    const inline = req.query.inline === '1' || req.query.inline === 'true';
    const readStream = decryptFileToStream(filePath, iv || '', authTag || '');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${checkAttachment.originalFilename}"`);
    res.setHeader('Content-Type', checkAttachment.mimeType);
    readStream.pipe(res);
  } catch (err) {
    console.error('Download error', err);
    res.status(500).json({ message: 'Failed to download' });
  }
};

// NOTE: extractAttachmentData provides the extraction via decryption to temp and parsing.

export const previewAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) attachment = await jsonStore.getById('attachments', id);
    else attachment = await Attachment.findByPk(id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    const check = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;

    const userId = (req as any).user?.id;
    if (check.uploadedBy !== userId) {
      if (!check.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', check.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [check.journeyId, userId, 'accepted']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const filePath = check.filePath;
    const mime = check.mimeType || '';
    if (mime.includes('pdf')) {
      return res.json({ type: 'pdf', url: `/api/attachments/${id}/download?inline=1` });
    }
    if (mime.includes('officedocument') || mime.includes('msword') || mime.includes('word')) {
      const htmlRaw = await docxToHtml(filePath);
      const html = sanitizeHtml(htmlRaw);
      return res.json({ type: 'docx', html });
    }
    res.status(400).json({ message: 'Preview not available' });
  } catch (err) {
    console.error('Preview error', err);
    res.status(500).json({ message: 'Failed to preview' });
  }
};

export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) {
      attachment = await jsonStore.getById('attachments', id);
    } else {
      attachment = await Attachment.findByPk(id);
    }
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    const userId = (req as any).user?.id;
    // Only uploader or journey owner or manager role can delete
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      // check if user has manage rights
      if (!attachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted' && s.role === 'manage');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3 AND role = $4', [attachment.journeyId, userId, 'accepted', 'manage']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    // delete file on disk
    const filePath = (!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (!DB_AVAILABLE) {
      await jsonStore.deleteById('attachments', checkAttachment.id);
    } else {
      await attachment.destroy();
    }
    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    console.error('Delete attachment error', err);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
};

export const listAttachmentsForJourney = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    if (!DB_AVAILABLE) {
      const attachments = await jsonStore.findByField('attachments', 'journey_id', journeyId);
      return res.json(toCamelCase(attachments));
    }

    const attachments = await Attachment.findAll({ where: { journeyId } });
    res.json(attachments.map(a => a.toJSON()));
  } catch (err) {
    console.error('List attachments', err);
    res.status(500).json({ message: 'Failed to fetch attachments' });
  }
};

export const applyAttachmentToTarget = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { targetType, targetId } = req.body;
    let attachment: any = null;
    if (!DB_AVAILABLE) {
      attachment = await jsonStore.getById('attachments', id);
    } else {
      attachment = await Attachment.findByPk(id);
    }
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Check permission - user must be uploader or have manage rights
    const userId = (req as any).user?.id;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      if (!attachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted' && s.role === 'manage');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3 AND role = $4', [attachment.journeyId, userId, 'accepted', 'manage']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Acceptable target types: transport, stop, journey
    if (targetType === 'transport') {
      if (!DB_AVAILABLE) attachment.transport_id = targetId;
      else attachment.transportId = targetId;
    } else if (targetType === 'stop') {
      if (!DB_AVAILABLE) attachment.stop_id = targetId;
      else attachment.stopId = targetId;
    } else if (targetType === 'journey') {
      if (!DB_AVAILABLE) attachment.journey_id = targetId;
      else attachment.journeyId = targetId;
    } else {
      return res.status(400).json({ message: 'Invalid target type' });
    }
    if (!DB_AVAILABLE) {
      await jsonStore.updateById('attachments', attachment.id, attachment);
    } else {
      await attachment.save();
    }
    const io = req.app.get('io');
    io.emit('attachment:applied', { attachmentId: attachment.id, targetType, targetId });
    return res.json(!DB_AVAILABLE ? toCamelCase(attachment) : attachment);
  } catch (err) {
    console.error('Apply attach error', err);
    res.status(500).json({ message: 'Failed to apply attachment' });
  }
};

export const extractAttachmentData = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) attachment = await jsonStore.getById('attachments', id);
    else attachment = await Attachment.findByPk(id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Permission check (uploader or shared)
    const userId = (req as any).user?.id;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      if (!checkAttachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [checkAttachment.journeyId, userId, 'accepted']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const mime = checkAttachment.mimeType || checkAttachment.mime_type || '';
    // Only support extraction for PDFs and docx
    if (!mime.includes('pdf') && !mime.includes('word') && !mime.includes('officedocument')) {
      return res.status(400).json({ message: 'Extraction supported only for PDF and DOCX files' });
    }

    const tempPath = path.join(uploadDir, `temp-${crypto.randomUUID()}${path.extname(checkAttachment.filename || checkAttachment.filePath || '') || ''}`);
    // decrypt to temp
    const stream = decryptFileToStream((!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath, checkAttachment.iv || '', checkAttachment.authTag || checkAttachment.auth_tag || '');
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(tempPath);
      stream.pipe(out);
      out.on('finish', () => resolve(undefined));
      out.on('error', reject);
    });

    let parsed: any = null;
    if (mime.includes('pdf')) {
      parsed = await parsePdfForFlightAndPrice(tempPath);
    } else {
      // docx
      parsed = await parseDocxForFlightAndPrice(tempPath);
    }

    // clean up temp
    try { fs.unlinkSync(tempPath); } catch (e) {}

    // Persist parsed results to attachment parsed_json
    if (!DB_AVAILABLE) {
      attachment.parsed_json = parsed;
      await jsonStore.updateById('attachments', attachment.id, attachment);
    } else {
      attachment.parsedJson = parsed;
      await attachment.save();
    }

    // If assign query param present, try to auto-assign to transport with matching flight number
    const assign = (req.query.assign === '1' || req.query.assign === 'true' || req.body?.assign === true);
    let assignedTransport: any = null;
    if (assign && parsed?.flightNumber && checkAttachment.journeyId) {
      const matched = await autoAssignToTransportIfFlightMatches(checkAttachment.journeyId, parsed.flightNumber);
      if (matched) {
        if (!DB_AVAILABLE) {
          attachment.transport_id = matched.id;
          await jsonStore.updateById('attachments', attachment.id, attachment);
        } else {
          attachment.transportId = matched.id;
          await attachment.save();
        }
        assignedTransport = matched;
        const io = req.app.get('io');
        io.emit('attachment:applied', { attachmentId: attachment.id, targetType: 'transport', targetId: matched.id, byAutoAssign: true });
      }
    }

    return res.json({ parsed, assignedTransport });
  } catch (err) {
    console.error('Extract error', err);
    res.status(500).json({ message: 'Failed to extract data' });
  }
};

export const viewAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) attachment = await jsonStore.getById('attachments', id);
    else attachment = await Attachment.findByPk(id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Permission: same as download
    const userId = (req as any).user?.id;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      if (!checkAttachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [checkAttachment.journeyId, userId, 'accepted']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const mime = checkAttachment.mimeType || checkAttachment.mime_type || '';
    if (mime.includes('pdf')) {
      const filePath = (!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath;
      const iv = checkAttachment.iv || attachment.iv || '';
      const authTag = checkAttachment.authTag || attachment.authTag || checkAttachment.auth_tag || '';
      const readStream = decryptFileToStream(filePath, iv, authTag);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Type', 'application/pdf');
      return readStream.pipe(res);
    }

    if (mime.includes('officedocument') || mime.includes('word')) {
      // decrypt to temp and convert to HTML
      const tempPath = path.join(uploadDir, `temp-${crypto.randomUUID()}${path.extname(checkAttachment.filename || checkAttachment.filePath || '') || ''}`);
      const stream = decryptFileToStream((!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath, checkAttachment.iv || '', checkAttachment.authTag || checkAttachment.auth_tag || '');
      await new Promise((resolve, reject) => {
          const out = fs.createWriteStream(tempPath);
          stream.pipe(out);
          out.on('finish', () => resolve(undefined));
          out.on('error', reject);
        });

      const htmlRaw = await docxToHtml(tempPath);
      const html = sanitizeHtml(htmlRaw);
      try { fs.unlinkSync(tempPath); } catch (e) {}
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    return res.status(400).json({ message: 'Unsupported file type for preview' });
  } catch (err) {
    console.error('View attachment error', err);
    res.status(500).json({ message: 'Failed to render attachment' });
  }
};

export default {
  uploadAttachmentHandler,
  downloadAttachment,
  deleteAttachment,
  listAttachmentsForJourney,
    applyAttachmentToTarget,
    extractAttachmentData,
    viewAttachment
};
