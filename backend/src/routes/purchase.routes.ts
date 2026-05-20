import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { PurchaseService } from '../services/purchase.service';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await PurchaseService.findAll({
      page, limit,
      search: req.query.search as string,
      supplierId: req.query.supplierId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    sendResponse(res, 200, { data: result.purchases, meta: paginationMeta(result.total, page, limit) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const purchase = await PurchaseService.findById(req.params.id);
    sendResponse(res, 200, { data: purchase });
  } catch (e) { next(e); }
});

router.post('/', authorize('ADMIN', 'PHARMACIST'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const purchase = await PurchaseService.create(req.body, req.user!.id);
    sendResponse(res, 201, { message: 'Purchase recorded', data: purchase });
  } catch (e) { next(e); }
});

export default router;
