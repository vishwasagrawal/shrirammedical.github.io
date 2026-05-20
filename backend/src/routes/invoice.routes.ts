import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { InvoiceService } from '../services/invoice.service';
import { PDFInvoiceService } from '../utils/pdf-invoice';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';
import { AuditLogService } from '../services/audit-log.service';
import { AppError } from '../utils/app-error';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const result = await InvoiceService.findAll({
      page, limit,
      search: req.query.search as string,
      status: req.query.status as string,
      customerId: req.query.customerId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    sendResponse(res, 200, { data: result.invoices, meta: paginationMeta(result.total, page, limit) });
  } catch (e) { next(e); }
});

router.get('/summary/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const summary = await InvoiceService.getDailySummary(date);
    sendResponse(res, 200, { data: summary });
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await InvoiceService.findById(req.params.id);
    sendResponse(res, 200, { data: invoice });
  } catch (e) { next(e); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) { next(new AppError('Unauthorized', 401)); return; }
    const invoice = await InvoiceService.create(req.body, userId);
    await AuditLogService.log({ userId, action: 'CREATE', tableName: 'invoices', recordId: invoice.id });
    sendResponse(res, 201, { message: 'Invoice created', data: invoice });
  } catch (e) { next(e); }
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) { next(new AppError('Unauthorized', 401)); return; }
    await InvoiceService.cancelInvoice(req.params.id, req.body.reason, userId);
    sendResponse(res, 200, { message: 'Invoice cancelled' });
  } catch (e) { next(e); }
});

router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await InvoiceService.printInvoice(req.params.id);

    let customer: { name: string; phone?: string; address?: string } | null = null;
    if (invoice.customer) {
      customer = {
        name: invoice.customer.name,
        phone: invoice.customer.phone,
        address: invoice.customer.address ?? undefined,
      };
    } else if (invoice.customerName) {
      customer = {
        name: invoice.customerName,
        phone: invoice.customerPhone ?? undefined,
      };
    }

    await PDFInvoiceService.generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customer,
      items: invoice.items.map((item) => ({
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        mrp: Number(item.mrp),
        sellingPrice: Number(item.sellingPrice),
        discountPercent: Number(item.discountPercent),
        gstPercentage: Number(item.gstPercentage),
        cgstAmount: Number(item.cgstAmount),
        sgstAmount: Number(item.sgstAmount),
        totalAmount: Number(item.totalAmount),
        hsnCode: item.hsnCode,
      })),
      subtotal: Number(invoice.subtotal),
      discountAmount: Number(invoice.discountAmount),
      cgstAmount: Number(invoice.cgstAmount),
      sgstAmount: Number(invoice.sgstAmount),
      totalTax: Number(invoice.totalTax),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      balanceAmount: Number(invoice.balanceAmount),
      paymentMethod: invoice.paymentMethod,
      doctorName: invoice.doctorName,
      prescriptionNo: invoice.prescriptionNo,
      notes: invoice.notes,
    }, res);
  } catch (e) { next(e); }
});

export default router;
