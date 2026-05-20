import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { AuditLogService } from '../services/audit-log.service';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';
import { AuditAction } from '@prisma/client';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await AuditLogService.findAll({
      page, limit,
      userId: req.query.userId as string,
      action: req.query.action as AuditAction,
      tableName: req.query.tableName as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    });
    sendResponse(res, 200, { data: result.logs, meta: paginationMeta(result.total, page, limit) });
  } catch (e) { next(e); }
});

export default router;
