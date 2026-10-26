import { Router } from 'express';
import {
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestStatus,
  getRequestMatches,
  cancelRequest,
  fulfillRequest,
  manualEvaluateRadius,
} from '../controllers/requestController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateBloodRequest } from '../middleware/validation.js';

const router = Router();

router.use(authenticateToken);

router.post('/', validateBloodRequest, createRequest);
router.get('/mine', getMyRequests);
router.get('/:id', getRequestById);
router.get('/:id/status', getRequestStatus);
router.get('/:id/matches', getRequestMatches);
router.post('/:id/cancel', cancelRequest);
router.post('/:id/fulfill', fulfillRequest);
router.post('/:id/evaluate-radius', manualEvaluateRadius);

export default router;
