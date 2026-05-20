import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Search, X, Loader2, Package, Trash2, Eye } from 'lucide-react';
import api from '@/api/axios';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PurchaseRow {
  id: string;
  purchaseNumber: string;
  supplier: { name: string; phone: string };
  _count: { items: number };
  totalAmount: number;
  status: string;
  purchaseDate: string;
}

interface PurchaseItem {
  id: string;
  medicineName: string;
  batchNumber: string | null;
  expiryDate: string | null;
  quantity: number;
  freeQuantity: number;
  purchasePrice: number;
  mrp: number;
  gstPercentage: number;
  totalAmount: number;
}

interface PurchaseDetail {
  purchaseNumber: string;
  purchaseDate: string;
  status: string;
  paymentMethod: string;
  supplier: { name: string; phone: string };
  invoiceNumber: string | null;
  user: { fullName: string };
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  balanceAmount: number;
  notes: string | null;
  items: PurchaseItem[];
}

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [medSearch, setMedSearch] = useState('');
  const [itemMedSearch, setItemMedSearch] = useState<{ [key: number]: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page, search],
    queryFn: () => api.get('/purchases', { params: { page, limit: 15, search: search || undefined } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const { data: medResults } = useQuery({
    queryKey: ['med-search-purchase', medSearch],
    queryFn: () => api.get('/medicines', { params: { search: medSearch, limit: 10 } }).then((r) => r.data.data),
    enabled: medSearch.length >= 2,
  });

  const { data: viewDetail, isLoading: viewLoading } = useQuery<PurchaseDetail>({
    queryKey: ['purchase-detail', viewId],
    queryFn: () => api.get(`/purchases/${viewId}`).then((r) => r.data.data),
    enabled: !!viewId,
  });

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      supplierId: '', invoiceNumber: '', invoiceDate: '', paymentMethod: 'CREDIT', notes: '',
      items: [{ medicineId: '', medicineName: '', quantity: 1, freeQuantity: 0, purchasePrice: 0, mrp: 0, sellingPrice: 0, gstPercentage: 12, batchNumber: '', expiryDate: '', hsnCode: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post('/purchases', data),
    onSuccess: () => {
      toast.success('Purchase recorded, stock updated');
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowForm(false);
      reset();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const purchases = data?.data || [];
  const meta = data?.meta || {};

  const addItem = () => append({ medicineId: '', medicineName: '', quantity: 1, freeQuantity: 0, purchasePrice: 0, mrp: 0, sellingPrice: 0, gstPercentage: 12, batchNumber: '', expiryDate: '', hsnCode: '' });

  const selectMedicine = (idx: number, med: Record<string, unknown>) => {
    setValue(`items.${idx}.medicineId`, med.id as string);
    setValue(`items.${idx}.medicineName`, med.medicineName as string);
    setValue(`items.${idx}.purchasePrice`, Number(med.purchasePrice));
    setValue(`items.${idx}.mrp`, Number(med.mrp));
    setValue(`items.${idx}.sellingPrice`, Number(med.sellingPrice));
    setValue(`items.${idx}.gstPercentage`, Number(med.gstPercentage));
    setValue(`items.${idx}.batchNumber`, med.batchNumber as string || '');
    setItemMedSearch({ ...itemMedSearch, [idx]: '' });
    setMedSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="text-muted-foreground text-sm">{meta.total || 0} purchase orders</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Purchase
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search purchase orders..." className="pl-9" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && ['sk-1','sk-2','sk-3','sk-4','sk-5'].map((key) => (
                <tr key={key}><td colSpan={7}><div className="h-8 animate-shimmer rounded my-1" /></td></tr>
              ))}
              {!isLoading && purchases.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-2 opacity-30" />No purchases found</td></tr>
              )}
              {!isLoading && (purchases as PurchaseRow[]).map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs font-semibold">{p.purchaseNumber}</td>
                  <td>
                    <p className="font-medium">{p.supplier?.name}</p>
                    <p className="text-xs text-muted-foreground">{p.supplier?.phone}</p>
                  </td>
                  <td>{p._count?.items || 0} items</td>
                  <td className="font-semibold">{formatCurrency(p.totalAmount)}</td>
                  <td>
                    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', p.status === 'RECEIVED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400')}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-muted-foreground">{formatDate(p.purchaseDate)}</td>
                  <td>
                    <button onClick={() => setViewId(p.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* View Purchase Modal */}
      {viewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Purchase Order Details</h2>
              <button onClick={() => setViewId(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            {viewLoading && (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            )}
            {!viewLoading && viewDetail && (
              <div className="p-6 space-y-6">
                {/* Header info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ['PO Number',       viewDetail.purchaseNumber],
                    ['Date',            formatDate(viewDetail.purchaseDate)],
                    ['Status',          viewDetail.status],
                    ['Payment Method',  viewDetail.paymentMethod],
                    ['Supplier',        viewDetail.supplier?.name],
                    ['Supplier Phone',  viewDetail.supplier?.phone || '—'],
                    ['Supplier Invoice',viewDetail.invoiceNumber || '—'],
                    ['Recorded By',     viewDetail.user?.fullName],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm font-medium">{value as string}</p>
                    </div>
                  ))}
                </div>

                {/* Items table */}
                <div>
                  <h3 className="font-semibold mb-3">Items</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="text-left px-3 py-2 font-medium">#</th>
                          <th className="text-left px-3 py-2 font-medium">Medicine</th>
                          <th className="text-left px-3 py-2 font-medium">Batch</th>
                          <th className="text-left px-3 py-2 font-medium">Expiry</th>
                          <th className="text-right px-3 py-2 font-medium">Qty</th>
                          <th className="text-right px-3 py-2 font-medium">Free</th>
                          <th className="text-right px-3 py-2 font-medium">Purchase Price</th>
                          <th className="text-right px-3 py-2 font-medium">MRP</th>
                          <th className="text-right px-3 py-2 font-medium">GST%</th>
                          <th className="text-right px-3 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDetail.items?.map((item, i) => (
                          <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{item.medicineName}</td>
                            <td className="px-3 py-2 text-muted-foreground">{item.batchNumber || '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.expiryDate ? formatDate(item.expiryDate) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{item.freeQuantity || 0}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.purchasePrice)}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(item.mrp)}</td>
                            <td className="px-3 py-2 text-right">{item.gstPercentage}%</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(viewDetail.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(viewDetail.taxAmount)}</span></div>
                    <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                      <span>Total</span><span>{formatCurrency(viewDetail.totalAmount)}</span>
                    </div>
                    {viewDetail.balanceAmount > 0 && (
                      <div className="flex justify-between text-destructive font-medium">
                        <span>Balance Due</span><span>{formatCurrency(viewDetail.balanceAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {viewDetail.notes && (
                  <p className="text-sm text-muted-foreground border-t border-border pt-4">Notes: {viewDetail.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Purchase Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Purchase Order</h2>
              <button onClick={() => { setShowForm(false); reset(); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-6">
              {/* Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Supplier *</Label>
                  <select {...register('supplierId', { required: true })} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm">
                    <option value="">Select supplier</option>
                    {(suppliersData || []).map((s: Record<string, string>) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.supplierId && <p className="text-xs text-destructive">Required</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Supplier Invoice #</Label>
                  <Input {...register('invoiceNumber')} placeholder="Supplier's invoice number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Date</Label>
                  <Input {...register('invoiceDate')} type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <select {...register('paymentMethod')} className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm">
                    <option value="CREDIT">Credit</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Notes</Label>
                  <Input {...register('notes')} placeholder="Optional notes" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Purchase Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-1.5">
                          <Label>Medicine *</Label>
                          <div className="relative">
                            <Input
                              value={itemMedSearch[idx] || watch(`items.${idx}.medicineName`) || ''}
                              onChange={(e) => { setItemMedSearch({ ...itemMedSearch, [idx]: e.target.value }); setMedSearch(e.target.value); }}
                              placeholder="Search medicine..."
                            />
                            {medSearch.length >= 2 && itemMedSearch[idx] && (
                              <div className="absolute top-10 left-0 right-0 bg-card border border-border rounded-lg shadow-soft z-10 max-h-40 overflow-y-auto">
                                {(medResults || []).map((med: Record<string, unknown>) => (
                                  <button key={med.id as string} type="button" onClick={() => selectMedicine(idx, med)}
                                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0">
                                    <span className="font-medium">{med.medicineName as string}</span>
                                    <span className="text-xs text-muted-foreground ml-2">• {med.medicineType as string}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <input type="hidden" {...register(`items.${idx}.medicineId`, { required: true })} />
                          {errors.items?.[idx]?.medicineId && <p className="text-xs text-destructive">Select a medicine from the list</p>}
                        </div>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="mt-6 p-1.5 rounded hover:bg-destructive/10 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Batch #</Label><Input {...register(`items.${idx}.batchNumber`)} placeholder="Batch" className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">Expiry</Label><Input {...register(`items.${idx}.expiryDate`)} type="date" className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">Qty *</Label><Input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min={1} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">Free Qty</Label><Input {...register(`items.${idx}.freeQuantity`, { valueAsNumber: true })} type="number" min={0} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">Purchase Price *</Label><Input {...register(`items.${idx}.purchasePrice`, { valueAsNumber: true })} type="number" step="0.01" className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">MRP</Label><Input {...register(`items.${idx}.mrp`, { valueAsNumber: true })} type="number" step="0.01" className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">Selling Price</Label><Input {...register(`items.${idx}.sellingPrice`, { valueAsNumber: true })} type="number" step="0.01" className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">GST %</Label>
                          <select {...register(`items.${idx}.gstPercentage`, { valueAsNumber: true })} className="w-full h-8 px-2 rounded border border-border bg-background text-sm">
                            {[0,5,12,18,28].map((r) => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">HSN Code</Label><Input {...register(`items.${idx}.hsnCode`)} placeholder="HSN" className="h-8 text-sm" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset(); }} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Purchase
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
