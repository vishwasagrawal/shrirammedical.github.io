import { prisma } from '../config/database';

export class ReportService {
  static async getDailySalesReport(date: string) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    const [summary, invoices, topItems] = await Promise.all([
      prisma.invoice.aggregate({
        where: { invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true, totalTax: true, discountAmount: true, paidAmount: true },
        _count: { id: true },
      }),
      prisma.invoice.findMany({
        where: { invoiceDate: { gte: start, lte: end } },
        include: { customer: { select: { name: true } }, user: { select: { username: true } } },
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.invoiceItem.groupBy({
        by: ['medicineId', 'medicineName'],
        where: { invoice: { invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),
    ]);

    return { date, summary, invoices, topItems };
  }

  static async getMonthlySalesReport(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [summary, dailyBreakdown, paymentBreakdown] = await Promise.all([
      prisma.invoice.aggregate({
        where: { invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true, totalTax: true, discountAmount: true, paidAmount: true },
        _count: { id: true },
      }),
      prisma.$queryRaw<Array<{ day: string; total: number; tax: number; count: number }>>`
        SELECT
          TO_CHAR(invoice_date, 'YYYY-MM-DD') as day,
          SUM(total_amount)::float as total,
          SUM(total_tax)::float as tax,
          COUNT(id)::int as count
        FROM invoices
        WHERE status != 'CANCELLED'
          AND invoice_date BETWEEN ${start} AND ${end}
        GROUP BY TO_CHAR(invoice_date, 'YYYY-MM-DD')
        ORDER BY day
      `,
      prisma.invoice.groupBy({
        by: ['paymentMethod'],
        where: { invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    return { year, month, summary, dailyBreakdown, paymentBreakdown };
  }

  static async getGSTReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(new Date(endDate).setHours(23, 59, 59));

    const gstBreakdown = await prisma.$queryRaw<Array<{
      hsn_code: string;
      gst_percentage: number;
      taxable_amount: number;
      cgst_amount: number;
      sgst_amount: number;
      total_tax: number;
      invoice_count: number;
    }>>`
      SELECT
        COALESCE(ii.hsn_code, 'N/A') as hsn_code,
        ii.gst_percentage::float,
        SUM(ii.taxable_amount)::float as taxable_amount,
        SUM(ii.cgst_amount)::float as cgst_amount,
        SUM(ii.sgst_amount)::float as sgst_amount,
        SUM(ii.cgst_amount + ii.sgst_amount)::float as total_tax,
        COUNT(DISTINCT ii.invoice_id)::int as invoice_count
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.invoice_date BETWEEN ${start} AND ${end}
        AND i.status != 'CANCELLED'
      GROUP BY ii.hsn_code, ii.gst_percentage
      ORDER BY ii.gst_percentage
    `;

    const totals = await prisma.invoice.aggregate({
      where: { invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, totalTax: true, totalAmount: true },
    });

    return { period: { startDate, endDate }, gstBreakdown, totals };
  }

  static async getInventoryValuationReport() {
    return prisma.$queryRaw<Array<{
      id: string;
      medicine_name: string;
      stock_quantity: number;
      purchase_price: number;
      selling_price: number;
      mrp: number;
      purchase_value: number;
      selling_value: number;
      category_name: string;
    }>>`
      SELECT
        m.id,
        m.medicine_name,
        m.stock_quantity::int,
        m.purchase_price::float,
        m.selling_price::float,
        m.mrp::float,
        (m.stock_quantity * m.purchase_price)::float as purchase_value,
        (m.stock_quantity * m.selling_price)::float as selling_value,
        COALESCE(c.name, 'Uncategorized') as category_name
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.is_active = true AND m.stock_quantity > 0
      ORDER BY purchase_value DESC
    `;
  }

  static async getPurchaseReport(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(new Date(endDate).setHours(23, 59, 59));

    const [summary, purchases, supplierBreakdown] = await Promise.all([
      prisma.purchase.aggregate({
        where: { purchaseDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true, taxAmount: true },
        _count: { id: true },
      }),
      prisma.purchase.findMany({
        where: { purchaseDate: { gte: start, lte: end } },
        include: { supplier: { select: { name: true } }, user: { select: { username: true } } },
        orderBy: { purchaseDate: 'desc' },
      }),
      prisma.purchase.groupBy({
        by: ['supplierId'],
        where: { purchaseDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: { id: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
      }),
    ]);

    return { period: { startDate, endDate }, summary, purchases, supplierBreakdown };
  }

  static async getExpiryReport() {
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [expired, expiring30, expiring90] = await Promise.all([
      prisma.medicine.findMany({
        where: { isActive: true, expiryDate: { lt: today }, stockQuantity: { gt: 0 } },
        include: { category: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.medicine.findMany({
        where: { isActive: true, expiryDate: { gte: today, lte: thirtyDays }, stockQuantity: { gt: 0 } },
        include: { category: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.medicine.findMany({
        where: { isActive: true, expiryDate: { gt: thirtyDays, lte: ninetyDays }, stockQuantity: { gt: 0 } },
        include: { category: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    return { expired, expiring30, expiring90 };
  }
}
