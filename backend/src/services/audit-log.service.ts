import { prisma } from '../config/database';
import { AuditAction } from '@prisma/client';

interface AuditLogDto {
  userId?: string;
  action: AuditAction;
  tableName?: string;
  recordId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

export class AuditLogService {
  static async log(dto: AuditLogDto) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          tableName: dto.tableName,
          recordId: dto.recordId,
          oldValues: dto.oldValues ? (dto.oldValues as object) : undefined,
          newValues: dto.newValues ? (dto.newValues as object) : undefined,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          description: dto.description,
        },
      });
    } catch {
      // Audit logging should never crash the app
    }
  }

  static async findAll(options: {
    page: number;
    limit: number;
    userId?: string;
    action?: AuditAction;
    tableName?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: Record<string, unknown> = {};
    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.tableName) where.tableName = options.tableName;
    if (options.startDate || options.endDate) {
      where.createdAt = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { username: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
