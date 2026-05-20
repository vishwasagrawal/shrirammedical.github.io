/**
 * Comprehensive seed script — Shri Ram Medical Mandla
 * Clears all transactional data and inserts realistic pharmacy data.
 * Preserves: users, settings, categories.
 */

import { PrismaClient, MedicineType, PaymentMethod, InvoiceStatus, PurchaseStatus, StockMovementType } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59), 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🗑️  Clearing transactional data...');

  // Delete in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.expiryAlert.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();

  console.log('✅ Cleared. Fetching reference data...');

  const users = await prisma.user.findMany();
  const adminUser = users.find(u => u.role === 'ADMIN')!;
  const pharmacistUser = users.find(u => u.role === 'PHARMACIST')!;
  const cashierUser = users.find(u => u.role === 'CASHIER')!;

  const categories = await prisma.category.findMany();
  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]));

  // ── 1. SUPPLIERS ──────────────────────────────────────────────────────────
  console.log('🏭 Creating suppliers...');

  const suppliersData = [
    { name: 'Sun Pharmaceuticals',   contactPerson: 'Rajesh Kumar',   phone: '9876543210', email: 'rajesh@sunpharma.com',    city: 'Mumbai',    state: 'Maharashtra', gstin: '27AABCS1429B1ZB', drugLicense: 'MH-DL-2024-001', creditLimit: 500000, creditDays: 30 },
    { name: 'Cipla Ltd',             contactPerson: 'Priya Sharma',   phone: '9765432109', email: 'priya@cipla.com',          city: 'Pune',      state: 'Maharashtra', gstin: '27AABCC4849B1ZX', drugLicense: 'MH-DL-2024-002', creditLimit: 300000, creditDays: 45 },
    { name: 'Dr. Reddy\'s Labs',     contactPerson: 'Suresh Reddy',   phone: '9654321098', email: 'suresh@drreddys.com',      city: 'Hyderabad', state: 'Telangana',   gstin: '36AABCD1234B1ZY', drugLicense: 'TS-DL-2024-001', creditLimit: 400000, creditDays: 30 },
    { name: 'Mankind Pharma',        contactPerson: 'Amit Singh',     phone: '9543210987', email: 'amit@mankind.in',          city: 'Delhi',     state: 'Delhi',       gstin: '07AABCM5678B1ZZ', drugLicense: 'DL-DL-2024-001', creditLimit: 250000, creditDays: 60 },
    { name: 'Abbott Healthcare',     contactPerson: 'Neha Joshi',     phone: '9432109876', email: 'neha@abbott.com',          city: 'Ahmedabad', state: 'Gujarat',     gstin: '24AABCA9012B1ZW', drugLicense: 'GJ-DL-2024-001', creditLimit: 350000, creditDays: 30 },
    { name: 'Alkem Laboratories',    contactPerson: 'Vikram Patel',   phone: '9321098765', email: 'vikram@alkem.com',         city: 'Mumbai',    state: 'Maharashtra', gstin: '27AABCA3456B1ZV', drugLicense: 'MH-DL-2024-003', creditLimit: 200000, creditDays: 45 },
    { name: 'Torrent Pharmaceuticals', contactPerson: 'Ravi Mehta',  phone: '9210987654', email: 'ravi@torrentpharma.com',   city: 'Ahmedabad', state: 'Gujarat',     gstin: '24AABCT7890B1ZU', drugLicense: 'GJ-DL-2024-002', creditLimit: 280000, creditDays: 30 },
    { name: 'Lupin Limited',         contactPerson: 'Anita Verma',   phone: '9109876543', email: 'anita@lupin.com',          city: 'Nagpur',    state: 'Maharashtra', gstin: '27AABCL2345B1ZT', drugLicense: 'MH-DL-2024-004', creditLimit: 320000, creditDays: 30 },
  ];

  const suppliers = await Promise.all(
    suppliersData.map(s => prisma.supplier.create({
      data: {
        ...s,
        address: `${s.city} Industrial Area`,
        pincode: String(400000 + rand(1, 999)),
        creditLimit: s.creditLimit,
        creditDays: s.creditDays,
        isActive: true,
      }
    }))
  );
  console.log(`   → ${suppliers.length} suppliers created`);

  // ── 2. MEDICINES ──────────────────────────────────────────────────────────
  console.log('💊 Creating medicines...');

  const medicinesData = [
    // Analgesics
    { medicineName: 'Dolo 650',         genericName: 'Paracetamol 650mg',    manufacturer: 'Micro Labs',    categoryId: catMap['Analgesics'],            supplierId: suppliers[0].id, type: MedicineType.TABLET,   batch: 'DL-2024-001', expiryDays: 540, mfgDaysAgo: 90,  mrp: 32,   pp: 22,  sp: 30,   gst: 12, stock: 450, reorder: 50, rack: 'A-1', units: 15, barcode: '8901234560001' },
    { medicineName: 'Calpol 500',       genericName: 'Paracetamol 500mg',    manufacturer: 'GSK',           categoryId: catMap['Analgesics'],            supplierId: suppliers[1].id, type: MedicineType.TABLET,   batch: 'CP-2024-001', expiryDays: 600, mfgDaysAgo: 60,  mrp: 25,   pp: 16,  sp: 22,   gst: 12, stock: 300, reorder: 50, rack: 'A-1', units: 10, barcode: '8901234560002' },
    { medicineName: 'Voveran 50',       genericName: 'Diclofenac 50mg',      manufacturer: 'Novartis',      categoryId: catMap['Analgesics'],            supplierId: suppliers[2].id, type: MedicineType.TABLET,   batch: 'VV-2024-001', expiryDays: 720, mfgDaysAgo: 120, mrp: 28,   pp: 18,  sp: 25,   gst: 12, stock: 200, reorder: 30, rack: 'A-2', units: 10, barcode: '8901234560003' },
    { medicineName: 'Combiflam',        genericName: 'Ibuprofen+Paracetamol',manufacturer: 'Sanofi',        categoryId: catMap['Analgesics'],            supplierId: suppliers[3].id, type: MedicineType.TABLET,   batch: 'CB-2024-001', expiryDays: 480, mfgDaysAgo: 150, mrp: 38,   pp: 26,  sp: 35,   gst: 12, stock: 180, reorder: 30, rack: 'A-2', units: 20, barcode: '8901234560004' },
    { medicineName: 'Brufen 400',       genericName: 'Ibuprofen 400mg',      manufacturer: 'Abbott',        categoryId: catMap['Analgesics'],            supplierId: suppliers[4].id, type: MedicineType.TABLET,   batch: 'BF-2024-001', expiryDays: 365, mfgDaysAgo: 45,  mrp: 22,   pp: 14,  sp: 20,   gst: 12, stock: 6,   reorder: 20, rack: 'A-3', units: 10, barcode: '8901234560005' },

    // Antibiotics
    { medicineName: 'Augmentin 625',    genericName: 'Amoxicillin+Clavulanate', manufacturer: 'GSK',        categoryId: catMap['Antibiotics'],           supplierId: suppliers[1].id, type: MedicineType.TABLET,   batch: 'AU-2024-001', expiryDays: 730, mfgDaysAgo: 60,  mrp: 145,  pp: 95,  sp: 135,  gst: 12, stock: 120, reorder: 20, rack: 'B-1', units: 10, barcode: '8901234560006', prescription: true },
    { medicineName: 'Azithral 500',     genericName: 'Azithromycin 500mg',   manufacturer: 'Alembic',      categoryId: catMap['Antibiotics'],           supplierId: suppliers[5].id, type: MedicineType.TABLET,   batch: 'AZ-2024-001', expiryDays: 540, mfgDaysAgo: 90,  mrp: 85,   pp: 58,  sp: 78,   gst: 12, stock: 90,  reorder: 15, rack: 'B-1', units: 3,  barcode: '8901234560007', prescription: true },
    { medicineName: 'Ciprofloxacin 500',genericName: 'Ciprofloxacin 500mg',  manufacturer: 'Cipla',        categoryId: catMap['Antibiotics'],           supplierId: suppliers[1].id, type: MedicineType.TABLET,   batch: 'CF-2024-001', expiryDays: 720, mfgDaysAgo: 30,  mrp: 55,   pp: 36,  sp: 50,   gst: 12, stock: 8,   reorder: 20, rack: 'B-2', units: 10, barcode: '8901234560008', prescription: true },
    { medicineName: 'Amoxicillin 250 Syrup', genericName: 'Amoxicillin 250mg/5ml', manufacturer: 'Ranbaxy', categoryId: catMap['Antibiotics'],          supplierId: suppliers[2].id, type: MedicineType.SYRUP,    batch: 'AM-2024-001', expiryDays: 24,  mfgDaysAgo: 10,  mrp: 62,   pp: 42,  sp: 58,   gst: 12, stock: 25,  reorder: 10, rack: 'B-3', units: 1,  barcode: '8901234560009', prescription: true },

    // Cough & Cold
    { medicineName: 'Benadryl Cough',   genericName: 'Diphenhydramine',      manufacturer: 'Johnson & Johnson', categoryId: catMap['Cough & Cold'],     supplierId: suppliers[4].id, type: MedicineType.SYRUP,    batch: 'BN-2024-001', expiryDays: 365, mfgDaysAgo: 75,  mrp: 95,   pp: 65,  sp: 88,   gst: 12, stock: 60,  reorder: 15, rack: 'C-1', units: 1,  barcode: '8901234560010' },
    { medicineName: 'Ascoril LS',       genericName: 'Levosalbutamol+Ambroxol', manufacturer: 'Glenmark',    categoryId: catMap['Cough & Cold'],         supplierId: suppliers[5].id, type: MedicineType.SYRUP,    batch: 'AS-2024-001', expiryDays: 18,  mfgDaysAgo: 15,  mrp: 118,  pp: 80,  sp: 108,  gst: 12, stock: 35,  reorder: 10, rack: 'C-1', units: 1,  barcode: '8901234560011' },
    { medicineName: 'Cetirizine 10mg',  genericName: 'Cetirizine HCl',       manufacturer: 'Sun Pharma',    categoryId: catMap['Cough & Cold'],         supplierId: suppliers[0].id, type: MedicineType.TABLET,   batch: 'CZ-2024-001', expiryDays: 730, mfgDaysAgo: 45,  mrp: 18,   pp: 10,  sp: 16,   gst: 12, stock: 350, reorder: 50, rack: 'C-2', units: 10, barcode: '8901234560012' },
    { medicineName: 'Sinarest Tablet',  genericName: 'Paracetamol+Chlorpheniramine', manufacturer: 'Centaur', categoryId: catMap['Cough & Cold'],        supplierId: suppliers[6].id, type: MedicineType.TABLET,   batch: 'SN-2024-001', expiryDays: 540, mfgDaysAgo: 30,  mrp: 28,   pp: 18,  sp: 25,   gst: 12, stock: 200, reorder: 40, rack: 'C-2', units: 10, barcode: '8901234560013' },

    // Antacids
    { medicineName: 'Gelusil MPS',      genericName: 'Magnesium+Aluminium', manufacturer: 'Pfizer',          categoryId: catMap['Antacids'],             supplierId: suppliers[3].id, type: MedicineType.SYRUP,    batch: 'GL-2024-001', expiryDays: 730, mfgDaysAgo: 60,  mrp: 88,   pp: 58,  sp: 80,   gst: 12, stock: 45,  reorder: 10, rack: 'D-1', units: 1,  barcode: '8901234560014' },
    { medicineName: 'Pan 40',           genericName: 'Pantoprazole 40mg',   manufacturer: 'Alkem',            categoryId: catMap['Antacids'],             supplierId: suppliers[5].id, type: MedicineType.TABLET,   batch: 'PN-2024-001', expiryDays: 365, mfgDaysAgo: 120, mrp: 42,   pp: 28,  sp: 38,   gst: 12, stock: 5,   reorder: 25, rack: 'D-1', units: 15, barcode: '8901234560015' },
    { medicineName: 'Rantac 150',       genericName: 'Ranitidine 150mg',    manufacturer: 'J.B. Chemicals',   categoryId: catMap['Antacids'],             supplierId: suppliers[6].id, type: MedicineType.TABLET,   batch: 'RT-2024-001', expiryDays: 600, mfgDaysAgo: 90,  mrp: 32,   pp: 20,  sp: 28,   gst: 12, stock: 160, reorder: 30, rack: 'D-2', units: 15, barcode: '8901234560016' },
    { medicineName: 'Omez 20',          genericName: 'Omeprazole 20mg',     manufacturer: 'Dr. Reddy\'s',     categoryId: catMap['Antacids'],             supplierId: suppliers[2].id, type: MedicineType.CAPSULE,  batch: 'OZ-2024-001', expiryDays: 540, mfgDaysAgo: 45,  mrp: 36,   pp: 22,  sp: 32,   gst: 12, stock: 210, reorder: 40, rack: 'D-2', units: 15, barcode: '8901234560017' },

    // Cardiovascular
    { medicineName: 'Atenolol 50mg',    genericName: 'Atenolol',            manufacturer: 'Cipla',            categoryId: catMap['Cardiovascular'],        supplierId: suppliers[1].id, type: MedicineType.TABLET,   batch: 'AT-2024-001', expiryDays: 730, mfgDaysAgo: 180, mrp: 28,   pp: 18,  sp: 25,   gst: 12, stock: 180, reorder: 30, rack: 'E-1', units: 14, barcode: '8901234560018', prescription: true },
    { medicineName: 'Amlodipine 5mg',   genericName: 'Amlodipine Besylate', manufacturer: 'Torrent',          categoryId: catMap['Cardiovascular'],        supplierId: suppliers[6].id, type: MedicineType.TABLET,   batch: 'AM2-2024-001', expiryDays: 720, mfgDaysAgo: 90, mrp: 48,   pp: 30,  sp: 42,   gst: 12, stock: 150, reorder: 25, rack: 'E-1', units: 10, barcode: '8901234560019', prescription: true },
    { medicineName: 'Ecosprin 75',      genericName: 'Aspirin 75mg',        manufacturer: 'USV',              categoryId: catMap['Cardiovascular'],        supplierId: suppliers[0].id, type: MedicineType.TABLET,   batch: 'EC-2024-001', expiryDays: 27,  mfgDaysAgo: 20,  mrp: 22,   pp: 14,  sp: 20,   gst: 12, stock: 320, reorder: 50, rack: 'E-2', units: 14, barcode: '8901234560020', prescription: true },
    { medicineName: 'Metformin 500',    genericName: 'Metformin HCl 500mg', manufacturer: 'Sun Pharma',       categoryId: catMap['Diabetes'],              supplierId: suppliers[0].id, type: MedicineType.TABLET,   batch: 'MF-2024-001', expiryDays: 730, mfgDaysAgo: 60,  mrp: 28,   pp: 16,  sp: 24,   gst: 12, stock: 220, reorder: 40, rack: 'F-1', units: 20, barcode: '8901234560021', prescription: true },

    // Diabetes
    { medicineName: 'Glimepiride 2mg',  genericName: 'Glimepiride',         manufacturer: 'Sanofi',           categoryId: catMap['Diabetes'],              supplierId: suppliers[3].id, type: MedicineType.TABLET,   batch: 'GM-2024-001', expiryDays: 540, mfgDaysAgo: 90,  mrp: 65,   pp: 42,  sp: 58,   gst: 12, stock: 7,   reorder: 20, rack: 'F-1', units: 15, barcode: '8901234560022', prescription: true },
    { medicineName: 'Insulin Glargine', genericName: 'Insulin Glargine',    manufacturer: 'Sanofi',           categoryId: catMap['Diabetes'],              supplierId: suppliers[3].id, type: MedicineType.INJECTION, batch: 'IG-2024-001', expiryDays: 180, mfgDaysAgo: 30, mrp: 850,  pp: 580, sp: 780,  gst: 12, stock: 18,  reorder: 5,  rack: 'F-2', units: 1,  barcode: '8901234560023', prescription: true },

    // Vitamins
    { medicineName: 'Revital H',        genericName: 'Multivitamin',        manufacturer: 'Ranbaxy',          categoryId: catMap['Vitamins & Supplements'], supplierId: suppliers[2].id, type: MedicineType.CAPSULE,  batch: 'RV-2024-001', expiryDays: 730, mfgDaysAgo: 120, mrp: 148,  pp: 98,  sp: 135,  gst: 12, stock: 95,  reorder: 20, rack: 'G-1', units: 30, barcode: '8901234560024' },
    { medicineName: 'Limcee 500mg',     genericName: 'Vitamin C 500mg',     manufacturer: 'Abbott',           categoryId: catMap['Vitamins & Supplements'], supplierId: suppliers[4].id, type: MedicineType.TABLET,   batch: 'LC-2024-001', expiryDays: 730, mfgDaysAgo: 45,  mrp: 35,   pp: 22,  sp: 30,   gst: 12, stock: 280, reorder: 50, rack: 'G-1', units: 15, barcode: '8901234560025' },
    { medicineName: 'Shelcal 500',      genericName: 'Calcium+Vitamin D3',  manufacturer: 'Torrent',          categoryId: catMap['Vitamins & Supplements'], supplierId: suppliers[6].id, type: MedicineType.TABLET,   batch: 'SC-2024-001', expiryDays: 540, mfgDaysAgo: 90,  mrp: 125,  pp: 82,  sp: 112,  gst: 12, stock: 120, reorder: 20, rack: 'G-2', units: 30, barcode: '8901234560026' },
    { medicineName: 'Zincovit',         genericName: 'Multivitamin+Minerals', manufacturer: 'Apex',           categoryId: catMap['Vitamins & Supplements'], supplierId: suppliers[7].id, type: MedicineType.TABLET,   batch: 'ZC-2024-001', expiryDays: 730, mfgDaysAgo: 30,  mrp: 95,   pp: 62,  sp: 85,   gst: 12, stock: 85,  reorder: 15, rack: 'G-2', units: 30, barcode: '8901234560027' },

    // Antihistamines
    { medicineName: 'Allegra 120mg',    genericName: 'Fexofenadine 120mg',  manufacturer: 'Sanofi',           categoryId: catMap['Antihistamines'],        supplierId: suppliers[3].id, type: MedicineType.TABLET,   batch: 'AL-2024-001', expiryDays: 730, mfgDaysAgo: 60,  mrp: 98,   pp: 64,  sp: 88,   gst: 12, stock: 110, reorder: 20, rack: 'H-1', units: 10, barcode: '8901234560028' },
    { medicineName: 'Montair LC',       genericName: 'Montelukast+Levocetirizine', manufacturer: 'Cipla',    categoryId: catMap['Antihistamines'],        supplierId: suppliers[1].id, type: MedicineType.TABLET,   batch: 'ML-2024-001', expiryDays: 540, mfgDaysAgo: 75,  mrp: 125,  pp: 82,  sp: 115,  gst: 12, stock: 4,   reorder: 15, rack: 'H-1', units: 10, barcode: '8901234560029', prescription: true },

    // Dermatology
    { medicineName: 'Betadine Ointment',genericName: 'Povidone Iodine 5%', manufacturer: 'Win Medicare',     categoryId: catMap['Dermatology'],           supplierId: suppliers[7].id, type: MedicineType.OINTMENT, batch: 'BD-2024-001', expiryDays: 730, mfgDaysAgo: 90,  mrp: 45,   pp: 30,  sp: 40,   gst: 12, stock: 55,  reorder: 10, rack: 'I-1', units: 1,  barcode: '8901234560030' },
    { medicineName: 'Soframycin Cream', genericName: 'Framycetin 1%',      manufacturer: 'Sanofi',           categoryId: catMap['Dermatology'],           supplierId: suppliers[3].id, type: MedicineType.CREAM,    batch: 'SF-2024-001', expiryDays: 14,  mfgDaysAgo: 5,   mrp: 52,   pp: 34,  sp: 46,   gst: 12, stock: 38,  reorder: 8,  rack: 'I-1', units: 1,  barcode: '8901234560031' },
    { medicineName: 'Betnovate-N',      genericName: 'Betamethasone+Neomycin', manufacturer: 'GSK',           categoryId: catMap['Dermatology'],           supplierId: suppliers[1].id, type: MedicineType.CREAM,    batch: 'BN2-2024-001', expiryDays: 540, mfgDaysAgo: 60, mrp: 68,   pp: 44,  sp: 60,   gst: 12, stock: 42,  reorder: 8,  rack: 'I-2', units: 1,  barcode: '8901234560032', prescription: true },

    // Eye Care
    { medicineName: 'Moxifloxacin Eye Drops', genericName: 'Moxifloxacin 0.5%', manufacturer: 'Alcon',       categoryId: catMap['Eye Care'],              supplierId: suppliers[4].id, type: MedicineType.DROPS,    batch: 'MX-2024-001', expiryDays: 22,  mfgDaysAgo: 8,   mrp: 125,  pp: 82,  sp: 112,  gst: 12, stock: 22,  reorder: 8,  rack: 'J-1', units: 1,  barcode: '8901234560033', prescription: true },
    { medicineName: 'Opticrom Eye Drops',     genericName: 'Sodium Cromoglicate', manufacturer: 'Sanofi',    categoryId: catMap['Eye Care'],              supplierId: suppliers[3].id, type: MedicineType.DROPS,    batch: 'OP-2024-001', expiryDays: 365, mfgDaysAgo: 45,  mrp: 85,   pp: 55,  sp: 75,   gst: 12, stock: 28,  reorder: 6,  rack: 'J-1', units: 1,  barcode: '8901234560034' },
    { medicineName: 'Tears Naturale',         genericName: 'Hydroxypropyl Methylcellulose', manufacturer: 'Alcon', categoryId: catMap['Eye Care'],       supplierId: suppliers[4].id, type: MedicineType.DROPS,    batch: 'TN-2024-001', expiryDays: 730, mfgDaysAgo: 30,  mrp: 145,  pp: 95,  sp: 132,  gst: 12, stock: 35,  reorder: 6,  rack: 'J-2', units: 1,  barcode: '8901234560035' },
  ];

  const medicines = await Promise.all(
    medicinesData.map(m => prisma.medicine.create({
      data: {
        medicineName: m.medicineName,
        genericName: m.genericName,
        manufacturer: m.manufacturer,
        categoryId: m.categoryId,
        supplierId: m.supplierId,
        medicineType: m.type,
        batchNumber: m.batch,
        expiryDate: daysFromNow(m.expiryDays),
        manufacturingDate: daysAgo(m.mfgDaysAgo),
        mrp: m.mrp,
        purchasePrice: m.pp,
        sellingPrice: m.sp,
        gstPercentage: m.gst,
        stockQuantity: m.stock,
        reorderLevel: m.reorder,
        rackLocation: m.rack,
        unit: 'STRIP',
        unitsPerPack: m.units,
        barcode: m.barcode,
        hsnCode: '30049099',
        isActive: true,
        isPrescriptionRequired: (m as any).prescription || false,
      }
    }))
  );
  console.log(`   → ${medicines.length} medicines created`);

  // ── 3. CUSTOMERS ──────────────────────────────────────────────────────────
  console.log('👥 Creating customers...');

  const customersData = [
    { name: 'Ramesh Kumar Sharma',  phone: '9876543200', email: 'ramesh.sharma@gmail.com',   city: 'Mandla',     gender: 'MALE',   doctor: 'Dr. S.K. Patel',    credit: 5000,  outstanding: 0,     total: 12450 },
    { name: 'Sunita Devi Tiwari',   phone: '9765432100', email: 'sunita.tiwari@gmail.com',   city: 'Mandla',     gender: 'FEMALE', doctor: 'Dr. Anjali Gupta',  credit: 3000,  outstanding: 850,   total: 8900 },
    { name: 'Mahesh Prasad Yadav',  phone: '9654321000', email: null,                         city: 'Jabalpur',   gender: 'MALE',   doctor: null,                credit: 0,     outstanding: 0,     total: 3200 },
    { name: 'Geeta Bai Kushwaha',   phone: '9543210900', email: null,                         city: 'Mandla',     gender: 'FEMALE', doctor: 'Dr. R.K. Verma',    credit: 2000,  outstanding: 450,   total: 5600 },
    { name: 'Suresh Chandra Gupta', phone: '9432109800', email: 'suresh.gupta@gmail.com',    city: 'Narsinghpur',gender: 'MALE',   doctor: 'Dr. S.K. Patel',    credit: 8000,  outstanding: 2100,  total: 28000 },
    { name: 'Priya Agrawal',        phone: '9321098700', email: 'priya.agrawal@gmail.com',   city: 'Mandla',     gender: 'FEMALE', doctor: null,                credit: 1000,  outstanding: 0,     total: 4500 },
    { name: 'Mohan Lal Patel',      phone: '9210987600', email: null,                         city: 'Mandla',     gender: 'MALE',   doctor: 'Dr. Anjali Gupta',  credit: 0,     outstanding: 0,     total: 1800 },
    { name: 'Kavita Singh Rajput',  phone: '9109876500', email: 'kavita.rajput@gmail.com',   city: 'Seoni',      gender: 'FEMALE', doctor: 'Dr. M.L. Tiwari',   credit: 5000,  outstanding: 1200,  total: 15600 },
    { name: 'Dinesh Babu Sahu',     phone: '9098765400', email: null,                         city: 'Mandla',     gender: 'MALE',   doctor: null,                credit: 0,     outstanding: 0,     total: 2200 },
    { name: 'Anita Kumari Pandey',  phone: '8987654300', email: null,                         city: 'Katni',      gender: 'FEMALE', doctor: 'Dr. R.K. Verma',    credit: 3000,  outstanding: 0,     total: 6800 },
    { name: 'Rajesh Bhai Solanki',  phone: '8876543200', email: 'rajesh.solanki@gmail.com',  city: 'Mandla',     gender: 'MALE',   doctor: null,                credit: 0,     outstanding: 0,     total: 3400 },
    { name: 'Saroj Mishra',         phone: '8765432100', email: null,                         city: 'Mandla',     gender: 'FEMALE', doctor: 'Dr. S.K. Patel',    credit: 4000,  outstanding: 1800,  total: 18900 },
    { name: 'Tulsi Ram Dhurve',     phone: '8654321000', email: null,                         city: 'Dindori',    gender: 'MALE',   doctor: null,                credit: 0,     outstanding: 0,     total: 1100 },
    { name: 'Pushpa Lata Joshi',    phone: '8543210900', email: 'pushpa.joshi@yahoo.com',     city: 'Mandla',     gender: 'FEMALE', doctor: 'Dr. Anjali Gupta',  credit: 6000,  outstanding: 0,     total: 22400 },
    { name: 'Kishan Prasad Nayak',  phone: '8432109800', email: null,                         city: 'Mandla',     gender: 'MALE',   doctor: 'Dr. M.L. Tiwari',   credit: 2000,  outstanding: 620,   total: 9800 },
    { name: 'Meena Kumari Tiwari',  phone: '8321098700', email: null,                         city: 'Jabalpur',   gender: 'FEMALE', doctor: null,                credit: 0,     outstanding: 0,     total: 2800 },
    { name: 'Shyam Lal Kol',        phone: '8210987600', email: null,                         city: 'Mandla',     gender: 'MALE',   doctor: 'Dr. R.K. Verma',    credit: 1500,  outstanding: 380,   total: 7200 },
    { name: 'Urmila Devi Bai',      phone: '8109876500', email: null,                         city: 'Mandla',     gender: 'FEMALE', doctor: null,                credit: 0,     outstanding: 0,     total: 1600 },
    { name: 'Naresh Kumar Lodhi',   phone: '7998765400', email: 'naresh.lodhi@gmail.com',     city: 'Seoni',      gender: 'MALE',   doctor: 'Dr. S.K. Patel',    credit: 10000, outstanding: 3500,  total: 35600 },
    { name: 'Kamla Bai Markam',     phone: '7887654300', email: null,                         city: 'Mandla',     gender: 'FEMALE', doctor: null,                credit: 0,     outstanding: 0,     total: 980 },
  ];

  const customers = await Promise.all(
    customersData.map(c => prisma.customer.create({
      data: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        state: 'Madhya Pradesh',
        gender: c.gender,
        doctorName: c.doctor,
        creditLimit: c.credit,
        outstandingBalance: c.outstanding,
        totalPurchases: c.total,
        isActive: true,
      }
    }))
  );
  console.log(`   → ${customers.length} customers created`);

  // ── 4. PURCHASES (backdated 12 months) ───────────────────────────────────
  console.log('📦 Creating purchase orders...');

  const purchaseOrders = [
    { daysAgoVal: 355, sup: 0, inv: 'SUN-2024-001', items: [{ med: 0, qty: 500, pp: 22,  sp: 30,  mrp: 32,  gst: 12, batch: 'DL-2024-001' }, { med: 11, qty: 500, pp: 10,  sp: 16,  mrp: 18,  gst: 12, batch: 'CZ-2024-001' }] },
    { daysAgoVal: 320, sup: 1, inv: 'CIPLA-2024-001', items: [{ med: 5, qty: 200, pp: 95,  sp: 135, mrp: 145, gst: 12, batch: 'AU-2024-001' }, { med: 10, qty: 100, pp: 58,  sp: 78,  mrp: 85,  gst: 12, batch: 'AZ-2024-002' }] },
    { daysAgoVal: 280, sup: 2, inv: 'DRL-2024-001',  items: [{ med: 2, qty: 300, pp: 18,  sp: 25,  mrp: 28,  gst: 12, batch: 'VV-2024-001' }, { med: 8, qty: 80,  pp: 42,  sp: 58,  mrp: 62,  gst: 12, batch: 'AM-2024-001' }] },
    { daysAgoVal: 240, sup: 3, inv: 'MAN-2024-001',  items: [{ med: 3, qty: 200, pp: 26,  sp: 35,  mrp: 38,  gst: 12, batch: 'CB-2024-001' }, { med: 22, qty: 150, pp: 42,  sp: 58,  mrp: 65,  gst: 12, batch: 'GM-2024-001' }] },
    { daysAgoVal: 200, sup: 4, inv: 'ABT-2024-001',  items: [{ med: 4, qty: 100, pp: 14,  sp: 20,  mrp: 22,  gst: 12, batch: 'BF-2024-001' }, { med: 9, qty: 80,  pp: 65,  sp: 88,  mrp: 95,  gst: 12, batch: 'BN-2024-001' }] },
    { daysAgoVal: 165, sup: 5, inv: 'ALK-2024-001',  items: [{ med: 14, qty: 60, pp: 58,  sp: 80,  mrp: 88,  gst: 12, batch: 'GL-2024-001' }, { med: 16, qty: 200, pp: 20,  sp: 28,  mrp: 32,  gst: 12, batch: 'RT-2024-001' }] },
    { daysAgoVal: 130, sup: 6, inv: 'TOR-2024-001',  items: [{ med: 17, qty: 250, pp: 22, sp: 32,  mrp: 36,  gst: 12, batch: 'OZ-2024-001' }, { med: 19, qty: 200, pp: 30,  sp: 42,  mrp: 48,  gst: 12, batch: 'AM2-2024-001' }] },
    { daysAgoVal: 100, sup: 0, inv: 'SUN-2024-002',  items: [{ med: 0, qty: 300, pp: 22,  sp: 30,  mrp: 32,  gst: 12, batch: 'DL-2024-002' }, { med: 20, qty: 300, pp: 16,  sp: 24,  mrp: 28,  gst: 12, batch: 'MF-2024-001' }] },
    { daysAgoVal: 70,  sup: 1, inv: 'CIPLA-2024-002', items: [{ med: 7, qty: 100, pp: 36,  sp: 50,  mrp: 55,  gst: 12, batch: 'CF-2024-001' }, { med: 28, qty: 120, pp: 82,  sp: 115, mrp: 125, gst: 12, batch: 'ML-2024-001' }] },
    { daysAgoVal: 45,  sup: 3, inv: 'MAN-2024-002',  items: [{ med: 23, qty: 100, pp: 98,  sp: 135, mrp: 148, gst: 12, batch: 'RV-2024-001' }, { med: 25, qty: 60,  pp: 82,  sp: 112, mrp: 125, gst: 12, batch: 'SC-2024-001' }] },
    { daysAgoVal: 25,  sup: 2, inv: 'DRL-2024-002',  items: [{ med: 21, qty: 30,  pp: 580, sp: 780, mrp: 850, gst: 12, batch: 'IG-2024-001' }, { med: 1, qty: 200, pp: 16,  sp: 22,  mrp: 25,  gst: 12, batch: 'CP-2024-001' }] },
    { daysAgoVal: 10,  sup: 4, inv: 'ABT-2024-002',  items: [{ med: 24, qty: 300, pp: 22,  sp: 30,  mrp: 35,  gst: 12, batch: 'LC-2024-001' }, { med: 26, qty: 100, pp: 62,  sp: 85,  mrp: 95,  gst: 12, batch: 'ZC-2024-001' }] },
    { daysAgoVal: 5,   sup: 7, inv: 'LUP-2024-001',  items: [{ med: 29, qty: 50,  pp: 30,  sp: 40,  mrp: 45,  gst: 12, batch: 'BD-2024-001' }, { med: 32, qty: 40,  pp: 82,  sp: 112, mrp: 125, gst: 12, batch: 'MX-2024-001' }] },
    { daysAgoVal: 2,   sup: 6, inv: 'TOR-2024-002',  items: [{ med: 18, qty: 200, pp: 18,  sp: 25,  mrp: 28,  gst: 12, batch: 'AT-2024-001' }, { med: 27, qty: 120, pp: 64,  sp: 88,  mrp: 98,  gst: 12, batch: 'AL-2024-001' }] },
  ];

  let purchaseNum = 1;
  for (const po of purchaseOrders) {
    const subtotal = po.items.reduce((s, i) => s + i.qty * i.pp, 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;
    const purchaseDate = daysAgo(po.daysAgoVal);

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: `PO-${String(purchaseNum++).padStart(4, '0')}`,
        supplierId: suppliers[po.sup].id,
        userId: adminUser.id,
        purchaseDate,
        invoiceNumber: po.inv,
        invoiceDate: purchaseDate,
        status: PurchaseStatus.RECEIVED,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        paidAmount: rand(0, 1) === 1 ? total : total * 0.5,
        balanceAmount: rand(0, 1) === 1 ? 0 : total * 0.5,
        paymentMethod: PaymentMethod.CREDIT,
        paymentDueDate: new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    });

    for (const item of po.items) {
      if (item.med >= medicines.length) continue;
      const med = medicines[item.med];
      const itemTotal = item.qty * item.pp;
      const itemTax = itemTotal * (item.gst / 100);

      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          medicineId: med.id,
          medicineName: med.medicineName,
          batchNumber: item.batch,
          expiryDate: med.expiryDate,
          quantity: item.qty,
          purchasePrice: item.pp,
          mrp: item.mrp,
          sellingPrice: item.sp,
          gstPercentage: item.gst,
          taxAmount: itemTax,
          totalAmount: itemTotal + itemTax,
          hsnCode: '30049099',
        }
      });

      await prisma.stockMovement.create({
        data: {
          medicineId: med.id,
          movementType: StockMovementType.PURCHASE,
          quantity: item.qty,
          balanceAfter: med.stockQuantity,
          referenceId: purchase.id,
          referenceType: 'purchase',
          batchNumber: item.batch,
          notes: `Purchase from ${suppliers[po.sup].name}`,
          userId: adminUser.id,
          createdAt: purchaseDate,
        }
      });
    }
  }
  console.log(`   → ${purchaseNum - 1} purchases created`);

  // ── 5. INVOICES (backdated, spread across 12 months) ─────────────────────
  console.log('🧾 Creating invoices...');

  const paymentMethods = [PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.CREDIT, PaymentMethod.ONLINE];

  type InvoiceDefinition = {
    daysAgoVal: number;
    custIdx: number | null;
    custName?: string;
    custPhone?: string;
    method: PaymentMethod;
    status: InvoiceStatus;
    items: Array<{ medIdx: number; qty: number; disc: number }>;
  };

  const invoiceDefinitions: InvoiceDefinition[] = [
    // 12 months ago
    { daysAgoVal: 350, custIdx: 0,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 0, qty: 2, disc: 0 }, { medIdx: 11, qty: 3, disc: 0 }] },
    { daysAgoVal: 345, custIdx: 1,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 5, qty: 1, disc: 5 }, { medIdx: 6, qty: 1, disc: 0 }] },
    { daysAgoVal: 340, custIdx: null, custName: 'Walk-in Patient', custPhone: '9000000001', method: PaymentMethod.CASH, status: InvoiceStatus.PAID, items: [{ medIdx: 9, qty: 1, disc: 0 }, { medIdx: 3, qty: 2, disc: 0 }] },
    { daysAgoVal: 335, custIdx: 2,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 23, qty: 1, disc: 0 }, { medIdx: 24, qty: 2, disc: 0 }] },
    { daysAgoVal: 330, custIdx: 3,  method: PaymentMethod.CREDIT, status: InvoiceStatus.PARTIAL, items: [{ medIdx: 17, qty: 3, disc: 0 }, { medIdx: 18, qty: 1, disc: 0 }] },

    // 10 months ago
    { daysAgoVal: 300, custIdx: 4,  method: PaymentMethod.CARD,   status: InvoiceStatus.PAID,   items: [{ medIdx: 20, qty: 2, disc: 0 }, { medIdx: 22, qty: 1, disc: 5 }] },
    { daysAgoVal: 295, custIdx: 5,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 25, qty: 1, disc: 0 }, { medIdx: 26, qty: 1, disc: 0 }] },
    { daysAgoVal: 290, custIdx: null, custName: 'Ramkumar', custPhone: '9111222333', method: PaymentMethod.CASH, status: InvoiceStatus.PAID, items: [{ medIdx: 12, qty: 2, disc: 0 }, { medIdx: 13, qty: 1, disc: 0 }] },
    { daysAgoVal: 285, custIdx: 6,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 14, qty: 1, disc: 0 }, { medIdx: 16, qty: 2, disc: 0 }] },
    { daysAgoVal: 280, custIdx: 7,  method: PaymentMethod.CREDIT, status: InvoiceStatus.PAID,   items: [{ medIdx: 5, qty: 2, disc: 0 }, { medIdx: 7, qty: 1, disc: 0 }] },

    // 8 months ago
    { daysAgoVal: 245, custIdx: 8,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 1, qty: 3, disc: 0 }, { medIdx: 2, qty: 2, disc: 0 }] },
    { daysAgoVal: 240, custIdx: 9,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 27, qty: 1, disc: 0 }, { medIdx: 28, qty: 1, disc: 0 }] },
    { daysAgoVal: 235, custIdx: 10, method: PaymentMethod.CARD,   status: InvoiceStatus.PAID,   items: [{ medIdx: 3, qty: 2, disc: 5 }, { medIdx: 4, qty: 1, disc: 0 }] },
    { daysAgoVal: 230, custIdx: null, custName: 'Seema Bai', custPhone: '9444555666', method: PaymentMethod.CASH, status: InvoiceStatus.PAID, items: [{ medIdx: 11, qty: 2, disc: 0 }] },
    { daysAgoVal: 225, custIdx: 11, method: PaymentMethod.CREDIT, status: InvoiceStatus.PARTIAL, items: [{ medIdx: 20, qty: 3, disc: 0 }, { medIdx: 23, qty: 1, disc: 0 }] },

    // 6 months ago
    { daysAgoVal: 185, custIdx: 12, method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 9, qty: 1, disc: 0 }, { medIdx: 10, qty: 1, disc: 0 }] },
    { daysAgoVal: 180, custIdx: 13, method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 15, qty: 2, disc: 0 }, { medIdx: 16, qty: 2, disc: 0 }] },
    { daysAgoVal: 175, custIdx: 0,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 0, qty: 3, disc: 0 }, { medIdx: 6, qty: 1, disc: 5 }] },
    { daysAgoVal: 170, custIdx: 4,  method: PaymentMethod.CARD,   status: InvoiceStatus.PAID,   items: [{ medIdx: 17, qty: 2, disc: 0 }, { medIdx: 18, qty: 2, disc: 0 }] },
    { daysAgoVal: 165, custIdx: null, custName: 'Rajesh', custPhone: '9777888999', method: PaymentMethod.CASH, status: InvoiceStatus.CANCELLED, items: [{ medIdx: 5, qty: 1, disc: 0 }] },

    // 4 months ago
    { daysAgoVal: 125, custIdx: 14, method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 22, qty: 1, disc: 0 }, { medIdx: 21, qty: 1, disc: 0 }] },
    { daysAgoVal: 120, custIdx: 15, method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 2, qty: 2, disc: 0 }, { medIdx: 3, qty: 1, disc: 0 }] },
    { daysAgoVal: 115, custIdx: 16, method: PaymentMethod.CREDIT, status: InvoiceStatus.PARTIAL, items: [{ medIdx: 18, qty: 3, disc: 0 }, { medIdx: 25, qty: 1, disc: 0 }] },
    { daysAgoVal: 110, custIdx: 1,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 26, qty: 1, disc: 0 }, { medIdx: 27, qty: 1, disc: 0 }] },
    { daysAgoVal: 105, custIdx: 17, method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 29, qty: 1, disc: 0 }, { medIdx: 30, qty: 1, disc: 0 }] },

    // 2 months ago
    { daysAgoVal: 62,  custIdx: 18, method: PaymentMethod.CARD,   status: InvoiceStatus.PAID,   items: [{ medIdx: 20, qty: 2, disc: 0 }, { medIdx: 22, qty: 1, disc: 5 }] },
    { daysAgoVal: 58,  custIdx: 19, method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 9, qty: 1, disc: 0 }] },
    { daysAgoVal: 55,  custIdx: 0,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 0, qty: 2, disc: 0 }, { medIdx: 11, qty: 2, disc: 0 }] },
    { daysAgoVal: 52,  custIdx: 4,  method: PaymentMethod.CREDIT, status: InvoiceStatus.PAID,   items: [{ medIdx: 18, qty: 2, disc: 0 }, { medIdx: 20, qty: 3, disc: 0 }] },
    { daysAgoVal: 48,  custIdx: null, custName: 'Hemlata Bai', custPhone: '9666777888', method: PaymentMethod.CASH, status: InvoiceStatus.PAID, items: [{ medIdx: 13, qty: 2, disc: 0 }, { medIdx: 16, qty: 1, disc: 0 }] },

    // Last month
    { daysAgoVal: 28,  custIdx: 7,  method: PaymentMethod.ONLINE, status: InvoiceStatus.PAID,   items: [{ medIdx: 5, qty: 1, disc: 0 }, { medIdx: 8, qty: 1, disc: 0 }] },
    { daysAgoVal: 25,  custIdx: 11, method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 20, qty: 2, disc: 0 }, { medIdx: 23, qty: 1, disc: 0 }] },
    { daysAgoVal: 22,  custIdx: 13, method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 15, qty: 1, disc: 0 }, { medIdx: 17, qty: 2, disc: 0 }] },
    { daysAgoVal: 18,  custIdx: 2,  method: PaymentMethod.CARD,   status: InvoiceStatus.PAID,   items: [{ medIdx: 24, qty: 1, disc: 0 }, { medIdx: 25, qty: 2, disc: 0 }] },
    { daysAgoVal: 15,  custIdx: 5,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 26, qty: 1, disc: 0 }, { medIdx: 28, qty: 1, disc: 0 }] },
    { daysAgoVal: 12,  custIdx: 9,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 29, qty: 1, disc: 0 }, { medIdx: 31, qty: 1, disc: 0 }] },
    { daysAgoVal: 10,  custIdx: 14, method: PaymentMethod.ONLINE, status: InvoiceStatus.PAID,   items: [{ medIdx: 21, qty: 1, disc: 0 }, { medIdx: 22, qty: 1, disc: 5 }] },
    { daysAgoVal: 8,   custIdx: null, custName: 'Sukhram', custPhone: '9555666777', method: PaymentMethod.CASH, status: InvoiceStatus.PAID, items: [{ medIdx: 1, qty: 2, disc: 0 }, { medIdx: 3, qty: 1, disc: 0 }] },

    // This week
    { daysAgoVal: 5,   custIdx: 0,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 0, qty: 2, disc: 0 }, { medIdx: 5, qty: 1, disc: 5 }] },
    { daysAgoVal: 4,   custIdx: 18, method: PaymentMethod.CARD,   status: InvoiceStatus.PAID,   items: [{ medIdx: 20, qty: 3, disc: 0 }, { medIdx: 24, qty: 2, disc: 0 }] },
    { daysAgoVal: 3,   custIdx: 4,  method: PaymentMethod.CREDIT, status: InvoiceStatus.PARTIAL, items: [{ medIdx: 22, qty: 2, disc: 0 }, { medIdx: 18, qty: 1, disc: 0 }] },
    { daysAgoVal: 2,   custIdx: 7,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 6, qty: 1, disc: 0 }, { medIdx: 27, qty: 1, disc: 0 }] },
    { daysAgoVal: 1,   custIdx: 11, method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 17, qty: 2, disc: 0 }, { medIdx: 16, qty: 3, disc: 0 }] },

    // Today
    { daysAgoVal: 0,   custIdx: 1,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 0, qty: 3, disc: 0 }, { medIdx: 11, qty: 2, disc: 0 }] },
    { daysAgoVal: 0,   custIdx: 5,  method: PaymentMethod.CASH,   status: InvoiceStatus.PAID,   items: [{ medIdx: 23, qty: 1, disc: 5 }, { medIdx: 25, qty: 1, disc: 0 }] },
    { daysAgoVal: 0,   custIdx: null, custName: 'Walk-in', custPhone: '9123456780', method: PaymentMethod.CASH, status: InvoiceStatus.PAID, items: [{ medIdx: 9, qty: 1, disc: 0 }, { medIdx: 12, qty: 2, disc: 0 }] },
    { daysAgoVal: 0,   custIdx: 13, method: PaymentMethod.ONLINE, status: InvoiceStatus.PAID,   items: [{ medIdx: 20, qty: 2, disc: 0 }, { medIdx: 18, qty: 2, disc: 0 }] },
    { daysAgoVal: 0,   custIdx: 3,  method: PaymentMethod.UPI,    status: InvoiceStatus.PAID,   items: [{ medIdx: 1, qty: 2, disc: 0 }, { medIdx: 3, qty: 1, disc: 5 }] },
  ];

  let invNum = 1;
  for (const inv of invoiceDefinitions) {
    const invDate = inv.daysAgoVal === 0
      ? new Date()
      : daysAgo(inv.daysAgoVal);

    const customer = inv.custIdx !== null ? customers[inv.custIdx] : null;

    let subtotal = 0;
    let totalTax = 0;
    const lineItems: Array<{
      med: typeof medicines[0];
      qty: number;
      disc: number;
      lineTotal: number;
      lineTax: number;
      taxable: number;
    }> = [];

    for (const item of inv.items) {
      if (item.medIdx >= medicines.length) continue;
      const med = medicines[item.medIdx];
      const lineAmt = med.sellingPrice.toNumber() * item.qty;
      const discAmt = lineAmt * (item.disc / 100);
      const taxable = lineAmt - discAmt;
      const gst = med.gstPercentage.toNumber();
      const lineTax = taxable * (gst / 100);
      lineItems.push({ med, qty: item.qty, disc: item.disc, lineTotal: taxable + lineTax, lineTax, taxable });
      subtotal += taxable;
      totalTax += lineTax;
    }

    if (lineItems.length === 0) continue;

    const totalAmount = subtotal + totalTax;
    const paidAmount = inv.status === InvoiceStatus.PAID ? totalAmount
      : inv.status === InvoiceStatus.PARTIAL ? totalAmount * 0.5
      : inv.status === InvoiceStatus.CANCELLED ? 0
      : totalAmount;
    const balanceAmount = totalAmount - paidAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${String(invNum++).padStart(4, '0')}`,
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? inv.custName ?? 'Walk-in',
        customerPhone: customer?.phone ?? inv.custPhone ?? null,
        userId: pick([adminUser.id, pharmacistUser.id, cashierUser.id]),
        invoiceDate: invDate,
        status: inv.status,
        subtotal,
        taxableAmount: subtotal,
        totalTax,
        cgstAmount: totalTax / 2,
        sgstAmount: totalTax / 2,
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentMethod: inv.method,
        isGstInvoice: true,
        cancelReason: inv.status === InvoiceStatus.CANCELLED ? 'Patient returned medicine' : null,
        createdAt: invDate,
        updatedAt: invDate,
      }
    });

    for (const li of lineItems) {
      const gst = li.med.gstPercentage.toNumber();
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          medicineId: li.med.id,
          medicineName: li.med.medicineName,
          batchNumber: li.med.batchNumber,
          expiryDate: li.med.expiryDate,
          quantity: li.qty,
          mrp: li.med.mrp,
          sellingPrice: li.med.sellingPrice,
          discountPercent: li.disc,
          discountAmount: li.med.sellingPrice.toNumber() * li.qty * (li.disc / 100),
          taxableAmount: li.taxable,
          gstPercentage: gst,
          cgstAmount: li.lineTax / 2,
          sgstAmount: li.lineTax / 2,
          totalAmount: li.lineTotal,
          hsnCode: '30049099',
        }
      });

      if (inv.status !== InvoiceStatus.CANCELLED) {
        await prisma.stockMovement.create({
          data: {
            medicineId: li.med.id,
            movementType: StockMovementType.SALE,
            quantity: -li.qty,
            balanceAfter: Math.max(0, li.med.stockQuantity - li.qty),
            referenceId: invoice.id,
            referenceType: 'invoice',
            batchNumber: li.med.batchNumber,
            notes: `Sale - ${invoice.invoiceNumber}`,
            userId: invoice.userId,
            createdAt: invDate,
          }
        });
      }
    }

    if (paidAmount > 0) {
      await prisma.paymentTransaction.create({
        data: {
          invoiceId: invoice.id,
          customerId: customer?.id ?? null,
          amount: paidAmount,
          paymentMethod: inv.method,
          createdAt: invDate,
        }
      });
    }
  }
  console.log(`   → ${invNum - 1} invoices created`);

  // ── 6. EXPIRY ALERTS ──────────────────────────────────────────────────────
  console.log('⚠️  Creating expiry alerts...');

  const expiringMeds = medicines.filter(m => {
    const days = Math.ceil((m.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30;
  });

  for (const med of expiringMeds) {
    const days = Math.ceil((med.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    await prisma.expiryAlert.create({
      data: {
        medicineId: med.id,
        expiryDate: med.expiryDate!,
        daysToExpiry: days,
        stockQty: med.stockQuantity,
        status: 'ACTIVE',
      }
    });
  }
  console.log(`   → ${expiringMeds.length} expiry alerts created`);

  // ── 7. AUDIT LOGS ─────────────────────────────────────────────────────────
  console.log('📋 Creating audit logs...');

  const auditEntries = [
    { user: adminUser.id, action: 'LOGIN' as const, table: 'users', desc: 'Admin logged in', daysAgoVal: 1, ip: '192.168.1.100' },
    { user: pharmacistUser.id, action: 'LOGIN' as const, table: 'users', desc: 'Pharmacist logged in', daysAgoVal: 0, ip: '192.168.1.101' },
    { user: cashierUser.id, action: 'LOGIN' as const, table: 'users', desc: 'Cashier logged in', daysAgoVal: 0, ip: '192.168.1.102' },
    { user: adminUser.id, action: 'CREATE' as const, table: 'medicines', desc: 'Added new medicine: Dolo 650', daysAgoVal: 30, ip: '192.168.1.100' },
    { user: adminUser.id, action: 'CREATE' as const, table: 'suppliers', desc: 'Added supplier: Sun Pharmaceuticals', daysAgoVal: 35, ip: '192.168.1.100' },
    { user: pharmacistUser.id, action: 'CREATE' as const, table: 'invoices', desc: 'Created invoice INV-0001', daysAgoVal: 0, ip: '192.168.1.101' },
    { user: cashierUser.id, action: 'CREATE' as const, table: 'invoices', desc: 'Created invoice INV-0002', daysAgoVal: 0, ip: '192.168.1.102' },
    { user: adminUser.id, action: 'CREATE' as const, table: 'purchases', desc: 'Created purchase order PO-0001', daysAgoVal: 5, ip: '192.168.1.100' },
    { user: adminUser.id, action: 'UPDATE' as const, table: 'medicines', desc: 'Updated stock for Ciprofloxacin 500', daysAgoVal: 2, ip: '192.168.1.100' },
    { user: adminUser.id, action: 'EXPORT' as const, table: 'invoices', desc: 'Exported sales report', daysAgoVal: 7, ip: '192.168.1.100' },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        userId: entry.user,
        action: entry.action,
        tableName: entry.table,
        description: entry.desc,
        ipAddress: entry.ip,
        createdAt: daysAgo(entry.daysAgoVal),
      }
    });
  }
  console.log(`   → ${auditEntries.length} audit logs created`);

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Suppliers  : ${suppliers.length}`);
  console.log(`   Medicines  : ${medicines.length}`);
  console.log(`   Customers  : ${customers.length}`);
  console.log(`   Purchases  : ${purchaseNum - 1}`);
  console.log(`   Invoices   : ${invNum - 1}`);
  console.log(`   Expiry Alerts: ${expiringMeds.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
