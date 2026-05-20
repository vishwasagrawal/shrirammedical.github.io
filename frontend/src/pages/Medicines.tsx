import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Search, Upload, Download, Edit, Trash2, Package, X, Loader2, AlertTriangle, Clock, Barcode, LayoutGrid, List } from 'lucide-react';
import api from '@/api/axios';
import { formatCurrency, formatDate, getExpiryStatus, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const medicineSchema = z.object({
  medicineName: z.string().min(1, 'Required'),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  medicineType: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'POWDER', 'GEL', 'CREAM', 'OTHER']),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  mrp: z.coerce.number().min(0, 'Required'),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0, 'Required'),
  gstPercentage: z.coerce.number().min(0).max(28).default(12),
  stockQuantity: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(10),
  barcode: z.string().optional(),
  rackLocation: z.string().optional(),
  unit: z.string().default('STRIP'),
  hsnCode: z.string().optional(),
  isPrescriptionRequired: z.boolean().default(false),
});

type MedicineFormData = z.infer<typeof medicineSchema>;

const MEDICINE_TYPES = ['TABLET','CAPSULE','SYRUP','INJECTION','OINTMENT','DROPS','INHALER','POWDER','GEL','CREAM','OTHER'];
const GST_RATES = [0, 5, 12, 18, 28];

