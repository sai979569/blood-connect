import { Router } from 'express';
import {
  updateProfile,
  updateLocation,
  updateDonorAvailability,
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.patch('/me', updateProfile);
router.patch('/me/location', updateLocation);
router.patch('/me/donor-availability', updateDonorAvailability);

export default router;
