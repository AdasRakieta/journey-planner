import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface AttachmentAttributes {
  id?: string;
  journeyId?: string | null;
  stopId?: string | null;
  transportId?: string | null;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string | null;
  isEncrypted?: boolean;
  iv?: string | null;
  authTag?: string | null;
  parsedJson?: object | null;
  createdAt?: Date;
}

interface AttachmentCreationAttributes extends Optional<AttachmentAttributes, 'id' | 'createdAt' | 'isEncrypted'> {}

export class Attachment extends Model<AttachmentAttributes, AttachmentCreationAttributes> implements AttachmentAttributes {
  public id!: string;
  public journeyId?: string | null;
  public stopId?: string | null;
  public transportId?: string | null;
  public filename!: string;
  public originalFilename!: string;
  public filePath!: string;
  public fileSize!: number;
  public mimeType!: string;
  public uploadedBy?: string | null;
  public isEncrypted?: boolean;
  public iv?: string | null;
  public authTag?: string | null;
  public parsedJson?: object | null;
  public readonly createdAt!: Date;
}

Attachment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    journeyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'journey_id',
    },
    stopId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'stop_id',
    },
    transportId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'transport_id',
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_filename',
    },
    filePath: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'file_path',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type',
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'uploaded_by',
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_encrypted',
    },
    iv: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authTag: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'auth_tag',
    },
    parsedJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'parsed_json',
    }
  },
  {
    sequelize,
    tableName: 'attachments',
    timestamps: false,
    underscored: true,
  }
);

export default Attachment;
