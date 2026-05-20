import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, ShoppingCart, X, Minus, Plus, CreditCard, Banknote, Smartphone, Printer, Check, Loader2, User, Scan, UserPlus } from 'lucide-react';
import api from '@/api/axios';
import { usePOSStore } from '@/store/pos.store';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PAYMENT_METHODS = [
  { id: 'CASH',   label: 'Cash',   icon: Banknote,    color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
  { id: 'UPI',    label: 'UPI',    icon: Smartphone,  color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' },
  { id: 'CARD',   label: 'Card',   icon: CreditCard,  color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  { id: 'CREDIT', label: 'Credit', icon: User,        color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' },
];

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [successInvoice, setSuccessInvoice] = useState<Record<string, unknown> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const store = usePOSStore();
  const isCustomerSet = store.customerId !== null || store.customerName !== null;

  // Medicine search
  const { data: medicineResults, isLoading: searchLoading } = useQuery({
    queryKey: ['medicine-search', searchTerm],
    queryFn: () => api.get('/medicines', { params: { search: searchTerm, limit: 8 } }).then((r) => r.data.data),
    enabled: searchTerm.length >= 2,
  });

  // Customer search — triggers at 2+ chars
  const { data: customerResults } = useQuery({
    queryKey: ['customer-search', customerSearch],
    queryFn: () => api.get('/customers', { params: { search: customerSearch, limit: 5 } }).then((r) => r.data.data),
    enabled: customerSearch.length >= 2,
  });

  const handleBarcodeSearch = useCallback(async (barcode: string) => {
    try {
      const response = await api.get(`/medicines/barcode/${barcode}`);
      addMedicineToCart(response.data.data);
      setSearchTerm('');
    } catch {
      toast.error('Medicine not found for barcode: ' + barcode);
    }
  }, []);

  const addMedicineToCart = (med: Record<string, unknown>) => {
    store.addItem({
      medicineId:    String(med.id),
      medicineName:  String(med.medicineName),
      batchNumber:   med.batchNumber  ? String(med.batchNumber)  : undefined,
      expiryDate:    med.expiryDate   ? new Date(String(med.expiryDate)).toISOString().split('T')[0] : undefined,
      barcode:       med.barcode      ? String(med.barcode)      : undefined,
      mrp:           Number(med.mrp),
      sellingPrice:  Number(med.sellingPrice),
      quantity:      1,
      freeQuantity:  0,
      discountPercent: 0,
      gstPercentage: Number(med.gstPercentage),
      hsnCode:       med.hsnCode ? String(med.hsnCode) : undefined,
    });
    setShowSearch(false);
    setSearchTerm('');
    toast.success(`${String(med.medicineName)} added to cart`, { duration: 1000 });
  };

  const createInvoiceMutation = useMutation({
    mutationFn: (invoiceData: unknown) => api.post('/invoices', invoiceData),
    onSuccess: (res) => {
      setSuccessInvoice(res.data.data);
      store.clearCart();
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Invoice created successfully!');
    },
    onError: (e: unknown) => {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create invoice');
    },
  });

  const handleCheckout = () => {
    // usePOSStore.getState() bypasses stale closure: useEffect only re-runs on items change,
    // so a customer selected after the last cart item would be invisible to the F9 handler.
    const s = usePOSStore.getState();
    if (s.items.length === 0) { toast.error('Cart is empty'); return; }
    const total = s.getTotalAmount();
    if (s.paymentMethod !== 'CREDIT' && s.paidAmount < total) {
      toast.error('Paid amount is less than total');
      return;
    }
    createInvoiceMutation.mutate({
      customerId:    s.customerId  || undefined,
      customerName:  s.customerId  ? undefined : (s.customerName  || undefined),
      customerPhone: s.customerId  ? undefined : (s.customerPhone || undefined),
      paymentMethod: s.paymentMethod,
      paymentReference: s.paymentReference || undefined,
      discountPercent:  s.discountPercent,
      notes:            s.notes         || undefined,
      prescriptionNo:   s.prescriptionNo || undefined,
      doctorName:       s.doctorName     || undefined,
      paidAmount: s.paymentMethod === 'CREDIT' ? 0 : s.paidAmount || total,
      items: s.items.map((item) => ({
        medicineId:     item.medicineId,
        quantity:       item.quantity,
        freeQuantity:   item.freeQuantity,
        sellingPrice:   item.sellingPrice,
        mrp:            item.mrp,
        discountPercent: item.discountPercent,
        gstPercentage:  item.gstPercentage,
        batchNumber:    item.batchNumber,
        expiryDate:     item.expiryDate,
        hsnCode:        item.hsnCode,
      })),
    });
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const w = globalThis.open(url, '_blank');
      if (w) { w.onload = () => w.print(); }
    } catch { toast.error('Failed to generate PDF'); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2')     { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }
      if (e.key === 'F9')     { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') { setShowSearch(false); setSuccessInvoice(null); }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [store.items]);

  const subtotal    = store.getSubtotal();
  const discountAmt = (subtotal * store.discountPercent) / 100;
  const cgst        = store.getCgstTotal();
  const sgst        = store.getSgstTotal();
  const total       = store.getTotalAmount();
  const balance     = store.getBalanceAmount();

  // Avoids nested ternary in JSX (SonarLint S3358)
  let medicineSearchContent: ReactNode;
  if (searchLoading) {
    medicineSearchContent = (
      <div className="p-4 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Searching...
      </div>
    );
  } else if ((medicineResults || []).length === 0) {
    medicineSearchContent = <div className="p-4 text-sm text-muted-foreground">No medicines found</div>;
  } else {
    medicineSearchContent = (
      <div className="max-h-72 overflow-y-auto">
        {(medicineResults || []).map((med: Record<string, unknown>) => (
          <button key={String(med.id)} onClick={() => addMedicineToCart(med)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{String(med.medicineName)}</p>
              <p className="text-xs text-muted-foreground">
                {String(med.genericName || '')} • {String(med.medicineType)} • Stock: {Number(med.stockQuantity)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm">{formatCurrency(Number(med.sellingPrice))}</p>
              <p className="text-xs text-muted-foreground">MRP: {formatCurrency(Number(med.mrp))}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-4 overflow-hidden">
      {/* Left: Medicine Search & Cart */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Search Bar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.length > 5 && /^\d+$/.test(searchTerm)) {
                  handleBarcodeSearch(searchTerm);
                }
              }}
              placeholder="F2 — Search medicine by name or scan barcode (Enter for barcode)"
              className="pl-9 h-11 text-base"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setShowSearch(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button className="flex items-center gap-2 h-11 px-4 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border">
            <Scan className="w-4 h-4" /> Barcode
          </button>
        </div>

        {/* Medicine Search Results */}
        {showSearch && searchTerm.length >= 2 && (
          <div className="relative z-20 mb-2">
            <div className="absolute top-0 left-0 right-0 bg-card border border-border rounded-xl shadow-soft overflow-hidden">
              {medicineSearchContent}
            </div>
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden shadow-card flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({store.items.length} items)
            </h3>
            {store.items.length > 0 && (
              <button onClick={store.clearCart} className="text-xs text-destructive hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>

          {store.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Press F2 or search to add medicines</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Medicine</th>
                    <th className="px-2 py-2 text-center font-medium w-24">Qty</th>
                    <th className="px-2 py-2 text-center font-medium w-20">Price</th>
                    <th className="px-2 py-2 text-center font-medium w-16">Disc%</th>
                    <th className="px-2 py-2 text-right font-medium w-24">Amount</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {store.items.map((item) => (
                    <tr key={item.medicineId} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium">{item.medicineName}</p>
                        <p className="text-xs text-muted-foreground">MRP: {formatCurrency(item.mrp)} | GST: {item.gstPercentage}%</p>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => item.quantity > 1 && store.updateItem(item.medicineId, { quantity: item.quantity - 1 })}
                            className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-muted-foreground">
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => store.updateItem(item.medicineId, { quantity: Math.max(1, Number.parseInt(e.target.value) || 1) })}
                            className="w-10 text-center text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none h-6"
                          />
                          <button onClick={() => store.updateItem(item.medicineId, { quantity: item.quantity + 1 })}
                            className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-muted-foreground">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) => store.updateItem(item.medicineId, { sellingPrice: Number.parseFloat(e.target.value) || 0 })}
                          className="w-full text-center text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none h-7 px-1"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={item.discountPercent}
                          min={0} max={100}
                          onChange={(e) => store.updateItem(item.medicineId, { discountPercent: Number.parseFloat(e.target.value) || 0 })}
                          className="w-full text-center text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary outline-none h-7 px-1"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <p className="text-sm font-semibold">{formatCurrency(item.totalAmount)}</p>
                        {item.cgstAmount > 0 && <p className="text-xs text-muted-foreground">GST: {formatCurrency(item.cgstAmount + item.sgstAmount)}</p>}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => store.removeItem(item.medicineId)}
                          className="w-6 h-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right: Billing Panel */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto scrollbar-hide">

        {/* ── Customer ── */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-card">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Customer (Optional)</Label>

          {isCustomerSet ? (
            /* Selected customer card */
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {store.customerId
                    ? <User     className="w-4 h-4 text-green-600 shrink-0" />
                    : <UserPlus className="w-4 h-4 text-blue-600  shrink-0" />
                  }
                  <span className="text-sm font-medium truncate">{store.customerName}</span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0',
                    store.customerId
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
                  )}>
                    {store.customerId ? 'Registered' : 'New'}
                  </span>
                </div>
                <button
                  onClick={() => store.setCustomer(null, null)}
                  className="text-muted-foreground hover:text-destructive ml-2 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Registered — show phone if available */}
              {store.customerId && store.customerPhone && (
                <p className="text-xs text-muted-foreground px-1">📱 {store.customerPhone}</p>
              )}

              {/* New/walk-in — allow entering phone for the invoice */}
              {!store.customerId && (
                <Input
                  value={store.customerPhone}
                  onChange={(e) => store.setField('customerPhone', e.target.value)}
                  placeholder="Phone number (optional)"
                  className="text-sm h-8"
                />
              )}
            </div>
          ) : (
            /* Search / entry view */
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => { if (customerSearch) setShowCustomerDropdown(true); }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                  placeholder="Search or type customer name"
                  className="pl-8 pr-7 text-sm h-9"
                />
                {customerSearch && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setCustomerSearch(''); setShowCustomerDropdown(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {showCustomerDropdown && customerSearch.length >= 2 && (
                <div className="absolute top-10 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-30 overflow-hidden">

                  {/* Existing customers */}
                  {(customerResults || []).length > 0 && (
                    <>
                      <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b border-border">
                        Existing Customers
                      </p>
                      <div className="max-h-36 overflow-y-auto">
                        {(customerResults || []).map((c: Record<string, unknown>) => (
                          <button
                            key={String(c.id)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              store.setCustomer(String(c.id), String(c.name), String(c.phone));
                              setCustomerSearch('');
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center justify-between border-b border-border/50 last:border-0 transition-colors">
                            <span className="text-sm font-medium">{String(c.name)}</span>
                            <span className="text-xs text-muted-foreground">{String(c.phone)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* New customer option — always shown when 2+ chars typed */}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      store.setCustomer(null, customerSearch.trim());
                      setCustomerSearch('');
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-primary/5 flex items-center gap-2 text-primary border-t border-border transition-colors">
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-sm">
                      Use <span className="font-semibold">"{customerSearch.trim()}"</span> as new customer
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prescription Info */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prescription Info</Label>
          <Input value={store.doctorName}    onChange={(e) => store.setField('doctorName',    e.target.value)} placeholder="Doctor name"         className="text-sm h-9" />
          <Input value={store.prescriptionNo} onChange={(e) => store.setField('prescriptionNo', e.target.value)} placeholder="Prescription number" className="text-sm h-9" />
        </div>

        {/* Payment Method */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-card">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Payment Method</Label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button key={pm.id}
                onClick={() => store.setPaymentMethod(pm.id as typeof store.paymentMethod)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                  store.paymentMethod === pm.id
                    ? pm.color + ' border-current ring-1 ring-current'
                    : 'border-border hover:bg-muted text-muted-foreground',
                )}>
                <pm.icon className="w-4 h-4" />
                {pm.label}
              </button>
            ))}
          </div>
          {store.paymentMethod !== 'CASH' && (
            <Input value={store.paymentReference}
              onChange={(e) => store.setField('paymentReference', e.target.value)}
              placeholder="Transaction ref / UPI ID..." className="mt-2 text-sm h-9" />
          )}
        </div>

        {/* Bill Summary */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-card">
          <h3 className="font-semibold text-sm mb-3">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount</span>
              <div className="flex items-center gap-2">
                <input type="number" value={store.discountPercent} min={0} max={100}
                  onChange={(e) => store.setDiscountPercent(Number.parseFloat(e.target.value) || 0)}
                  className="w-14 text-center text-xs border border-border rounded h-6 bg-background focus:ring-1 focus:ring-primary outline-none" />
                <span className="text-xs text-muted-foreground">%</span>
                <span className="text-destructive">-{formatCurrency(discountAmt)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>CGST</span><span>{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>SGST</span><span>{formatCurrency(sgst)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
              <span>Total</span><span className="text-primary">{formatCurrency(total)}</span>
            </div>
            {store.paymentMethod !== 'CREDIT' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <input type="number" value={store.paidAmount || ''}
                    onChange={(e) => store.setPaidAmount(Number.parseFloat(e.target.value) || 0)}
                    placeholder={total.toFixed(2)}
                    className="w-28 text-right text-sm border border-border rounded h-8 px-2 bg-background focus:ring-1 focus:ring-primary outline-none font-medium" />
                </div>
                {balance > 0 && (
                  <div className="flex justify-between text-destructive font-semibold">
                    <span>Balance Due</span><span>{formatCurrency(balance)}</span>
                  </div>
                )}
                {store.paidAmount > total && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Return</span><span>{formatCurrency(store.paidAmount - total)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <Button onClick={handleCheckout} className="w-full mt-4 h-11 text-base font-semibold"
            disabled={store.items.length === 0 || createInvoiceMutation.isPending}>
            {createInvoiceMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              : <><Check   className="w-4 h-4 mr-2" />Create Invoice (F9)</>
            }
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {store.items.length} items • {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Invoice Success Modal */}
      {successInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Invoice Created!</h3>
            <p className="text-muted-foreground mb-1">Invoice Number:</p>
            <p className="text-2xl font-mono font-bold text-primary mb-4">
              {String((successInvoice as { invoiceNumber: string }).invoiceNumber)}
            </p>
            <p className="text-3xl font-bold mb-6">
              {formatCurrency(Number((successInvoice as { totalAmount: number }).totalAmount))}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handlePrintInvoice(String((successInvoice as { id: string }).id))} className="flex-1">
                <Printer className="w-4 h-4 mr-2" /> Print PDF
              </Button>
              <Button onClick={() => setSuccessInvoice(null)} className="flex-1">
                New Bill
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
