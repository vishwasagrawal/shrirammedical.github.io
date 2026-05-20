import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { SupplierService } from '../services/supplier-customer.service';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await SupplierService.findAll({ page, limit, search: req.query.search as string });
    sendResponse(res, 200, { data: result.suppliers, meta: paginationMeta(result.total, page, limit) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const supplier = await SupplierService.findById(req.params.id);
    sendResponse(res, 200, { data: supplier });
  } catch (e) { next(e); }
});

router.post('/', authorize('ADMIN', 'PHARMACIST'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await SupplierService.create(req.body);
    sendResponse(res, 201, { message: 'Supplier created', data: supplier });
  } catch (e) { next(e); }
});

router.put('/:id', authorize('ADMIN', 'PHARMACIST'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await SupplierService.update(req.params.id, req.body);
    sendResponse(res, 200, { message: 'Supplier updated', data: supplier });
  } catch (e) { next(e); }
});

router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await SupplierService.delete(req.params.id);
    sendResponse(res, 200, { message: 'Supplier deleted' });
  } catch (e) { next(e); }
});

export default router;
