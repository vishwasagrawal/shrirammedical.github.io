import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { sendResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ where: { isPublic: true } });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    sendResponse(res, 200, { data: settingsMap });
  } catch (e) { next(e); }
});

router.get('/all', authorize('ADMIN'), async (_req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
    sendResponse(res, 200, { data: settings });
  } catch (e) { next(e); }
});

router.put('/', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updates: { key: string; value: string }[] = req.body;
    await Promise.all(
      updates.map((u) =>
        prisma.setting.upsert({
          where: { key: u.key },
          update: { value: u.value },
          create: { key: u.key, value: u.value },
        })
      )
    );
    sendResponse(res, 200, { message: 'Settings saved' });
  } catch (e) { next(e); }
});

export default router;
