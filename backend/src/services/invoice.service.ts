import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { Prisma, PaymentMethod } from '@prisma/client';
import { StockService } from './stock.service';

export interface CreateInvoiceDto {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
  prescriptionNo?: string;
  doctorName?: string;
  paidAmount?: number;
  items: InvoiceItemDto[];
}

export interface InvoiceItemDto {
  medicineId: string;
  quantity: number;
  freeQuantity?: number;
  sellingPrice: number;
  mrp: number;
  discountPercent?: number;
  gstPercentage: number;
  batchNumber?: string;
  expiryDate?: string;
  hsnCode?: string;
}

const generateInvoiceNumber = async (): Promise<string> => {
  const today = new Date();
  const prefix = `INV${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });
  const seq = lastInvoice ? Number.parseInt(lastInvoice.invoiceNumber.slice(-4), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

export class InvoiceService {
  static async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    const where: Prisma.InvoiceWhereInput = {};
    if (options.status) where.status = options.status as any;
    if (options.customerId) where.customerId = options.customerId;
    if (options.userId) where.userId = options.userId;
    if (options.search) {
      where.OR = [
        { invoiceNumber: { contains: options.search, mode: 'insensitive' } },
        { customer: { name: { contains: options.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: options.search } } },
      ];
    }
    if (options.startDate || options.endDate) {
      where.invoiceDate = {
        ...(options.startDate && { gte: new Date(options.startDate) }),
        ...(options.endDate && { lte: new Date(new Date(options.endDate).setHours(23, 59, 59)) }),
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { username: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.invoice.count({ where }),
    ]);
    return { invoices, total };
  }

  static async findById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { username: true, fullName: true } },
        items: { include: { medicine: { select: { medicineName: true, genericName: true, unit: true } } } },
        transactions: true,
      },
    });
    if (!invoice) throw new AppError('Invoice not found', 404);
    return invoice;
  }

  static async create(dto: CreateInvoiceDto, userId: string) {
    // Validate stock and expiry
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const item of dto.items) {
      const medicine = await prisma.medicine.findUnique({ where: { id: item.medicineId } });
      if (!medicine) throw new AppError(`Medicine ${item.medicineId} not found`, 404);

      // Check medicine's stored expiry date
      if (medicine.expiryDate && medicine.expiryDate < today) {
        const expStr = medicine.expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        throw new AppError(`Cannot sell expired medicine: "${medicine.medicineName}" (expired on ${expStr})`, 400);
      }

      // Check batch-specific expiry date sent from the billing screen
      if (item.expiryDate) {
        const batchExpiry = new Date(item.expiryDate);
        batchExpiry.setHours(0, 0, 0, 0);
        if (batchExpiry < today) {
          const expStr = batchExpiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          throw new AppError(`Cannot sell expired medicine: "${medicine.medicineName}" (batch expired on ${expStr})`, 400);
        }
      }

      if (medicine.stockQuantity < item.quantity) {
        throw new AppError(`Insufficient stock for ${medicine.medicineName} (available: ${medicine.stockQuantity})`, 400);
      }
    }

    // Calculate totals
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    const itemsData = dto.items.map((item) => {
      const billQty = item.quantity - (item.freeQuantity || 0);
      const baseAmount = item.sellingPrice * billQty;
      const discPct = item.discountPercent || 0;
      const discAmt = (baseAmount * discPct) / 100;
      const taxableAmt = baseAmount - discAmt;
      const gstPct = item.gstPercentage || 12;
      const cgst = (taxableAmt * gstPct) / 200;
      const sgst = (taxableAmt * gstPct) / 200;
      const total = taxableAmt + cgst + sgst;

      subtotal += baseAmount;
      totalCgst += cgst;
      totalSgst += sgst;

      return {
        medicineId: item.medicineId,
        medicineName: '',
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        mrp: item.mrp,
        sellingPrice: item.sellingPrice,
        discountPercent: discPct,
        discountAmount: discAmt,
        taxableAmount: taxableAmt,
        gstPercentage: gstPct,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalAmount: total,
        hsnCode: item.hsnCode,
      };
    });

    const overallDiscountAmt = dto.discountAmount || (subtotal * (dto.discountPercent || 0)) / 100;
    const taxableAmount = subtotal - overallDiscountAmt;
    const totalTax = totalCgst + totalSgst;
    const totalAmount = taxableAmount + totalTax;
    const paidAmount = dto.paidAmount ?? totalAmount;
    const balanceAmount = totalAmount - paidAmount;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.$transaction(async (tx) => {
      // Get medicine names
      const medicineIds = dto.items.map((i) => i.medicineId);
      const medicines = await tx.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: { id: true, medicineName: true },
      });
      const medMap = Object.fromEntries(medicines.map((m) => [m.id, m.medicineName]));
      itemsData.forEach((item) => { item.medicineName = medMap[item.medicineId] || ''; });

      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId,
          customerName: dto.customerId ? undefined : (dto.customerName || undefined),
          customerPhone: dto.customerId ? undefined : (dto.customerPhone || undefined),
          userId,
          subtotal,
          discountAmount: overallDiscountAmt,
          discountPercent: dto.discountPercent || 0,
          taxableAmount,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          totalTax,
          totalAmount,
          paidAmount,
          balanceAmount,
          paymentMethod: dto.paymentMethod || 'CASH',
          paymentReference: dto.paymentReference,
          status: balanceAmount <= 0 ? 'PAID' : 'PARTIAL',
          notes: dto.notes,
          prescriptionNo: dto.prescriptionNo,
          doctorName: dto.doctorName,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // Deduct stock
      for (const item of dto.items) {
        await StockService.deductStock(tx, item.medicineId, item.quantity, 'SALE', newInvoice.id, userId);
      }

      // Update customer outstanding
      if (dto.customerId && balanceAmount > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: {
            outstandingBalance: { increment: balanceAmount },
            totalPurchases: { increment: totalAmount },
          },
        });
      }

      return newInvoice;
    });

    return invoice;
  }

  static async cancelInvoice(id: string, reason: string, userId: string) {
    const invoice = await this.findById(id);
    if (invoice.status === 'CANCELLED') throw new AppError('Invoice already cancelled', 400);

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({ where: { id }, data: { status: 'CANCELLED', cancelReason: reason } });

      // Restore stock
      for (const item of invoice.items) {
        await StockService.restoreStock(tx, item.medicineId, item.quantity, 'RETURN_FROM_CUSTOMER', id, userId);
      }

      // Restore customer balances that were incremented on create
      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            outstandingBalance: { decrement: Number(invoice.balanceAmount) },
            totalPurchases:     { decrement: Number(invoice.totalAmount) },
          },
        });
      }
    });
  }

  static async printInvoice(id: string) {
    const invoice = await this.findById(id);
    await prisma.invoice.update({ where: { id }, data: { printCount: { increment: 1 } } });
    return invoice;
  }

  static async getDailySummary(date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    return prisma.invoice.aggregate({
      where: { invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true, totalTax: true, discountAmount: true },
      _count: { id: true },
    });
  }
}
