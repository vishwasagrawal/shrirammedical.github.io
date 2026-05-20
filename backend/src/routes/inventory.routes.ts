import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';

const router = Router();
router.use(authenticate);

// Category routes
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    sendResponse(res, 200, { data: categories });
  } catch (e) { next(e); }
});

router.post('/categories', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    sendResponse(res, 201, { message: 'Category created', data: category });
  } catch (e) { next(e); }
});

router.put('/categories/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    sendResponse(res, 200, { data: category });
  } catch (e) { next(e); }
});

// Stock movements
router.get('/stock-movements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.medicineId) where.medicineId = req.query.medicineId;
    if (req.query.movementType) where.movementType = req.query.movementType;
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { medicine: { select: { medicineName: true } }, user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    sendResponse(res, 200, { data: movements, meta: paginationMeta(total, page, limit) });
  } catch (e) { next(e); }
});

export default router;
