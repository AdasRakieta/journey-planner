import express from 'express';
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export default router;
