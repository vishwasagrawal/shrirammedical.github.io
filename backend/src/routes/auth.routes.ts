import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Protected routes
router.use(authenticate);
router.get('/profile', AuthController.getProfile);
router.post('/logout', AuthController.logout);
router.put('/change-password', AuthController.changePassword);
router.get('/users', authorize('ADMIN'), AuthController.getAllUsers);
router.post('/users', authorize('ADMIN'), AuthController.register);
router.patch('/users/:id/status', authorize('ADMIN'), AuthController.updateUserStatus);

export default router;
