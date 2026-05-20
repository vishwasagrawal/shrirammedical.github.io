import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    sendResponse(res, 200, { data: categories });
  } catch (e) { next(e); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    sendResponse(res, 201, { message: 'Category created', data: category });
  } catch (e) { next(e); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    sendResponse(res, 200, { data: category });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    sendResponse(res, 200, { message: 'Category deleted' });
  } catch (e) { next(e); }
});

export default router;
