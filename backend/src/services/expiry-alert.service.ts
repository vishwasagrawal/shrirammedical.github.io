import { prisma } from '../config/database';

export class ExpiryAlertService {
  static async checkAndCreateAlerts() {
    const today = new Date();
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const medicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        stockQuantity: { gt: 0 },
        expiryDate: { lte: ninetyDays },
      },
      select: { id: true, expiryDate: true, stockQuantity: true },
    });

    for (const med of medicines) {
      if (!med.expiryDate) continue;
      const daysToExpiry = Math.ceil((med.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      await prisma.expiryAlert.upsert({
        where: { id: `alert-${med.id}` },
        update: { daysToExpiry, stockQty: med.stockQuantity, status: 'ACTIVE' },
        create: {
          id: `alert-${med.id}`,
          medicineId: med.id,
          expiryDate: med.expiryDate,
          daysToExpiry,
          stockQty: med.stockQuantity,
          status: 'ACTIVE',
        },
      });
    }
  }
}
