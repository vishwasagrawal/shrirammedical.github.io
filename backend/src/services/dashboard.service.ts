import { prisma } from '../config/database';

export class DashboardService {
  static async getSummary() {
    const today = new Date();
    const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      todaySales,
      monthSales,
      yearSales,
      todayInvoices,
      monthInvoices,
      totalMedicines,
      lowStockCount,
      expiringCount,
      totalCustomers,
      totalSuppliers,
      recentInvoices,
      topMedicines,
      monthlySalesChart,
    ] = await Promise.all([
      // Today's sales total
      prisma.invoice.aggregate({
        where: { invoiceDate: { gte: startOfDay, lte: endOfDay }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Month sales
      prisma.invoice.aggregate({
        where: { invoiceDate: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Year sales
      prisma.invoice.aggregate({
        where: { invoiceDate: { gte: startOfYear }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      // Today invoice count
      prisma.invoice.count({ where: { invoiceDate: { gte: startOfDay, lte: endOfDay }, status: { not: 'CANCELLED' } } }),
      // Month invoice count
      prisma.invoice.count({ where: { invoiceDate: { gte: startOfMonth }, status: { not: 'CANCELLED' } } }),
      // Medicine count
      prisma.medicine.count({ where: { isActive: true } }),
      // Low stock
      prisma.medicine.count({ where: { isActive: true, stockQuantity: { lte: 10 } } }),
      // Expiring in 30 days
      prisma.medicine.count({
        where: {
          isActive: true,
          stockQuantity: { gt: 0 },
          expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
        },
      }),
      // Customers
      prisma.customer.count({ where: { isActive: true } }),
      // Suppliers
      prisma.supplier.count({ where: { isActive: true } }),
      // Recent invoices — include only, no select
      prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { customer: { select: { name: true } } },
        orderBy: { invoiceDate: 'desc' },
        take: 8,
      }),
      // Top 5 selling medicines (last 30 days)
      prisma.invoiceItem.groupBy({
        by: ['medicineId', 'medicineName'],
        where: { invoice: { invoiceDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // Monthly sales for chart (last 12 months)
      prisma.$queryRaw<Array<{ month: string; total: number; count: number }>>`
        SELECT
          TO_CHAR(invoice_date, 'YYYY-MM') as month,
          SUM(total_amount)::float as total,
          COUNT(id)::int as count
        FROM invoices
        WHERE status != 'CANCELLED'
          AND invoice_date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
        ORDER BY month ASC
      `,
    ]);

    // Low stock medicines
    const lowStockMedicines = await prisma.medicine.findMany({
      where: { isActive: true, stockQuantity: { lte: 10 } },
      select: { id: true, medicineName: true, stockQuantity: true, reorderLevel: true, rackLocation: true },
      orderBy: { stockQuantity: 'asc' },
      take: 10,
    });

    // Expiring medicines
    const expiringMedicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        stockQuantity: { gt: 0 },
        expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
      },
      select: { id: true, medicineName: true, expiryDate: true, stockQuantity: true, batchNumber: true },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    return {
      stats: {
        todaySales: Number(todaySales._sum.totalAmount || 0),
        monthSales: Number(monthSales._sum.totalAmount || 0),
        yearSales: Number(yearSales._sum.totalAmount || 0),
        todayInvoices,
        monthInvoices,
        totalMedicines,
        lowStockCount,
        expiringCount,
        totalCustomers,
        totalSuppliers,
      },
      recentInvoices,
      topMedicines,
      monthlySalesChart,
      lowStockMedicines,
      expiringMedicines,
    };
  }

  static async getWeeklySales() {
    return prisma.$queryRaw<Array<{ day: string; total: number; count: number }>>`
      SELECT
        TO_CHAR(invoice_date, 'YYYY-MM-DD') as day,
        SUM(total_amount)::float as total,
        COUNT(id)::int as count
      FROM invoices
      WHERE status != 'CANCELLED'
        AND invoice_date >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM-DD')
      ORDER BY day ASC
    `;
  }

  static async getPaymentMethodBreakdown(startDate: Date, endDate: Date) {
    return prisma.invoice.groupBy({
      by: ['paymentMethod'],
      where: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: { id: true },
    });
  }
}