const TYPE_COLORS: Record<string, string> = {
  TABLET: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  CAPSULE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  SYRUP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  INJECTION: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  OINTMENT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export default function MedicinesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MedicineFormData & { id?: string } | null>(null);
  const [filterMode, setFilterMode] = useState<'' | 'lowStock' | 'expiringSoon'>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', page, search, categoryFilter, filterMode],
    queryFn: () => api.get('/medicines', {
      params: { page, limit: 20, search: search || undefined, categoryId: categoryFilter || undefined,
        lowStock: filterMode === 'lowStock' ? 'true' : undefined,
        expiringSoon: filterMode === 'expiringSoon' ? 'true' : undefined },
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<MedicineFormData>({
    resolver: zodResolver(medicineSchema),
    defaultValues: { medicineType: 'TABLET', gstPercentage: 12, stockQuantity: 0, reorderLevel: 10, unit: 'STRIP' },
  });

  const createMutation = useMutation({
    mutationFn: (data: MedicineFormData) => api.post('/medicines', data),
    onSuccess: () => { toast.success('Medicine added'); queryClient.invalidateQueries({ queryKey: ['medicines'] }); closeForm(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: MedicineFormData & { id: string }) => api.put(`/medicines/${data.id}`, data),
    onSuccess: () => { toast.success('Medicine updated'); queryClient.invalidateQueries({ queryKey: ['medicines'] }); closeForm(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/medicines/${id}`),
    onSuccess: () => { toast.success('Medicine deleted'); queryClient.invalidateQueries({ queryKey: ['medicines'] }); },
  });

  const closeForm = () => { setShowForm(false); setEditItem(null); reset(); };

  const onEdit = (med: Record<string, unknown>) => {
    setEditItem(med as unknown as MedicineFormData & { id: string });
    Object.entries(med).forEach(([k, v]) => setValue(k as keyof MedicineFormData, v as never));
    if (med.expiryDate) setValue('expiryDate', new Date(med.expiryDate as string).toISOString().split('T')[0]);
    setShowForm(true);
  };

  const onSubmit = (data: MedicineFormData) => {
    if (editItem?.id) updateMutation.mutate({ ...data, id: editItem.id });
    else createMutation.mutate(data);
  };

  const handleExport = async () => {
    const response = await api.get('/medicines/export/excel', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a'); a.href = url;
    a.download = 'medicines.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const medicines = data?.data || [];
  const meta = data?.meta || {};

  const expiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const status = getExpiryStatus(expiryDate);
    if (status === 'expired') return <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 rounded-full px-1.5 py-0.5 font-semibold"><Clock className="w-2.5 h-2.5" />Expired</span>;
    if (status === 'critical') return <span className="inline-flex items-center gap-1 text-[10px] text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 rounded-full px-1.5 py-0.5 font-semibold"><AlertTriangle className="w-2.5 h-2.5" />&lt;30d</span>;
    return null;
  };

  const lowStockCount = medicines.filter((m: Record<string, unknown>) => (m.stockQuantity as number) <= (m.reorderLevel as number)).length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Medicines</h1>
          <p className="text-muted-foreground text-sm">{meta.total || 0} items in inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Download className="w-4 h-4" /> Export
          </button>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 shadow-glow-sm">
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
        </div>
      </div>

      {/* ── Mini stat bar ── */}
      {!isLoading && meta.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Items', value: meta.total || 0, color: 'text-foreground', bg: 'bg-card' },
            { label: 'Low Stock', value: meta.lowStockCount ?? lowStockCount, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10' },
            { label: 'Expiring Soon', value: meta.expiringSoonCount ?? 0, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/10' },
          ].map((s) => (
            <div key={s.label} className={cn('rounded-xl border border-border px-4 py-3 flex items-center justify-between shadow-card', s.bg)}>
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={cn('text-xl font-bold', s.color)}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search medicine, barcode..." className="pl-9 h-9" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground hover:border-primary/30 transition-colors">
          <option value="">All Categories</option>
          {(categoriesData || []).map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setFilterMode(filterMode === 'lowStock' ? '' : 'lowStock')}
          className={cn('filter-pill', filterMode === 'lowStock' && 'filter-pill-active bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 hover:bg-orange-100 hover:text-orange-700')}>
          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
        </button>
        <button onClick={() => setFilterMode(filterMode === 'expiringSoon' ? '' : 'expiringSoon')}
          className={cn('filter-pill', filterMode === 'expiringSoon' && 'filter-pill-active bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100 hover:text-rose-700')}>
          <Clock className="w-3.5 h-3.5" /> Expiring
        </button>
        {(search || categoryFilter || filterMode) && (
          <button onClick={() => { setSearch(''); setCategoryFilter(''); setFilterMode(''); setPage(1); }}
            className="filter-pill text-rose-600 border-rose-200 hover:bg-rose-50">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Type</th>
                <th>Batch / Expiry</th>
                <th>MRP</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>GST</th>
                <th>Location</th>
                <th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                ['sk-1','sk-2','sk-3','sk-4','sk-5','sk-6','sk-7','sk-8'].map((key) => (
                  <tr key={key}><td colSpan={9}><div className="h-9 animate-shimmer rounded-lg my-1 mx-2" /></td></tr>
                ))
              ) : medicines.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No medicines found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or add a new medicine</p>
                </td></tr>
              ) : medicines.map((med: Record<string, unknown>) => (
                <tr key={med.id as string}>
                  <td>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{med.medicineName as string}</p>
                      {Boolean(med.genericName) && <p className="text-xs text-muted-foreground">{med.genericName as string}</p>}
                      {Boolean(med.manufacturer) && <p className="text-[11px] text-muted-foreground/70">{med.manufacturer as string}</p>}
                    </div>
                  </td>
                  <td>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', TYPE_COLORS[med.medicineType as string] || 'bg-muted text-muted-foreground')}>
                      {med.medicineType as string}
                    </span>
                    {Boolean(med.isPrescriptionRequired) && (
                      <span className="ml-1 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">Rx</span>
                    )}
                  </td>
                  <td>
                    <div className="text-xs space-y-0.5">
                      {Boolean(med.batchNumber) && <p className="font-mono text-muted-foreground">{med.batchNumber as string}</p>}
                      <div className="flex items-center gap-1 flex-wrap">
                        {Boolean(med.expiryDate) && <span className="text-muted-foreground">{formatDate(med.expiryDate as string)}</span>}
                        {expiryBadge(med.expiryDate as string | null)}
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold text-sm">{formatCurrency(med.mrp as number)}</td>
                  <td className="text-sm">{formatCurrency(med.sellingPrice as number)}</td>
                  <td>
                    <div className="flex items-baseline gap-1">
                      <span className={cn('font-bold text-sm', (med.stockQuantity as number) <= (med.reorderLevel as number) ? 'text-orange-600' : 'text-foreground')}>
                        {med.stockQuantity as number}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{med.unit as string}</span>
                    </div>
                    {(med.stockQuantity as number) <= (med.reorderLevel as number) && (
                      <p className="text-[10px] text-orange-500 mt-0.5">Reorder</p>
                    )}
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-muted-foreground">{med.gstPercentage as number}%</span>
                  </td>
                  <td className="text-xs text-muted-foreground font-mono">{(med.rackLocation as string) || '—'}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1 pr-2">
                      <button onClick={() => onEdit(med)}
                        className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 text-muted-foreground hover:text-sky-600 transition-colors"
                        title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm('Delete this medicine?')) deleteMutation.mutate(med.id as string); }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-muted-foreground hover:text-rose-600 transition-colors"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{meta.page}</span> of {meta.totalPages}
              <span className="ml-1 text-muted-foreground/70">({meta.total} records)</span>
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">← Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">Next →</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-modal animate-scale-in">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-semibold">{editItem?.id ? 'Edit Medicine' : 'Add New Medicine'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the medicine details below</p>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Medicine Name *</Label>
                  <Input {...register('medicineName')} placeholder="e.g. Paracetamol 500mg" />
                  {errors.medicineName && <p className="text-xs text-destructive">{errors.medicineName.message}</p>}
                </div>
                <div className="space-y-1.5"><Label>Generic Name</Label><Input {...register('genericName')} placeholder="Generic/chemical name" /></div>
                <div className="space-y-1.5"><Label>Manufacturer</Label><Input {...register('manufacturer')} placeholder="Company name" /></div>
                <div className="space-y-1.5">
                  <Label>Medicine Type</Label>
                  <select {...register('medicineType')} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm">
                    {MEDICINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Batch Number</Label><Input {...register('batchNumber')} placeholder="Batch/lot number" /></div>
                <div className="space-y-1.5"><Label>Expiry Date</Label><Input {...register('expiryDate')} type="date" /></div>
                <div className="space-y-1.5">
                  <Label>Barcode</Label>
                  <div className="relative">
                    <Input {...register('barcode')} placeholder="Scan or enter barcode" className="pr-9" />
                    <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>MRP *</Label>
                  <Input {...register('mrp')} type="number" step="0.01" placeholder="0.00" />
                  {errors.mrp && <p className="text-xs text-destructive">{errors.mrp.message}</p>}
                </div>
                <div className="space-y-1.5"><Label>Purchase Price</Label><Input {...register('purchasePrice')} type="number" step="0.01" placeholder="0.00" /></div>
                <div className="space-y-1.5">
                  <Label>Selling Price *</Label>
                  <Input {...register('sellingPrice')} type="number" step="0.01" placeholder="0.00" />
                  {errors.sellingPrice && <p className="text-xs text-destructive">{errors.sellingPrice.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>GST %</Label>
                  <select {...register('gstPercentage', { valueAsNumber: true })} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm">
                    {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Stock Quantity</Label><Input {...register('stockQuantity', { valueAsNumber: true })} type="number" placeholder="0" /></div>
                <div className="space-y-1.5"><Label>Reorder Level</Label><Input {...register('reorderLevel', { valueAsNumber: true })} type="number" placeholder="10" /></div>
                <div className="space-y-1.5"><Label>Rack Location</Label><Input {...register('rackLocation')} placeholder="e.g. A-1-2" /></div>
                <div className="space-y-1.5"><Label>HSN Code</Label><Input {...register('hsnCode')} placeholder="HSN for GST" /></div>
                <div className="space-y-1.5"><Label>Unit</Label><Input {...register('unit')} placeholder="STRIP, BOTTLE, TUBE..." /></div>
                <div className="md:col-span-2 flex items-center gap-2.5">
                  <input type="checkbox" {...register('isPrescriptionRequired')} id="rx" className="w-4 h-4 rounded" />
                  <label htmlFor="rx" className="text-sm font-medium cursor-pointer">Prescription Required (Rx)</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 shadow-glow-sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editItem?.id ? 'Update Medicine' : 'Add Medicine'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
