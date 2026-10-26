import { Router } from 'express';
import {
  getSystemStats,
  getAllRequests,
  getAllUsers,
  getAuditLogs,
} from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', getSystemStats);
router.get('/requests', getAllRequests);
router.get('/users', getAllUsers);
router.get('/audit-logs', getAuditLogs);

export default router;
