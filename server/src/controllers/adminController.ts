import { Request, Response } from 'express';
import { generateRandomToken, validateEmail } from '../utils/auth';
import { sendInvitationEmail } from '../services/emailService';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';

/**
 * POST /api/admin/invite
 * Invite a new user via email (admin only)
 */
export async function inviteUser(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    if (DB_AVAILABLE) {
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) return res.status(400).json({ error: 'User with this email already exists' });

      // Check if there's already a pending invitation
      const existingInvitation = await query('SELECT id FROM invitation_tokens WHERE email = $1 AND used = FALSE AND expires_at > NOW()', [email]);
      if (existingInvitation.rows.length > 0) return res.status(400).json({ error: 'Invitation already sent to this email' });

      // Generate token and store
      const token = generateRandomToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await query('INSERT INTO invitation_tokens (token, email, invited_by, expires_at) VALUES ($1, $2, $3, $4)', [token, email, req.user!.userId, expiresAt]);

      // Get admin username for email
      const adminResult = await query('SELECT username FROM users WHERE id = $1', [req.user!.userId]);
      const adminUsername = adminResult.rows[0]?.username || 'Administrator';
      await sendInvitationEmail(email, token, adminUsername);
      return res.status(201).json({ message: 'Invitation sent successfully', email, expiresAt });
    }

    // JSON fallback flow
    const users = await jsonStore.findByField('users', 'email', email);
    if (users.length > 0) return res.status(400).json({ error: 'User with this email already exists' });

    const existingInv = (await jsonStore.getAll('invitation_tokens')).find((it: any) => it.email === email && it.used === false && new Date(it.expires_at) > new Date());
    if (existingInv) return res.status(400).json({ error: 'Invitation already sent to this email' });

    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await jsonStore.insert('invitation_tokens', { token, email, invited_by: req.user!.userId, expires_at: expiresAt.toISOString(), used: false, created_at: new Date().toISOString() });

    const adminUser = await jsonStore.getById('users', req.user!.userId);
    const adminUsername = adminUser?.username || 'Administrator';
    await sendInvitationEmail(email, token, adminUsername);
    return res.status(201).json({ message: 'Invitation sent successfully', email, expiresAt });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
}

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    if (DB_AVAILABLE) {
      const result = await query(`SELECT id, username, email, role, is_active, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC`);
      const users = result.rows.map(row => ({ id: row.id, username: row.username, email: row.email, role: row.role, isActive: row.is_active, emailVerified: row.email_verified, createdAt: row.created_at, updatedAt: row.updated_at }));
      return res.json({ users });
    }
    const usersAll = await jsonStore.getAll('users');
    const users = usersAll.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((row: any) => ({ id: row.id, username: row.username, email: row.email, role: row.role, isActive: row.is_active, emailVerified: row.email_verified, createdAt: row.created_at, updatedAt: row.updated_at }));
    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only)
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    if (DB_AVAILABLE) {
      const userCheck = await query('SELECT id, username FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      await query('DELETE FROM users WHERE id = $1', [userId]);
      return res.json({ message: 'User deleted successfully' });
    }
    const u = await jsonStore.getById('users', userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    await jsonStore.deleteById('users', userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

/**
 * PUT /api/admin/users/:id/role
 * Change user role (admin only)
 */
export async function changeUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    // Prevent admin from changing their own role
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    if (DB_AVAILABLE) {
      const result = await query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role', [role, userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ message: 'User role updated successfully', user: result.rows[0] });
    }
    const u = await jsonStore.getById('users', userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const updated = await jsonStore.updateById('users', userId, { role });
    res.json({ message: 'User role updated successfully', user: updated });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
}

/**
 * PUT /api/admin/users/:id/toggle-active
 * Toggle user active status (admin only)
 */
export async function toggleUserActive(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    if (DB_AVAILABLE) {
      const result = await query('UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, username, is_active', [userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ message: 'User status updated successfully', user: result.rows[0] });
    }
    const u = await jsonStore.getById('users', userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const updated = await jsonStore.updateById('users', userId, { is_active: !u.is_active });
    res.json({ message: 'User status updated successfully', user: updated });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

/**
 * GET /api/admin/invitations
 * Get all pending invitations (admin only)
 */
export async function getPendingInvitations(req: Request, res: Response) {
  try {
    if (DB_AVAILABLE) {
      const result = await query(`SELECT it.id, it.email, it.expires_at, it.created_at, u.username as invited_by_username FROM invitation_tokens it LEFT JOIN users u ON it.invited_by = u.id WHERE it.used = FALSE AND it.expires_at > NOW() ORDER BY it.created_at DESC`);
      const invitations = result.rows.map((row: any) => ({ id: row.id, email: row.email, expiresAt: row.expires_at, createdAt: row.created_at, invitedByUsername: row.invited_by_username }));
      return res.json({ invitations });
    }
    const all = await jsonStore.getAll('invitation_tokens');
    const invitations = all.filter((it: any) => it.used === false && new Date(it.expires_at) > new Date()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((row: any) => ({ id: row.id, email: row.email, expiresAt: row.expires_at, createdAt: row.created_at, invitedByUsername: (async () => { const au = await jsonStore.getById('users', row.invited_by); return au?.username || null; })() }));
    // invitedByUsername is resolved on client by id if needed; return basic fields
    res.json({ invitations: invitations.map((i: any) => ({ id: i.id, email: i.email, expiresAt: i.expiresAt, createdAt: i.createdAt, invitedByUsername: null })) });
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}

/**
 * DELETE /api/admin/invitations/:id
 * Cancel invitation (admin only)
 */
export async function cancelInvitation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const invitationId = parseInt(id);

    if (isNaN(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation ID' });
    }

    if (DB_AVAILABLE) {
      const result = await query('DELETE FROM invitation_tokens WHERE id = $1 AND used = FALSE RETURNING email', [invitationId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Invitation not found or already used' });
      return res.json({ message: 'Invitation cancelled successfully' });
    }
    const inv = await jsonStore.getById('invitation_tokens', invitationId);
    if (!inv || inv.used) return res.status(404).json({ error: 'Invitation not found or already used' });
    await jsonStore.deleteById('invitation_tokens', invitationId);
    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
}

export default {
  inviteUser,
  getAllUsers,
  deleteUser,
  changeUserRole,
  toggleUserActive,
  getPendingInvitations,
  cancelInvitation,
};
