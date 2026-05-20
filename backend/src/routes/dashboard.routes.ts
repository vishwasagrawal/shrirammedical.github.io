import { Router, Response, NextFunction, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import { sendResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getSummary();
    sendResponse(res, 200, { data });
  } catch (e) { next(e); }
});

router.get('/weekly-sales', async (_req, res, next) => {
  try {
    const data = await DashboardService.getWeeklySales();
    sendResponse(res, 200, { data });
  } catch (e) { next(e); }
});

router.get('/payment-breakdown', async (req, res, next) => {
  try {
    const start = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const data = await DashboardService.getPaymentMethodBreakdown(start, end);
    sendResponse(res, 200, { data });
  } catch (e) { next(e); }
});

export default router;
