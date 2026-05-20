import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Medical Store Database...');

  // ---- Categories ----
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Antibiotics' }, update: {}, create: { name: 'Antibiotics', color: '#ef4444', icon: '💊' } }),
    prisma.category.upsert({ where: { name: 'Analgesics' }, update: {}, create: { name: 'Analgesics', color: '#f97316', icon: '💉' } }),
    prisma.category.upsert({ where: { name: 'Antacids' }, update: {}, create: { name: 'Antacids', color: '#22c55e', icon: '🧪' } }),
    prisma.category.upsert({ where: { name: 'Vitamins & Supplements' }, update: {}, create: { name: 'Vitamins & Supplements', color: '#3b82f6', icon: '🌿' } }),
    prisma.category.upsert({ where: { name: 'Antihistamines' }, update: {}, create: { name: 'Antihistamines', color: '#8b5cf6', icon: '🩺' } }),
    prisma.category.upsert({ where: { name: 'Cardiovascular' }, update: {}, create: { name: 'Cardiovascular', color: '#ec4899', icon: '❤️' } }),
    prisma.category.upsert({ where: { name: 'Diabetes' }, update: {}, create: { name: 'Diabetes', color: '#06b6d4', icon: '🩸' } }),
    prisma.category.upsert({ where: { name: 'Dermatology' }, update: {}, create: { name: 'Dermatology', color: '#84cc16', icon: '🧴' } }),
    prisma.category.upsert({ where: { name: 'Eye Care' }, update: {}, create: { name: 'Eye Care', color: '#14b8a6', icon: '👁️' } }),
    prisma.category.upsert({ where: { name: 'Cough & Cold' }, update: {}, create: { name: 'Cough & Cold', color: '#64748b', icon: '🤧' } }),
  ]);
  console.log('✅ Categories seeded');

  // ---- Users ----
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const pharmHash = await bcrypt.hash('Pharm@123', 12);
  const cashHash = await bcrypt.hash('Cash@123', 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@medstore.pharmacy', passwordHash: adminHash, fullName: 'Store Administrator', role: UserRole.ADMIN, phone: '+91 98765 43210' },
  });
  const pharmacist = await prisma.user.upsert({
    where: { username: 'pharmacist' },
    update: {},
    create: { username: 'pharmacist', email: 'pharmacist@medstore.pharmacy', passwordHash: pharmHash, fullName: 'Rajesh Kumar', role: UserRole.PHARMACIST, phone: '+91 87654 32109' },
  });
  await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: { username: 'cashier', email: 'cashier@medstore.pharmacy', passwordHash: cashHash, fullName: 'Priya Sharma', role: UserRole.CASHIER, phone: '+91 76543 21098' },
  });
  console.log('✅ Users seeded — Admin: admin/Admin@123 | Pharmacist: pharmacist/Pharm@123 | Cashier: cashier/Cash@123');

  // ---- Suppliers ----
  const suppliers = await Promise.all([
    prisma.supplier.upsert({ where: { id: 'supplier-1' }, update: {}, create: { id: 'supplier-1', name: 'Sun Pharma Distributors', contactPerson: 'Vijay Mehta', phone: '+91 22 4567 8901', email: 'orders@sunpharma-dist.com', address: '45 Pharma Park, Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', gstin: '27AAACS1234B1ZV', drugLicense: 'MH-DL-2024-001', creditDays: 30 } }),
    prisma.supplier.upsert({ where: { id: 'supplier-2' }, update: {}, create: { id: 'supplier-2', name: 'Cipla Medical Supplies', contactPerson: 'Anita Desai', phone: '+91 20 3456 7890', email: 'supply@cipla-med.com', address: 'Industrial Estate, Pimpri', city: 'Pune', state: 'Maharashtra', pincode: '411018', gstin: '27AAACF5678C2ZW', drugLicense: 'MH-DL-2024-002', creditDays: 45 } }),
    prisma.supplier.upsert({ where: { id: 'supplier-3' }, update: {}, create: { id: 'supplier-3', name: 'Apollo Healthcare', contactPerson: 'Ramesh Nair', phone: '+91 44 5678 9012', email: 'orders@apollo-hc.com', address: 'Medical Zone, Anna Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040', gstin: '33AAACA9012D3ZX', drugLicense: 'TN-DL-2024-003', creditDays: 30 } }),
  ]);
  console.log('✅ Suppliers seeded');

  // ---- Medicines ----
  const medicines = [
    { medicineName: 'Amoxicillin 500mg', genericName: 'Amoxicillin', manufacturer: 'Sun Pharma', categoryId: categories[0].id, supplierId: suppliers[0].id, medicineType: 'CAPSULE' as any, batchNumber: 'AMX-2024-001', expiryDate: new Date('2026-03-31'), mrp: 85.50, purchasePrice: 58.00, sellingPrice: 80.00, gstPercentage: 12, stockQuantity: 150, reorderLevel: 20, barcode: '8901234567001', rackLocation: 'A-1-1', hsnCode: '30041020' },
    { medicineName: 'Paracetamol 500mg', genericName: 'Paracetamol', manufacturer: 'Cipla', categoryId: categories[1].id, supplierId: suppliers[1].id, medicineType: 'TABLET' as any, batchNumber: 'PCT-2024-001', expiryDate: new Date('2026-06-30'), mrp: 22.00, purchasePrice: 12.00, sellingPrice: 20.00, gstPercentage: 12, stockQuantity: 500, reorderLevel: 50, barcode: '8901234567002', rackLocation: 'A-2-1', hsnCode: '30049099' },
    { medicineName: 'Pantoprazole 40mg', genericName: 'Pantoprazole', manufacturer: 'Zydus', categoryId: categories[2].id, supplierId: suppliers[0].id, medicineType: 'TABLET' as any, batchNumber: 'PNT-2024-001', expiryDate: new Date('2025-12-31'), mrp: 65.00, purchasePrice: 38.00, sellingPrice: 58.00, gstPercentage: 12, stockQuantity: 200, reorderLevel: 30, barcode: '8901234567003', rackLocation: 'B-1-1', hsnCode: '30041090' },
    { medicineName: 'Vitamin C 500mg', genericName: 'Ascorbic Acid', manufacturer: 'Himalaya', categoryId: categories[3].id, supplierId: suppliers[2].id, medicineType: 'TABLET' as any, batchNumber: 'VTC-2024-001', expiryDate: new Date('2026-09-30'), mrp: 120.00, purchasePrice: 75.00, sellingPrice: 110.00, gstPercentage: 12, stockQuantity: 300, reorderLevel: 30, barcode: '8901234567004', rackLocation: 'C-1-1', hsnCode: '30049099' },
    { medicineName: 'Cetirizine 10mg', genericName: 'Cetirizine HCl', manufacturer: 'Dr. Reddy\'s', categoryId: categories[4].id, supplierId: suppliers[1].id, medicineType: 'TABLET' as any, batchNumber: 'CTZ-2024-001', expiryDate: new Date('2025-11-30'), mrp: 42.00, purchasePrice: 25.00, sellingPrice: 38.00, gstPercentage: 12, stockQuantity: 250, reorderLevel: 25, barcode: '8901234567005', rackLocation: 'B-2-1', hsnCode: '30041090' },
    { medicineName: 'Amlodipine 5mg', genericName: 'Amlodipine Besylate', manufacturer: 'Pfizer', categoryId: categories[5].id, supplierId: suppliers[0].id, medicineType: 'TABLET' as any, batchNumber: 'AML-2024-001', expiryDate: new Date('2026-12-31'), mrp: 95.00, purchasePrice: 60.00, sellingPrice: 88.00, gstPercentage: 12, stockQuantity: 180, reorderLevel: 20, barcode: '8901234567006', rackLocation: 'D-1-1', hsnCode: '30049099', isPrescriptionRequired: true },
    { medicineName: 'Metformin 500mg', genericName: 'Metformin HCl', manufacturer: 'Sun Pharma', categoryId: categories[6].id, supplierId: suppliers[0].id, medicineType: 'TABLET' as any, batchNumber: 'MET-2024-001', expiryDate: new Date('2026-05-31'), mrp: 55.00, purchasePrice: 32.00, sellingPrice: 50.00, gstPercentage: 12, stockQuantity: 220, reorderLevel: 25, barcode: '8901234567007', rackLocation: 'D-2-1', hsnCode: '30049099', isPrescriptionRequired: true },
    { medicineName: 'Betadine Ointment 5%', genericName: 'Povidone Iodine', manufacturer: 'Win Medicare', categoryId: categories[7].id, supplierId: suppliers[2].id, medicineType: 'OINTMENT' as any, batchNumber: 'BET-2024-001', expiryDate: new Date('2025-08-31'), mrp: 78.00, purchasePrice: 48.00, sellingPrice: 70.00, gstPercentage: 12, stockQuantity: 80, reorderLevel: 10, barcode: '8901234567008', rackLocation: 'E-1-1' },
    { medicineName: 'Tropicamide Eye Drops', genericName: 'Tropicamide', manufacturer: 'Sunways', categoryId: categories[8].id, supplierId: suppliers[1].id, medicineType: 'DROPS' as any, batchNumber: 'TRP-2024-001', expiryDate: new Date('2025-07-31'), mrp: 45.00, purchasePrice: 28.00, sellingPrice: 40.00, gstPercentage: 12, stockQuantity: 60, reorderLevel: 10, barcode: '8901234567009', rackLocation: 'E-2-1' },
    { medicineName: 'Benadryl Cough Syrup', genericName: 'Diphenhydramine', manufacturer: 'Johnson & Johnson', categoryId: categories[9].id, supplierId: suppliers[2].id, medicineType: 'SYRUP' as any, batchNumber: 'BEN-2024-001', expiryDate: new Date('2025-10-31'), mrp: 125.00, purchasePrice: 80.00, sellingPrice: 115.00, gstPercentage: 12, stockQuantity: 120, reorderLevel: 15, barcode: '8901234567010', rackLocation: 'F-1-1' },
    { medicineName: 'Azithromycin 500mg', genericName: 'Azithromycin', manufacturer: 'Cipla', categoryId: categories[0].id, supplierId: suppliers[1].id, medicineType: 'TABLET' as any, batchNumber: 'AZI-2024-001', expiryDate: new Date('2026-01-31'), mrp: 145.00, purchasePrice: 95.00, sellingPrice: 135.00, gstPercentage: 12, stockQuantity: 8, reorderLevel: 15, barcode: '8901234567011', rackLocation: 'A-1-2' },
    { medicineName: 'Atorvastatin 10mg', genericName: 'Atorvastatin Calcium', manufacturer: 'Ranbaxy', categoryId: categories[5].id, supplierId: suppliers[0].id, medicineType: 'TABLET' as any, batchNumber: 'ATV-2024-001', expiryDate: new Date('2026-08-31'), mrp: 78.00, purchasePrice: 48.00, sellingPrice: 72.00, gstPercentage: 12, stockQuantity: 160, reorderLevel: 20, barcode: '8901234567012', rackLocation: 'D-1-2', isPrescriptionRequired: true },
    { medicineName: 'D3 Must 60K IU', genericName: 'Cholecalciferol', manufacturer: 'Elder Pharma', categoryId: categories[3].id, supplierId: suppliers[2].id, medicineType: 'CAPSULE' as any, batchNumber: 'D3M-2024-001', expiryDate: new Date('2026-11-30'), mrp: 290.00, purchasePrice: 185.00, sellingPrice: 265.00, gstPercentage: 12, stockQuantity: 90, reorderLevel: 10, barcode: '8901234567013', rackLocation: 'C-2-1' },
    { medicineName: 'Crocin Advance 500mg', genericName: 'Paracetamol', manufacturer: 'GSK', categoryId: categories[1].id, supplierId: suppliers[1].id, medicineType: 'TABLET' as any, batchNumber: 'CRC-2024-001', expiryDate: new Date('2026-04-30'), mrp: 38.00, purchasePrice: 22.00, sellingPrice: 35.00, gstPercentage: 12, stockQuantity: 400, reorderLevel: 40, barcode: '8901234567014', rackLocation: 'A-3-1' },
    { medicineName: 'Omeprazole 20mg', genericName: 'Omeprazole', manufacturer: 'Intas Pharma', categoryId: categories[2].id, supplierId: suppliers[0].id, medicineType: 'CAPSULE' as any, batchNumber: 'OMP-2024-001', expiryDate: new Date('2025-09-30'), mrp: 55.00, purchasePrice: 32.00, sellingPrice: 50.00, gstPercentage: 12, stockQuantity: 5, reorderLevel: 20, barcode: '8901234567015', rackLocation: 'B-1-2' },
  ];

  const createdMedicines: { id: string }[] = [];
  for (const med of medicines) {
    const existing = await prisma.medicine.findFirst({ where: { barcode: med.barcode } });
    if (!existing) {
      const created = await prisma.medicine.create({ data: { ...med } });
      createdMedicines.push(created);
    } else {
      createdMedicines.push(existing);
    }
  }
  console.log('✅ Medicines seeded (15 items including low-stock and expiring examples)');

  // ---- Customers ----
  const customers = await Promise.all([
    prisma.customer.upsert({ where: { id: 'customer-1' }, update: {}, create: { id: 'customer-1', name: 'Ravi Shankar', phone: '9876543210', email: 'ravi@example.com', address: '12, Shivaji Nagar', city: 'Pune', state: 'Maharashtra', gender: 'Male', doctorName: 'Dr. Pradeep Kulkarni' } }),
    prisma.customer.upsert({ where: { id: 'customer-2' }, update: {}, create: { id: 'customer-2', name: 'Suman Latha', phone: '8765432109', email: 'suman@example.com', address: '45, Gandhi Road', city: 'Mumbai', state: 'Maharashtra', gender: 'Female', allergies: 'Penicillin' } }),
    prisma.customer.upsert({ where: { id: 'customer-3' }, update: {}, create: { id: 'customer-3', name: 'Arjun Reddy', phone: '7654321098', email: 'arjun@example.com', address: '78, IT Park Road', city: 'Hyderabad', state: 'Telangana', gender: 'Male' } }),
  ]);
  console.log('✅ Customers seeded');

  // ---- Sample Invoices ----
  const getInvoiceNumber = () => {
    const today = new Date();
    const prefix = `INV${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    return `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`;
  };

  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV20240115DEMO1' },
    update: {},
    create: {
      invoiceNumber: 'INV20240115DEMO1', customerId: customers[0].id, userId: admin.id,
      invoiceDate: new Date('2025-01-15'),
      subtotal: 200.00, discountAmount: 0, discountPercent: 0, taxableAmount: 200.00,
      cgstAmount: 12.00, sgstAmount: 12.00, totalTax: 24.00, totalAmount: 224.00,
      paidAmount: 224.00, balanceAmount: 0, paymentMethod: 'CASH', status: 'PAID',
      items: {
        create: [
          { medicineId: createdMedicines[1].id, medicineName: 'Paracetamol 500mg', batchNumber: 'PCT-2024-001', quantity: 2, freeQuantity: 0, mrp: 22.00, sellingPrice: 20.00, discountPercent: 0, discountAmount: 0, taxableAmount: 40.00, gstPercentage: 12, cgstAmount: 2.40, sgstAmount: 2.40, totalAmount: 44.80 },
          { medicineId: createdMedicines[9].id, medicineName: 'Benadryl Cough Syrup', batchNumber: 'BEN-2024-001', quantity: 1, freeQuantity: 0, mrp: 125.00, sellingPrice: 115.00, discountPercent: 0, discountAmount: 0, taxableAmount: 115.00, gstPercentage: 12, cgstAmount: 6.90, sgstAmount: 6.90, totalAmount: 128.80 },
        ],
      },
    },
  });

  await prisma.stockMovement.createMany({
    skipDuplicates: true,
    data: [
      { medicineId: createdMedicines[1].id, movementType: 'SALE', quantity: 2, balanceAfter: 498, referenceId: inv1.id, referenceType: 'invoice', userId: admin.id },
      { medicineId: createdMedicines[9].id, movementType: 'SALE', quantity: 1, balanceAfter: 119, referenceId: inv1.id, referenceType: 'invoice', userId: admin.id },
    ],
  });

  console.log('✅ Sample invoices seeded');

  // ---- Settings ----
  const defaultSettings = [
    { key: 'pharmacy_name', value: 'Shri Ram Medical Mandla', category: 'pharmacy', label: 'Pharmacy Name', isPublic: true },
    { key: 'pharmacy_address', value: '123 Medical Lane, Healthcare City - 400001', category: 'pharmacy', label: 'Address', isPublic: true },
    { key: 'pharmacy_phone', value: '+91 98765 43210', category: 'pharmacy', label: 'Phone', isPublic: true },
    { key: 'pharmacy_email', value: 'info@medstore.pharmacy', category: 'pharmacy', label: 'Email', isPublic: true },
    { key: 'pharmacy_gstin', value: '27AABCU9603R1ZX', category: 'pharmacy', label: 'GSTIN', isPublic: true },
    { key: 'pharmacy_drug_license', value: '20B-MH-2024-001', category: 'pharmacy', label: 'Drug License', isPublic: true },
    { key: 'invoice_prefix', value: 'INV', category: 'billing', label: 'Invoice Prefix', isPublic: false },
    { key: 'low_stock_threshold', value: '10', category: 'inventory', label: 'Low Stock Threshold', isPublic: false },
    { key: 'expiry_alert_days', value: '30', category: 'inventory', label: 'Expiry Alert Days', isPublic: false },
    { key: 'currency', value: 'INR', category: 'billing', label: 'Currency', isPublic: true },
    { key: 'tax_type', value: 'GST', category: 'billing', label: 'Tax Type', isPublic: true },
    { key: 'state_code', value: '27', category: 'pharmacy', label: 'State Code', isPublic: true },
    { key: 'default_gst', value: '12', category: 'billing', label: 'Default GST %', isPublic: false },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log('✅ Settings seeded');

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials:');
  console.log('  Admin:       admin / Admin@123');
  console.log('  Pharmacist:  pharmacist / Pharm@123');
  console.log('  Cashier:     cashier / Cash@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
