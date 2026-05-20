import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AuthRequest } from './auth.middleware';

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id || 'anonymous';
  logger.info(`${req.method} ${req.path}`, {
    userId,
    ip: req.ip,
    query: Object.keys(req.query).length ? req.query : undefined,
  });
  next();
};
