import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Search, Edit, Truck, X, Loader2, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => api.get('/suppliers', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post('/suppliers', data),
    onSuccess: () => { toast.success('Supplier added'); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeForm(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.put(`/suppliers/${id}`, data),
    onSuccess: () => { toast.success('Supplier updated'); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeForm(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { toast.success('Supplier deleted'); queryClient.invalidateQueries({ queryKey: ['suppliers'] }); },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); reset(); };

  const onEdit = (s: Record<string, unknown>) => {
    setEditId(s.id as string);
    Object.entries(s).forEach(([k, v]) => setValue(k, v as never));
    setShowForm(true);
  };

  const onSubmit = (data: Record<string, unknown>) => {
    if (editId) updateMutation.mutate({ id: editId, data });
    else createMutation.mutate(data);
  };

  const suppliers = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-muted-foreground text-sm">{meta.total || 0} suppliers registered</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 shadow-glow-sm">
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="pl-9 h-9" />
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? ['sk-1','sk-2','sk-3','sk-4','sk-5','sk-6'].map((key) => <div key={key} className="h-44 rounded-xl animate-shimmer" />)
          : suppliers.length === 0
          ? (
            <div className="md:col-span-3 text-center py-20 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No suppliers found</p>
              <p className="text-xs mt-1">Add your first supplier to get started</p>
            </div>
          )
          : suppliers.map((s: Record<string, unknown>) => (
            <div key={s.id as string} className="stat-card group">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground leading-tight">{s.name as string}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.contactPerson as string || 'No contact person'}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 text-muted-foreground hover:text-sky-600 transition-colors" title="Edit">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this supplier?')) deleteMutation.mutate(s.id as string); }}
                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-muted-foreground hover:text-rose-600 transition-colors" title="Delete">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm border-t border-border pt-3">
                {Boolean(s.phone) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono text-sm text-foreground">{s.phone as string}</span>
                  </div>
                )}
                {Boolean(s.email) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate text-xs">{s.email as string}</span>
                  </div>
                )}
                {Boolean(s.city) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">{s.city as string}, {s.state as string}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  {Boolean(s.gstin) && (
                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{s.gstin as string}</span>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold">{s.creditDays as number} days credit</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}

      {/* ── Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-modal animate-scale-in">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-semibold">{editId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Supplier and credit details</p>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5"><Label>Supplier Name *</Label><Input {...register('name', { required: true })} placeholder="Company name" />{errors.name && <p className="text-xs text-destructive">Required</p>}</div>
                <div className="space-y-1.5"><Label>Contact Person</Label><Input {...register('contactPerson')} placeholder="Contact name" /></div>
                <div className="space-y-1.5"><Label>Phone *</Label><Input {...register('phone', { required: true })} placeholder="Phone number" />{errors.phone && <p className="text-xs text-destructive">Required</p>}</div>
                <div className="space-y-1.5"><Label>Email</Label><Input {...register('email')} type="email" placeholder="Email address" /></div>
                <div className="space-y-1.5"><Label>GSTIN</Label><Input {...register('gstin')} placeholder="GSTIN number" /></div>
                <div className="space-y-1.5"><Label>Drug License</Label><Input {...register('drugLicense')} placeholder="License number" /></div>
                <div className="space-y-1.5"><Label>Credit Days</Label><Input {...register('creditDays', { valueAsNumber: true })} type="number" defaultValue={30} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Address</Label><Input {...register('address')} placeholder="Street address" /></div>
                <div className="space-y-1.5"><Label>City</Label><Input {...register('city')} /></div>
                <div className="space-y-1.5"><Label>State</Label><Input {...register('state')} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={closeForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 shadow-glow-sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editId ? 'Update Supplier' : 'Add Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
