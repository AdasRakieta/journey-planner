import { Request, Response } from 'express';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateVerificationCode,
  generateRandomToken,
  validatePassword,
  validateEmail,
} from '../utils/auth';
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
} from '../services/emailService';

// Note: database access is performed via `query` when DB_AVAILABLE is true.

/**
 * POST /api/auth/login
 * Login with email/username and password
 */
export async function login(req: Request, res: Response) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password required' });
    }

    // Find user by email or username
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT * FROM users WHERE email = $1 OR username = $1', [login]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      user = result.rows[0];
    } else {
      const users = await jsonStore.getAll('users');
      user = users.find((u: any) => u.email === login || u.username === login) || null;
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) return res.status(403).json({ error: 'Account is disabled' });

    // Verify password
    if (!user.password_hash) {
      // No password set for this user
      return res.status(500).json({ error: 'User has no password set' });
    }
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * POST /api/auth/register
 * Register with invitation token
 */
export async function register(req: Request, res: Response) {
  try {
    const { token, username, password } = req.body;

    if (!token || !username || !password) {
      return res.status(400).json({ error: 'Token, username, and password required' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Verify invitation token
    let invitation: any = null;
    if (DB_AVAILABLE) {
      const tokenResult = await query('SELECT * FROM invitation_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()', [token]);
      if (tokenResult.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired invitation token' });
      invitation = tokenResult.rows[0];
    } else {
      const tokens = await jsonStore.findByField('invitation_tokens', 'token', token);
      invitation = tokens.find((t: any) => t.used === false && new Date(t.expires_at) > new Date()) || null;
      if (!invitation) return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Check if username already exists
    // Check if username/email already exist
    if (DB_AVAILABLE) {
      const usernameCheck = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (usernameCheck.rows.length > 0) return res.status(400).json({ error: 'Username already taken' });
      const emailCheck = await query('SELECT id FROM users WHERE email = $1', [invitation.email]);
      if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    } else {
      const users = await jsonStore.getAll('users');
      if (users.some((u: any) => u.username === username)) return res.status(400).json({ error: 'Username already taken' });
      if (users.some((u: any) => u.email === invitation.email)) return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    let newUser: any = null;
    if (DB_AVAILABLE) {
      const userResult = await query(`INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, 'user', TRUE) RETURNING id, username, email, role, email_verified, created_at`, [username, invitation.email, passwordHash]);
      newUser = userResult.rows[0];
      await query('UPDATE invitation_tokens SET used = TRUE WHERE token = $1', [token]);
    } else {
      newUser = await jsonStore.insert('users', { username, email: invitation.email, password_hash: passwordHash, role: 'user', email_verified: true, is_active: true, created_at: new Date().toISOString() });
      // mark token used in JSON tokens store if present
      const tokens = await jsonStore.findByField('invitation_tokens', 'token', token);
      if (tokens.length > 0) {
        const t = tokens[0];
        await jsonStore.updateById('invitation_tokens', t.id, { used: true });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(newUser.id, newUser.email, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.email_verified,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset code
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find user
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT id, email, username FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) return res.json({ message: 'If the email exists, a reset code has been sent' });
      user = result.rows[0];
    } else {
      const users = await jsonStore.findByField('users', 'email', email);
      if (!users || users.length === 0) return res.json({ message: 'If the email exists, a reset code has been sent' });
      user = users[0];
    }

    // Generate 6-digit code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code
    if (DB_AVAILABLE) {
      await query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [resetCode, expiresAt, user.id]);
    } else {
      await jsonStore.updateById('users', user.id, { reset_token: resetCode, reset_token_expires: expiresAt.toISOString() });
    }

    // Send email
    await sendPasswordResetEmail(user.email, resetCode);

    res.json({ message: 'If the email exists, a reset code has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password with verification code
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password required' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Verify code
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query(`SELECT id, email FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()`, [email, code]);
      if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset code' });
      user = result.rows[0];
    } else {
      const users = await jsonStore.findByField('users', 'email', email);
      const found = users.find((u: any) => u.reset_token === code && new Date(u.reset_token_expires) > new Date());
      if (!found) return res.status(400).json({ error: 'Invalid or expired reset code' });
      user = found;
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    if (DB_AVAILABLE) {
      await query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [passwordHash, user.id]);
    } else {
      await jsonStore.updateById('users', user.id, { password_hash: passwordHash, reset_token: null, reset_token_expires: null });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token (this will throw if invalid)
    const decoded: any = require('../utils/auth').verifyToken(refreshToken);
    // Get user details
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT id, email, role FROM users WHERE id = $1 AND is_active = TRUE', [decoded.userId]);
      if (result.rows.length === 0) return res.status(403).json({ error: 'User not found or inactive' });
      user = result.rows[0];
    } else {
      const u = await jsonStore.getById('users', decoded.userId);
      if (!u || !u.is_active) return res.status(403).json({ error: 'User not found or inactive' });
      user = u;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email, user.role);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
}

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT id, username, email, role, email_verified, created_at FROM users WHERE id = $1', [req.user.userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      user = result.rows[0];
    } else {
      const u = await jsonStore.getById('users', req.user.userId);
      if (!u) return res.status(404).json({ error: 'User not found' });
      user = u;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser,
};
