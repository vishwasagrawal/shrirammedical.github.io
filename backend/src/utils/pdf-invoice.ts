import PDFDocument from 'pdfkit';
import { Response } from 'express';
import path from 'node:path';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  customer?: { name: string; phone?: string; address?: string } | null;
  items: Array<{
    medicineName: string;
    batchNumber?: string | null;
    expiryDate?: Date | null;
    quantity: number;
    mrp: number;
    sellingPrice: number;
    discountPercent: number;
    gstPercentage: number;
    cgstAmount: number;
    sgstAmount: number;
    totalAmount: number;
    hsnCode?: string | null;
  }>;
  subtotal: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  doctorName?: string | null;
  prescriptionNo?: string | null;
  notes?: string | null;
}

interface PharmacyDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  drugLicense: string;
}

// Helvetica (built-in) doesn't include the ₹ glyph — use Rs. prefix instead
const RS = 'Rs.';

// ── Design tokens ────────────────────────────────────────────────────────────
const BLUE       = '#1D4ED8';
const BLUE_DARK  = '#1E3A8A';
const DARK       = '#111827';
const MID        = '#374151';
const MUTED      = '#6B7280';
const BORDER     = '#D1D5DB';
const ALT_ROW    = '#F9FAFB';
const WHITE      = '#FFFFFF';

// ── Page geometry ────────────────────────────────────────────────────────────
const ML = 40;           // left margin
const MR = 555;          // right edge
const PW = MR - ML;      // printable width = 515
const ROW_H  = 19;
const HEAD_H = 20;

// ── Item table columns (x positions) ─────────────────────────────────────────
// #(18) | Medicine(168) | Batch(58) | Exp(43) | Qty(30) | MRP(48) | GST%(30) | Disc%(28) | Amount(right-align)
const TC = {
  sno:   ML,              // 40
  name:  ML + 20,         // 60   width 168
  batch: ML + 190,        // 230  width 58
  exp:   ML + 250,        // 290  width 43
  qty:   ML + 295,        // 335  width 30
  mrp:   ML + 328,        // 368  width 48
  gst:   ML + 378,        // 418  width 30
  disc:  ML + 410,        // 450  width 28
  amt:   MR,              // 555  right-align
};

