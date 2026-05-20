import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { ReportService } from '../services/report.service';
import { ExportService } from '../utils/export';
import { sendResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// ── helpers ───────────────────────────────────────────────────────────────────
type ExportFn = typeof ExportService.exportToExcel;
const doExport = (format: unknown, data: Record<string, unknown>[], filename: string, res: Response) => {
  const fn: ExportFn = format === 'csv' ? ExportService.exportToCSV : ExportService.exportToExcel;
  return fn(data, filename, res);
};

// ── Daily Sales ───────────────────────────────────────────────────────────────
router.get('/daily-sales', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const report = await ReportService.getDailySalesReport(date);
    const { format } = req.query;
    if (format === 'excel' || format === 'csv') {
      const data = report.invoices.map((inv: Record<string, unknown>) => ({
        'Invoice #':      inv.invoiceNumber,
        'Date':           new Date(inv.invoiceDate as Date).toLocaleDateString('en-IN'),
        'Customer':       (inv.customer as Record<string, string> | null)?.name || 'Walk-in',
        'Total (Rs.)':    Number(inv.totalAmount).toFixed(2),
        'Tax (Rs.)':      Number(inv.totalTax).toFixed(2),
        'Discount (Rs.)': Number(inv.discountAmount).toFixed(2),
        'Payment':        inv.paymentMethod,
        'Status':         inv.status,
      }));
      return doExport(format, data, `daily-sales-${date}`, res);
    }
    sendResponse(res, 200, { data: report });
  } catch (e) { next(e); }
});

// ── Monthly Sales ─────────────────────────────────────────────────────────────
router.get('/monthly-sales', async (req, res, next) => {
  try {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const report = await ReportService.getMonthlySalesReport(year, month);
    const { format } = req.query;
    if (format === 'excel' || format === 'csv') {
      const data = (report.dailyBreakdown as Array<{ day: string; total: number; tax: number; count: number }>).map((d) => ({
        'Day':              d.day,
        'Sales (Rs.)':      Number(d.total).toFixed(2),
        'GST (Rs.)':        Number(d.tax).toFixed(2),
        'Invoice Count':    d.count,
      }));
      const monthPad = String(month).padStart(2, '0');
      return doExport(format, data, `monthly-sales-${year}-${monthPad}`, res);
    }
    sendResponse(res, 200, { data: report });
  } catch (e) { next(e); }
});

// ── GST Report ────────────────────────────────────────────────────────────────
router.get('/gst', async (req, res, next) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate   = (req.query.endDate   as string) || new Date().toISOString().split('T')[0];
    const report = await ReportService.getGSTReport(startDate, endDate);
    const { format } = req.query;
    if (format === 'excel' || format === 'csv') {
      const data = (report.gstBreakdown as Array<Record<string, unknown>>).map((row) => ({
        'HSN Code':             row.hsn_code,
        'GST %':                row.gst_percentage,
        'Taxable Amt (Rs.)':    Number(row.taxable_amount).toFixed(2),
        'CGST (Rs.)':           Number(row.cgst_amount).toFixed(2),
        'SGST (Rs.)':           Number(row.sgst_amount).toFixed(2),
        'Total Tax (Rs.)':      Number(row.total_tax).toFixed(2),
        'Invoice Count':        row.invoice_count,
      }));
      return doExport(format, data, `gst-report-${startDate}-to-${endDate}`, res);
    }
    sendResponse(res, 200, { data: report });
  } catch (e) { next(e); }
});

// ── Inventory Valuation ───────────────────────────────────────────────────────
router.get('/inventory-valuation', authorize('ADMIN', 'PHARMACIST'), async (req, res, next) => {
  try {
    const report = await ReportService.getInventoryValuationReport();
    const { format } = req.query;
    if (format === 'excel' || format === 'csv') {
      const data = (report as Array<Record<string, unknown>>).map((row) => ({
        'Medicine':             row.medicine_name,
        'Category':             row.category_name,
        'Stock Qty':            row.stock_quantity,
        'Purchase Price (Rs.)': Number(row.purchase_price).toFixed(2),
        'Selling Price (Rs.)':  Number(row.selling_price).toFixed(2),
        'MRP (Rs.)':            Number(row.mrp).toFixed(2),
        'Purchase Value (Rs.)': Number(row.purchase_value).toFixed(2),
        'Selling Value (Rs.)':  Number(row.selling_value).toFixed(2),
      }));
      return doExport(format, data, `inventory-valuation-${new Date().toISOString().split('T')[0]}`, res);
    }
    sendResponse(res, 200, { data: report });
  } catch (e) { next(e); }
});

// ── Purchases ─────────────────────────────────────────────────────────────────
router.get('/purchases', async (req, res, next) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate   = (req.query.endDate   as string) || new Date().toISOString().split('T')[0];
    const report = await ReportService.getPurchaseReport(startDate, endDate);
    const { format } = req.query;
    if (format === 'excel' || format === 'csv') {
      const data = (report.purchases as Array<Record<string, unknown>>).map((po) => ({
        'PO #':            po.purchaseNumber,
        'Supplier':        (po.supplier as Record<string, string> | null)?.name || '',
        'Total (Rs.)':     Number(po.totalAmount).toFixed(2),
        'Tax (Rs.)':       Number(po.taxAmount || 0).toFixed(2),
        'Status':          po.status,
        'Date':            new Date(po.purchaseDate as string).toLocaleDateString('en-IN'),
        'Created By':      (po.user as Record<string, string> | null)?.username || '',
      }));
      return doExport(format, data, `purchases-${startDate}-to-${endDate}`, res);
    }
    sendResponse(res, 200, { data: report });
  } catch (e) { next(e); }
});

// ── Expiry ────────────────────────────────────────────────────────────────────
router.get('/expiry', async (req, res, next) => {
  try {
    const report = await ReportService.getExpiryReport();
    const { format } = req.query;
    if (format === 'excel' || format === 'csv') {
      const toRows = (meds: Array<Record<string, unknown>>, status: string) =>
        meds.map((m) => ({
          'Status':       status,
          'Medicine':     m.medicineName,
          'Category':     (m.category as Record<string, string> | null)?.name || '',
          'Batch #':      m.batchNumber || '',
          'Expiry Date':  new Date(m.expiryDate as string).toLocaleDateString('en-IN'),
          'Stock Qty':    m.stockQuantity,
        }));
      const data = [
        ...toRows(report.expired,    'Expired'),
        ...toRows(report.expiring30, 'Expiring <= 30 days'),
        ...toRows(report.expiring90, 'Expiring 31-90 days'),
      ];
      return doExport(format, data, `expiry-report-${new Date().toISOString().split('T')[0]}`, res);
    }
    sendResponse(res, 200, { data: report });
  } catch (e) { next(e); }
});

export default router;
