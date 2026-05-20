import { create } from 'zustand';

export interface POSItem {
  medicineId: string;
  medicineName: string;
  batchNumber?: string;
  expiryDate?: string;
  barcode?: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  freeQuantity: number;
  discountPercent: number;
  gstPercentage: number;
  hsnCode?: string;
  // calculated
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

interface POSState {
  items: POSItem[];
  customerId: string | null;
  customerName: string | null;
  customerPhone: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'CHEQUE' | 'CREDIT' | 'ONLINE';
  paymentReference: string;
  discountPercent: number;
  paidAmount: number;
  doctorName: string;
  prescriptionNo: string;
  notes: string;

  addItem: (item: Omit<POSItem, 'discountAmount' | 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'totalAmount'>) => void;
  updateItem: (medicineId: string, updates: Partial<POSItem>) => void;
  removeItem: (medicineId: string) => void;
  setCustomer: (id: string | null, name: string | null, phone?: string) => void;
  setPaymentMethod: (method: POSState['paymentMethod']) => void;
  setPaymentReference: (ref: string) => void;
  setDiscountPercent: (pct: number) => void;
  setPaidAmount: (amount: number) => void;
  setField: (field: string, value: string) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTaxableAmount: () => number;
  getCgstTotal: () => number;
  getSgstTotal: () => number;
  getTotalAmount: () => number;
  getBalanceAmount: () => number;
}

const calcItemTotals = (item: Omit<POSItem, 'discountAmount' | 'taxableAmount' | 'cgstAmount' | 'sgstAmount' | 'totalAmount'>): POSItem => {
  const billQty = item.quantity - item.freeQuantity;
  const baseAmount = item.sellingPrice * billQty;
  const discAmt = (baseAmount * (item.discountPercent || 0)) / 100;
  const taxableAmt = baseAmount - discAmt;
  const cgst = (taxableAmt * item.gstPercentage) / 200;
  const sgst = (taxableAmt * item.gstPercentage) / 200;
  return {
    ...item,
    discountAmount: discAmt,
    taxableAmount: taxableAmt,
    cgstAmount: cgst,
    sgstAmount: sgst,
    totalAmount: taxableAmt + cgst + sgst,
  };
};

export const usePOSStore = create<POSState>()((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  customerPhone: '',
  paymentMethod: 'CASH',
  paymentReference: '',
  discountPercent: 0,
  paidAmount: 0,
  doctorName: '',
  prescriptionNo: '',
  notes: '',

  addItem: (item) => {
    const existing = get().items.find((i) => i.medicineId === item.medicineId);
    if (existing) {
      set((state) => ({
        items: state.items.map((i) =>
          i.medicineId === item.medicineId
            ? calcItemTotals({ ...i, quantity: i.quantity + 1 })
            : i
        ),
      }));
    } else {
      set((state) => ({ items: [...state.items, calcItemTotals(item)] }));
    }
  },
  updateItem: (medicineId, updates) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.medicineId === medicineId ? calcItemTotals({ ...i, ...updates }) : i
      ),
    }));
  },
  removeItem: (medicineId) =>
    set((state) => ({ items: state.items.filter((i) => i.medicineId !== medicineId) })),
  setCustomer: (id, name, phone = '') => set({ customerId: id, customerName: name, customerPhone: phone }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setPaymentReference: (ref) => set({ paymentReference: ref }),
  setDiscountPercent: (pct) => set({ discountPercent: pct }),
  setPaidAmount: (amount) => set({ paidAmount: amount }),
  setField: (field, value) => set((state) => ({ ...state, [field]: value })),
  clearCart: () =>
    set({
      items: [], customerId: null, customerName: null, customerPhone: '',
      paymentMethod: 'CASH', paymentReference: '', discountPercent: 0,
      paidAmount: 0, doctorName: '', prescriptionNo: '', notes: '',
    }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.sellingPrice * (i.quantity - i.freeQuantity), 0),
  getDiscountAmount: () => {
    const itemDisc = get().items.reduce((sum, i) => sum + i.discountAmount, 0);
    const overallDisc = (get().getSubtotal() - itemDisc) * (get().discountPercent / 100);
    return itemDisc + overallDisc;
  },
  getTaxableAmount: () => get().items.reduce((sum, i) => sum + i.taxableAmount, 0),
  getCgstTotal: () => get().items.reduce((sum, i) => sum + i.cgstAmount, 0),
  getSgstTotal: () => get().items.reduce((sum, i) => sum + i.sgstAmount, 0),
  getTotalAmount: () => {
    const subtotal = get().getSubtotal();
    const discountAmt = (subtotal * get().discountPercent) / 100;
    const itemTax = get().getCgstTotal() + get().getSgstTotal();
    return subtotal - discountAmt + itemTax;
  },
  getBalanceAmount: () => Math.max(0, get().getTotalAmount() - get().paidAmount),
}));
