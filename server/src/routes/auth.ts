import express from 'express';
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser,
  registerRequest,
  registerConfirm,
} from '../controllers/authController';
import { googleAuthStart, googleAuthCallback } from '../controllers/authController';
import { googleRegisterStart, googleRegisterCallback } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
// Registration request flow (email verification -> admin approval)
router.post('/register/request', registerRequest);
router.post('/register/confirm', registerConfirm);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

// Google OAuth
router.get('/google', googleAuthStart);
router.get('/google/callback', googleAuthCallback);
// Google registration flow (creates a pending request for admin approval)
router.get('/google/register', googleRegisterStart);
router.get('/google/register/callback', googleRegisterCallback);

export default router;
