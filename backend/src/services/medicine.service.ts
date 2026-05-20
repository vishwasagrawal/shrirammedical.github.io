import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { Prisma } from '@prisma/client';

export interface CreateMedicineDto {
  medicineName: string;
  genericName?: string;
  manufacturer?: string;
  categoryId?: string;
  supplierId?: string;
  medicineType?: string;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  mrp: number;
  purchasePrice?: number;
  sellingPrice: number;
  gstPercentage?: number;
  stockQuantity?: number;
  reorderLevel?: number;
  maxStockLevel?: number;
  barcode?: string;
  rackLocation?: string;
  unit?: string;
  unitsPerPack?: number;
  hsnCode?: string;
  description?: string;
  isPrescriptionRequired?: boolean;
}

export class MedicineService {
  static async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
    supplierId?: string;
    lowStock?: boolean;
    expiringSoon?: boolean;
    isActive?: boolean;
  }) {
    const where: Prisma.MedicineWhereInput = {};

    if (options.isActive !== undefined) where.isActive = options.isActive;
    else where.isActive = true;

    if (options.search) {
      where.OR = [
        { medicineName: { contains: options.search, mode: 'insensitive' } },
        { genericName: { contains: options.search, mode: 'insensitive' } },
        { barcode: { contains: options.search, mode: 'insensitive' } },
        { manufacturer: { contains: options.search, mode: 'insensitive' } },
        { batchNumber: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.supplierId) where.supplierId = options.supplierId;
    if (options.lowStock) {
      // Use a raw query below — Prisma doesn't support column-to-column comparisons inline
      // We'll handle this in the raw query fallback; for now use threshold 10
      where.stockQuantity = { lte: 10 };
    }
    if (options.expiringSoon) {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      where.expiryDate = { lte: thirtyDays, gte: new Date() };
    }

    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, color: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { medicineName: 'asc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.medicine.count({ where }),
    ]);

    return { medicines, total };
  }

  static async findById(id: string) {
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: { select: { id: true, name: true, phone: true } },
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!medicine) throw new AppError('Medicine not found', 404);
    return medicine;
  }

  static async findByBarcode(barcode: string) {
    const medicine = await prisma.medicine.findUnique({
      where: { barcode },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!medicine) throw new AppError('Medicine not found for barcode', 404);
    return medicine;
  }

  static async create(dto: CreateMedicineDto, userId: string) {
    if (dto.barcode) {
      const exists = await prisma.medicine.findUnique({ where: { barcode: dto.barcode } });
      if (exists) throw new AppError('Barcode already exists', 409);
    }

    const medicine = await prisma.medicine.create({
      data: {
        medicineName: dto.medicineName,
        genericName: dto.genericName,
        manufacturer: dto.manufacturer,
        categoryId: dto.categoryId,
        supplierId: dto.supplierId,
        medicineType: (dto.medicineType as any) || 'TABLET',
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : undefined,
        mrp: dto.mrp,
        purchasePrice: dto.purchasePrice || 0,
        sellingPrice: dto.sellingPrice,
        gstPercentage: dto.gstPercentage || 12,
        stockQuantity: dto.stockQuantity || 0,
        reorderLevel: dto.reorderLevel || 10,
        maxStockLevel: dto.maxStockLevel,
        barcode: dto.barcode,
        rackLocation: dto.rackLocation,
        unit: dto.unit || 'STRIP',
        unitsPerPack: dto.unitsPerPack || 10,
        hsnCode: dto.hsnCode,
        description: dto.description,
        isPrescriptionRequired: dto.isPrescriptionRequired || false,
      },
    });

    if ((dto.stockQuantity || 0) > 0) {
      await prisma.stockMovement.create({
        data: {
          medicineId: medicine.id,
          movementType: 'ADJUSTMENT_IN',
          quantity: dto.stockQuantity || 0,
          balanceAfter: dto.stockQuantity || 0,
          notes: 'Opening stock',
          userId,
        },
      });
    }

    return medicine;
  }

  static async update(id: string, dto: Partial<CreateMedicineDto>) {
    await this.findById(id);
    return prisma.medicine.update({
      where: { id },
      data: {
        ...dto,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : undefined,
        medicineType: dto.medicineType as any,
      },
    });
  }

  static async delete(id: string) {
    await this.findById(id);
    return prisma.medicine.update({ where: { id }, data: { isActive: false } });
  }

  static async adjustStock(medicineId: string, quantity: number, type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGED' | 'EXPIRED', notes: string, userId: string) {
    const medicine = await this.findById(medicineId);
    const newStock = type === 'ADJUSTMENT_IN' ? medicine.stockQuantity + quantity : medicine.stockQuantity - quantity;

    if (newStock < 0) throw new AppError('Insufficient stock for adjustment', 400);

    await prisma.$transaction([
      prisma.medicine.update({ where: { id: medicineId }, data: { stockQuantity: newStock } }),
      prisma.stockMovement.create({
        data: { medicineId, movementType: type, quantity, balanceAfter: newStock, notes, userId },
      }),
    ]);

    return { medicineId, newStock };
  }

  static async getLowStockMedicines() {
    return prisma.$queryRaw`
      SELECT id, medicine_name as "medicineName", stock_quantity as "stockQuantity",
             reorder_level as "reorderLevel", rack_location as "rackLocation"
      FROM medicines
      WHERE is_active = true AND stock_quantity <= reorder_level
      ORDER BY stock_quantity ASC
    `;
  }

  static async getExpiringMedicines(days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return prisma.medicine.findMany({
      where: {
        isActive: true,
        stockQuantity: { gt: 0 },
        expiryDate: { lte: future, gte: new Date() },
      },
      include: { category: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  static async bulkImport(medicines: CreateMedicineDto[], userId: string) {
    const results = { created: 0, failed: 0, errors: [] as string[] };
    for (const med of medicines) {
      try {
        await this.create(med, userId);
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${med.medicineName}: ${(err as Error).message}`);
      }
    }
    return results;
  }
}
