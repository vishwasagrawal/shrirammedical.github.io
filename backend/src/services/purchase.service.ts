import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { Prisma, PaymentMethod, PurchaseStatus } from '@prisma/client';
import { StockService } from './stock.service';

export interface CreatePurchaseDto {
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentMethod?: PaymentMethod;
  paymentDueDate?: string;
  notes?: string;
  items: PurchaseItemDto[];
}

interface PurchaseItemDto {
  medicineId: string;
  quantity: number;
  freeQuantity?: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  gstPercentage?: number;
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  hsnCode?: string;
}

const generatePurchaseNumber = async (): Promise<string> => {
  const today = new Date();
  const prefix = `PO${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const last = await prisma.purchase.findFirst({
    where: { purchaseNumber: { startsWith: prefix } },
    orderBy: { purchaseNumber: 'desc' },
  });
  const seq = last ? Number.parseInt(last.purchaseNumber.slice(-4), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

export class PurchaseService {
  static async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    supplierId?: string;
    status?: PurchaseStatus;
    startDate?: string;
    endDate?: string;
  }) {
    const where: Prisma.PurchaseWhereInput = {};
    if (options.supplierId) where.supplierId = options.supplierId;
    if (options.status) where.status = options.status;
    if (options.search) {
      where.OR = [
        { purchaseNumber: { contains: options.search, mode: 'insensitive' } },
        { invoiceNumber: { contains: options.search, mode: 'insensitive' } },
        { supplier: { name: { contains: options.search, mode: 'insensitive' } } },
      ];
    }
    if (options.startDate || options.endDate) {
      where.purchaseDate = {
        ...(options.startDate && { gte: new Date(options.startDate) }),
        ...(options.endDate && { lte: new Date(new Date(options.endDate).setHours(23, 59, 59)) }),
      };
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          user: { select: { username: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { purchaseDate: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.purchase.count({ where }),
    ]);
    return { purchases, total };
  }

  static async findById(id: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: { select: { username: true, fullName: true } },
        items: { include: { medicine: { select: { medicineName: true, unit: true } } } },
      },
    });
    if (!purchase) throw new AppError('Purchase not found', 404);
    return purchase;
  }

  static async create(dto: CreatePurchaseDto, userId: string) {
    if (!dto.supplierId) throw new AppError('Supplier is required', 400);
    if (!dto.items?.length) throw new AppError('At least one item is required', 400);
    for (const item of dto.items) {
      if (!item.medicineId) throw new AppError('Each item must have a medicine selected', 400);
    }

    let subtotal = 0;
    let taxAmount = 0;

    const itemsData = dto.items.map((item) => {
      const total = item.purchasePrice * item.quantity;
      const gst = (total * (item.gstPercentage || 12)) / 100;
      subtotal += total;
      taxAmount += gst;
      return {
        medicineId: item.medicineId,
        medicineName: '',
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        purchasePrice: item.purchasePrice,
        mrp: item.mrp,
        sellingPrice: item.sellingPrice,
        gstPercentage: item.gstPercentage || 12,
        taxAmount: gst,
        totalAmount: total + gst,
        hsnCode: item.hsnCode,
      };
    });

    const totalAmount = subtotal + taxAmount;
    const purchaseNumber = await generatePurchaseNumber();

    const purchase = await prisma.$transaction(async (tx) => {
      const medicines = await tx.medicine.findMany({
        where: { id: { in: dto.items.map((i) => i.medicineId) } },
        select: { id: true, medicineName: true },
      });
      const medMap = Object.fromEntries(medicines.map((m) => [m.id, m.medicineName]));
      itemsData.forEach((item) => { item.medicineName = medMap[item.medicineId] || ''; });

      const newPurchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: dto.supplierId,
          userId,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
          subtotal,
          taxAmount,
          totalAmount,
          balanceAmount: totalAmount,
          paymentMethod: dto.paymentMethod || 'CREDIT',
          paymentDueDate: dto.paymentDueDate ? new Date(dto.paymentDueDate) : undefined,
          notes: dto.notes,
          status: 'RECEIVED',
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // Add stock
      for (const item of dto.items) {
        const totalQty = item.quantity + (item.freeQuantity || 0);
        await StockService.addStock(tx, item.medicineId, totalQty, 'PURCHASE', newPurchase.id, userId);

        // Update medicine prices/batch
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: {
            purchasePrice: item.purchasePrice,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            ...(item.batchNumber && { batchNumber: item.batchNumber }),
            ...(item.expiryDate && { expiryDate: new Date(item.expiryDate) }),
          },
        });
      }

      return newPurchase;
    });

    return purchase;
  }
}
