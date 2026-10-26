import { Router } from 'express';
import { saveSubscription, deleteSubscription } from '../controllers/pushController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/', saveSubscription);
router.delete('/:id', deleteSubscription);

export default router;
