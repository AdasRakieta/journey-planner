import express from 'express';
import {
  inviteUser,
  getAllUsers,
  deleteUser,
  changeUserRole,
  toggleUserActive,
  getPendingInvitations,
  cancelInvitation,
} from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// User management
router.post('/invite', inviteUser);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/toggle-active', toggleUserActive);

// Invitation management
router.get('/invitations', getPendingInvitations);
router.delete('/invitations/:id', cancelInvitation);

export default router;
