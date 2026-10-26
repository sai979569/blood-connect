import { Router } from 'express';
import {
  getMyMatches,
  respondToMatch,
  giveContactConsent,
} from '../controllers/matchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/mine', getMyMatches);
router.post('/:id/respond', respondToMatch);
router.post('/:id/contact-consent', giveContactConsent);

export default router;
