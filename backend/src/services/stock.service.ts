import { PrismaClient, StockMovementType } from '@prisma/client';

type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class StockService {
  static async deductStock(
    tx: PrismaTx,
    medicineId: string,
    quantity: number,
    type: StockMovementType,
    referenceId: string,
    userId: string
  ) {
    const medicine = await tx.medicine.update({
      where: { id: medicineId },
      data: { stockQuantity: { decrement: quantity } },
    });

    await tx.stockMovement.create({
      data: {
        medicineId,
        movementType: type,
        quantity,
        balanceAfter: medicine.stockQuantity,
        referenceId,
        referenceType: type === 'SALE' ? 'invoice' : 'purchase',
        userId,
      },
    });
    return medicine.stockQuantity;
  }

  static async restoreStock(
    tx: PrismaTx,
    medicineId: string,
    quantity: number,
    type: StockMovementType,
    referenceId: string,
    userId: string
  ) {
    const medicine = await tx.medicine.update({
      where: { id: medicineId },
      data: { stockQuantity: { increment: quantity } },
    });

    await tx.stockMovement.create({
      data: {
        medicineId,
        movementType: type,
        quantity,
        balanceAfter: medicine.stockQuantity,
        referenceId,
        referenceType: type === 'RETURN_TO_SUPPLIER' ? 'purchase' : 'invoice',
        userId,
      },
    });
    return medicine.stockQuantity;
  }

  static async addStock(
    tx: PrismaTx,
    medicineId: string,
    quantity: number,
    type: StockMovementType,
    referenceId: string,
    userId: string
  ) {
    const medicine = await tx.medicine.update({
      where: { id: medicineId },
      data: { stockQuantity: { increment: quantity } },
    });

    await tx.stockMovement.create({
      data: {
        medicineId,
        movementType: type,
        quantity,
        balanceAfter: medicine.stockQuantity,
        referenceId,
        referenceType: 'purchase',
        userId,
      },
    });
    return medicine.stockQuantity;
  }
}
