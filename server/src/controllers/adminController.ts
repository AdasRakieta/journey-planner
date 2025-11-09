import { Request, Response } from 'express';
import { Pool } from 'pg';
import { generateRandomToken, validateEmail } from '../utils/auth';
import { sendInvitationEmail } from '../services/emailService';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

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
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await pool.query(
      'SELECT id FROM invitation_tokens WHERE email = $1 AND used = FALSE AND expires_at > NOW()',
      [email]
    );

    if (existingInvitation.rows.length > 0) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    // Generate invitation token
    const token = generateRandomToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invitation in database
    await pool.query(
      `INSERT INTO invitation_tokens (token, email, invited_by, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token, email, req.user!.userId, expiresAt]
    );

    // Get admin username for email
    const adminResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [req.user!.userId]
    );
    const adminUsername = adminResult.rows[0]?.username || 'Administrator';

    // Send invitation email
    await sendInvitationEmail(email, token, adminUsername);

    res.status(201).json({
      message: 'Invitation sent successfully',
      email,
      expiresAt,
    });
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
    const result = await pool.query(
      `SELECT id, username, email, role, is_active, email_verified, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
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
    const userCheck = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

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

    // Update user role
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0],
    });
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

    // Toggle active status
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, username, is_active',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user: result.rows[0],
    });
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
    const result = await pool.query(
      `SELECT it.id, it.email, it.expires_at, it.created_at, u.username as invited_by_username
       FROM invitation_tokens it
       LEFT JOIN users u ON it.invited_by = u.id
       WHERE it.used = FALSE AND it.expires_at > NOW()
       ORDER BY it.created_at DESC`
    );

    res.json({ invitations: result.rows });
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

    const result = await pool.query(
      'DELETE FROM invitation_tokens WHERE id = $1 AND used = FALSE RETURNING email',
      [invitationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already used' });
    }

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
