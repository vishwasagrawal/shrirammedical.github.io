import { Response } from 'express';

interface ApiResponseOptions {
  success?: boolean;
  message?: string;
  data?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendResponse = (
  res: Response,
  statusCode: number,
  options: ApiResponseOptions
) => {
  const { success = statusCode < 400, message = '', data, meta } = options;
  return res.status(statusCode).json({
    success,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });
};

export const paginationMeta = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const parsePagination = (query: Record<string, string | string[] | undefined>) => {
  const page = Math.max(1, parseInt((query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
