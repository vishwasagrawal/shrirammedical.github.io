import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { CustomerService } from '../services/supplier-customer.service';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await CustomerService.findAll({ page, limit, search: req.query.search as string });
    sendResponse(res, 200, { data: result.customers, meta: paginationMeta(result.total, page, limit) });
  } catch (e) { next(e); }
});

router.get('/by-phone/:phone', async (req, res, next) => {
  try {
    const customer = await CustomerService.getByPhone(req.params.phone);
    sendResponse(res, 200, { data: customer });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const customer = await CustomerService.findById(req.params.id);
    sendResponse(res, 200, { data: customer });
  } catch (e) { next(e); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await CustomerService.create(req.body);
    sendResponse(res, 201, { message: 'Customer created', data: customer });
  } catch (e) { next(e); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await CustomerService.update(req.params.id, req.body);
    sendResponse(res, 200, { message: 'Customer updated', data: customer });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await CustomerService.delete(req.params.id);
    sendResponse(res, 200, { message: 'Customer deleted' });
  } catch (e) { next(e); }
});

export default router;