export class PDFInvoiceService {
  private static renderItemRow(
    doc: PDFKit.PDFDocument,
    y: number,
    rowIndex: number,
    item: InvoiceData['items'][number],
  ): void {
    if (rowIndex % 2 !== 0) doc.rect(ML, y, PW, ROW_H).fill(ALT_ROW);
    doc.moveTo(ML, y + ROW_H).lineTo(MR, y + ROW_H).strokeColor(BORDER).lineWidth(0.5).stroke();
    const ry = y + 5;
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
      .text(String(rowIndex + 1), TC.sno, ry, { width: 18, align: 'center' });
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
      .text(item.medicineName, TC.name, ry, { width: 162, lineBreak: false, ellipsis: true });
    doc.fillColor(MID).font('Helvetica').fontSize(7.5)
      .text(item.batchNumber || '—', TC.batch, ry, { width: 55 });
    const expStr = item.expiryDate
      ? new Date(item.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })
      : '—';
    doc.text(expStr, TC.exp, ry, { width: 40 });
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
      .text(String(item.quantity), TC.qty, ry, { width: 30, align: 'center' });
    doc.fillColor(MID).font('Helvetica').fontSize(7.5)
      .text(`${RS}${item.mrp.toFixed(2)}`, TC.mrp, ry, { width: 46, align: 'right' });
    doc.text(`${item.gstPercentage}%`, TC.gst, ry, { width: 28, align: 'center' });
    doc.text(item.discountPercent ? `${item.discountPercent}%` : '—', TC.disc, ry, { width: 28, align: 'center' });
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
      .text(`${RS}${item.totalAmount.toFixed(2)}`, TC.amt - 66, ry, { width: 66, align: 'right' });
  }

  private static getPharmacyDetails(): PharmacyDetails {    return {
      name:        process.env.PHARMACY_NAME    || 'Shri Ram Medical Mandla',
      address:     process.env.PHARMACY_ADDRESS || 'Beside District Hospital, Mandla, Madhya Pradesh 481661',
      phone:       process.env.PHARMACY_PHONE   || '+91 8109792325',
      email:       process.env.PHARMACY_EMAIL   || 'info@medstore.pharmacy',
      gstin:       process.env.PHARMACY_GSTIN   || '27AABCU9603R1ZX',
      drugLicense: process.env.PHARMACY_LICENSE || 'DL-MH-123456',
    };
  }

  static async generateInvoicePDF(invoiceData: InvoiceData, res: Response) {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const ph  = this.getPharmacyDetails();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoiceData.invoiceNumber}.pdf"`);
    doc.pipe(res);

    let y = 0;

    // ── 1. HEADER BAR ────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 82).fill(BLUE);

    // Pharmacy name
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(17)
      .text(ph.name, ML, 13, { width: 340 });

    // Address & contact
    doc.font('Helvetica').fontSize(8).fillColor('#BFDBFE')
      .text(ph.address, ML, 36)
      .text(`Ph: ${ph.phone}   |   Email: ${ph.email}`, ML, 47);

    // License line
    doc.fontSize(7.5).fillColor('#93C5FD')
      .text(`GSTIN: ${ph.gstin}   |   Drug Lic: ${ph.drugLicense}`, ML, 58);

    // TAX INVOICE badge (right side of header)
    doc.rect(402, 8, 153, 66)
      .fillAndStroke(BLUE_DARK, '#3B82F6');

    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(13)
      .text('TAX INVOICE', 412, 16, { width: 133, align: 'center' });

    const invDate = new Date(invoiceData.invoiceDate)
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    doc.font('Helvetica').fontSize(8).fillColor('#BFDBFE')
      .text(`No: ${invoiceData.invoiceNumber}`,  412, 36, { width: 133, align: 'center' })
      .text(`Date: ${invDate}`,                  412, 48, { width: 133, align: 'center' })
      .text(`Mode: ${invoiceData.paymentMethod}`,412, 60, { width: 133, align: 'center' });

    y = 90;

    // ── 2. BILL TO / INVOICE DETAILS ─────────────────────────────────────────
    // Left: customer
    doc.rect(ML, y, 250, 60).fillAndStroke('#F8FAFC', BORDER);

    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
      .text('BILL TO', ML + 8, y + 7);

    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9.5)
      .text(invoiceData.customer?.name || 'Walk-in Customer', ML + 8, y + 18, { width: 234 });

    doc.font('Helvetica').fontSize(8).fillColor(MID);
    if (invoiceData.customer?.phone)
      doc.text(`Ph: ${invoiceData.customer.phone}`, ML + 8, y + 31);
    if (invoiceData.customer?.address)
      doc.text(invoiceData.customer.address, ML + 8, y + 42, { width: 230, lineBreak: false, ellipsis: true });

    // Right: invoice meta
    doc.rect(300, y, 255, 60).fillAndStroke('#F8FAFC', BORDER);
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
      .text('INVOICE DETAILS', 308, y + 7);

    const metaRows: [string, string][] = [
      ['Invoice No.',  invoiceData.invoiceNumber],
      ['Date',         invDate],
      ['Payment Mode', invoiceData.paymentMethod],
    ];
    if (invoiceData.doctorName)
      metaRows.push(['Doctor', invoiceData.doctorName]);

    let metaY = y + 18;
    for (const [label, value] of metaRows) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5).text(label, 308, metaY);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
        .text(value, 380, metaY, { width: 165, align: 'right' });
      metaY += 11;
    }

    y += 70;

    // ── 3. ITEMS TABLE ───────────────────────────────────────────────────────
    // Header row
    doc.rect(ML, y, PW, HEAD_H).fill(BLUE);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5);

    doc.text('#',              TC.sno,  y + 6, { width: 18,  align: 'center' });
    doc.text('Medicine Name',  TC.name, y + 6, { width: 162 });
    doc.text('Batch',         TC.batch, y + 6, { width: 55  });
    doc.text('Expiry',        TC.exp,   y + 6, { width: 40  });
    doc.text('Qty',           TC.qty,   y + 6, { width: 30,  align: 'center' });
    doc.text('MRP',           TC.mrp,   y + 6, { width: 46,  align: 'right'  });
    doc.text('GST%',          TC.gst,   y + 6, { width: 28,  align: 'center' });
    doc.text('Disc%',         TC.disc,  y + 6, { width: 28,  align: 'center' });
    doc.text('Amount',        TC.amt - 66, y + 6, { width: 66, align: 'right' });

    y += HEAD_H;

    for (let i = 0; i < invoiceData.items.length; i++) {
      PDFInvoiceService.renderItemRow(doc, y, i, invoiceData.items[i]);

      y += ROW_H;
    }

    y += 12;

    // ── 4. GST SUMMARY (left) + TOTALS (right) ───────────────────────────────
    // Build GST groups
    const gstGroups: Record<number, { taxable: number; cgst: number; sgst: number }> = {};
    for (const item of invoiceData.items) {
      const p = item.gstPercentage;
      if (!gstGroups[p]) gstGroups[p] = { taxable: 0, cgst: 0, sgst: 0 };
      gstGroups[p].taxable += Number(item.totalAmount) - Number(item.cgstAmount) - Number(item.sgstAmount);
      gstGroups[p].cgst    += Number(item.cgstAmount);
      gstGroups[p].sgst    += Number(item.sgstAmount);
    }

    // ── GST summary table (left) ──
    const GST_TBL_W = 280;
    const GST_HDR_H = 16;
    const GST_ROW_H = 14;
    const gstCols   = [ML, ML+36, ML+116, ML+168, ML+220]; // GST%|Taxable|CGST|SGST|Total
    const gstWidths = [34, 78, 50, 50, 58];

    let gy = y;

    doc.rect(ML, gy, GST_TBL_W, GST_HDR_H).fill(MID);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7);
    const gstHdrs = ['GST %', 'Taxable Amt', 'CGST', 'SGST', 'Total Tax'];
    gstHdrs.forEach((h, i) => {
      doc.text(h, gstCols[i] + 3, gy + 4,
        { width: gstWidths[i] - 4, align: i === 0 ? 'left' : 'right' });
    });
    gy += GST_HDR_H;

    for (const [pct, v] of Object.entries(gstGroups)) {
      doc.rect(ML, gy, GST_TBL_W, GST_ROW_H).fillAndStroke(ALT_ROW, BORDER);
      doc.fillColor(DARK).font('Helvetica').fontSize(7.5);
      const vals = [
        `${pct}%`,
        `${RS}${v.taxable.toFixed(2)}`,
        `${RS}${v.cgst.toFixed(2)}`,
        `${RS}${v.sgst.toFixed(2)}`,
        `${RS}${(v.cgst + v.sgst).toFixed(2)}`,
      ];
      vals.forEach((val, i) => {
        doc.text(val, gstCols[i] + 3, gy + 3,
          { width: gstWidths[i] - 4, align: i === 0 ? 'left' : 'right' });
      });
      gy += GST_ROW_H;
    }

    // ── Amount totals (right) ──
    const TX = 360;          // totals block left edge
    const TW = MR - TX;     // 195

    let ty = y;

    const totalRow = (label: string, value: string, isGrand = false) => {
      const rh = isGrand ? 22 : 16;
      if (isGrand) {
        doc.rect(TX, ty, TW, rh).fill(BLUE);
        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
          .text(label, TX + 8, ty + 6)
          .text(value,  TX,     ty + 6, { width: TW - 8, align: 'right' });
      } else {
        doc.moveTo(TX, ty + rh).lineTo(MR, ty + rh)
          .strokeColor(BORDER).lineWidth(0.5).stroke();
        doc.fillColor(MID).font('Helvetica').fontSize(8.5)
          .text(label, TX + 8, ty + 4);
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8.5)
          .text(value, TX, ty + 4, { width: TW - 8, align: 'right' });
      }
      ty += rh;
    };

    totalRow('Subtotal',        `${RS}${invoiceData.subtotal.toFixed(2)}`);
    if (invoiceData.discountAmount > 0)
      totalRow('Discount',     `-${RS}${invoiceData.discountAmount.toFixed(2)}`);
    totalRow('CGST',            `${RS}${invoiceData.cgstAmount.toFixed(2)}`);
    totalRow('SGST',            `${RS}${invoiceData.sgstAmount.toFixed(2)}`);
    totalRow('TOTAL AMOUNT',    `${RS}${invoiceData.totalAmount.toFixed(2)}`, true);
    ty += 2;
    totalRow('Amount Paid',     `${RS}${invoiceData.paidAmount.toFixed(2)}`);
    if (invoiceData.balanceAmount > 0)
      totalRow('Balance Due',  `${RS}${invoiceData.balanceAmount.toFixed(2)}`);

    // ── WhatsApp image (below totals) ──
    try {
      const waImg = path.join(__dirname, '../../../docs/VishwasWatsapp.png');
      const qrX = MR - 76;
      const qrY = ty + 10;
      doc.image(waImg, qrX, qrY, { width: 70 });
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5)
        .text('For Order Watsapp', qrX, qrY + 72, { width: 70, align: 'center' });
    } catch { /* image is optional */ }

    // ── 5. FOOTER ────────────────────────────────────────────────────────────
    const FY = 804;   // fixed footer position on A4 (842pt page)
    doc.rect(0, FY, 595, 38).fill('#F1F5F9');
    doc.moveTo(0, FY).lineTo(595, FY).strokeColor(BORDER).lineWidth(0.5).stroke();

    doc.fillColor(MUTED).font('Helvetica').fontSize(7)
      .text('This is a computer-generated invoice. No signature required.', ML, FY + 5, { width: PW, align: 'center' })
      .text('Goods once sold will not be taken back without valid prescription. Thank you for your visit!', ML, FY + 15, { width: PW, align: 'center' });

    doc.end();
  }
}
