import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { MedicineService } from '../services/medicine.service';
import { sendResponse, parsePagination, paginationMeta } from '../utils/response';
import { uploadMiddleware, csvUpload } from '../middleware/upload.middleware';
import { ExportService } from '../utils/export';
import { AuditLogService } from '../services/audit-log.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

// GET all medicines
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip: _skip } = parsePagination(req.query as Record<string, string>);
    const result = await MedicineService.findAll({
      page, limit,
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      supplierId: req.query.supplierId as string,
      lowStock: req.query.lowStock === 'true',
      expiringSoon: req.query.expiringSoon === 'true',
    });
    sendResponse(res, 200, { data: result.medicines, meta: paginationMeta(result.total, page, limit) });
  } catch (e) { next(e); }
});

// GET by barcode
router.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const medicine = await MedicineService.findByBarcode(req.params.barcode);
    sendResponse(res, 200, { data: medicine });
  } catch (e) { next(e); }
});

// GET low stock
router.get('/low-stock', async (_req, res, next) => {
  try {
    const medicines = await MedicineService.getLowStockMedicines();
    sendResponse(res, 200, { data: medicines });
  } catch (e) { next(e); }
});

// GET expiring soon
router.get('/expiring', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const medicines = await MedicineService.getExpiringMedicines(days);
    sendResponse(res, 200, { data: medicines });
  } catch (e) { next(e); }
});

// GET single
router.get('/:id', async (req, res, next) => {
  try {
    const medicine = await MedicineService.findById(req.params.id);
    sendResponse(res, 200, { data: medicine });
  } catch (e) { next(e); }
});

// CREATE
router.post('/', authorize('ADMIN', 'PHARMACIST'), uploadMiddleware.single('image'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dto = { ...req.body, imageUrl: req.file ? `/uploads/medicines/${req.file.filename}` : undefined };
    const medicine = await MedicineService.create(dto, req.user!.id);
    await AuditLogService.log({ userId: req.user!.id, action: 'CREATE', tableName: 'medicines', recordId: medicine.id, newValues: dto });
    sendResponse(res, 201, { message: 'Medicine created', data: medicine });
  } catch (e) { next(e); }
});

// UPDATE
router.put('/:id', authorize('ADMIN', 'PHARMACIST'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const old = await MedicineService.findById(req.params.id);
    const medicine = await MedicineService.update(req.params.id, req.body);
    await AuditLogService.log({ userId: req.user!.id, action: 'UPDATE', tableName: 'medicines', recordId: req.params.id, oldValues: old, newValues: req.body });
    sendResponse(res, 200, { message: 'Medicine updated', data: medicine });
  } catch (e) { next(e); }
});

// DELETE (soft)
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await MedicineService.delete(req.params.id);
    await AuditLogService.log({ userId: req.user!.id, action: 'DELETE', tableName: 'medicines', recordId: req.params.id });
    sendResponse(res, 200, { message: 'Medicine deleted' });
  } catch (e) { next(e); }
});

// STOCK ADJUSTMENT
router.post('/:id/adjust-stock', authorize('ADMIN', 'PHARMACIST'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MedicineService.adjustStock(req.params.id, req.body.quantity, req.body.type, req.body.notes, req.user!.id);
    sendResponse(res, 200, { message: 'Stock adjusted', data: result });
  } catch (e) { next(e); }
});

// EXPORT
router.get('/export/excel', authorize('ADMIN', 'PHARMACIST'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MedicineService.findAll({ page: 1, limit: 10000 });
    const data = result.medicines.map((m) => ({
      Name: m.medicineName, Generic: m.genericName, Manufacturer: m.manufacturer,
      Type: m.medicineType, Batch: m.batchNumber, Expiry: m.expiryDate?.toLocaleDateString(),
      MRP: Number(m.mrp), 'Purchase Price': Number(m.purchasePrice), 'Selling Price': Number(m.sellingPrice),
      GST: Number(m.gstPercentage), Stock: m.stockQuantity, 'Reorder Level': m.reorderLevel,
      Barcode: m.barcode, Rack: m.rackLocation,
    }));
    ExportService.exportToExcel(data, 'medicines', res);
  } catch (e) { next(e); }
});

// IMPORT
router.post('/import/excel', authorize('ADMIN', 'PHARMACIST'), csvUpload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  const fs = await import('fs');
  try {
    if (!req.file) throw new Error('No file uploaded');
    const buffer = fs.readFileSync(req.file.path);
    const rawData = ExportService.parseMedicineImport(buffer);
    const medicines = rawData.map((row) => ({
      medicineName: String((row as Record<string, unknown>)['Name'] || (row as Record<string, unknown>)['medicine_name'] || ''),
      mrp: parseFloat(String((row as Record<string, unknown>)['MRP'] || 0)),
      sellingPrice: parseFloat(String((row as Record<string, unknown>)['Selling Price'] || (row as Record<string, unknown>)['selling_price'] || 0)),
      purchasePrice: parseFloat(String((row as Record<string, unknown>)['Purchase Price'] || 0)),
      stockQuantity: parseInt(String((row as Record<string, unknown>)['Stock'] || 0)),
      gstPercentage: parseFloat(String((row as Record<string, unknown>)['GST'] || 12)),
      barcode: String((row as Record<string, unknown>)['Barcode'] || ''),
    }));
    const result = await MedicineService.bulkImport(medicines, req.user!.id);
    sendResponse(res, 200, { message: `Import complete`, data: result });
  } catch (e) { next(e); } finally {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore cleanup errors */ }
    }
  }
});

export default router;
