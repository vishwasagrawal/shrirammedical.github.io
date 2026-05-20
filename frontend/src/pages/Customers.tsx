import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Search, Edit, Users, X, Loader2 } from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get('/customers', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post('/customers', data),
    onSuccess: () => { toast.success('Customer added'); queryClient.invalidateQueries({ queryKey: ['customers'] }); closeForm(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.put(`/customers/${id}`, data),
    onSuccess: () => { toast.success('Customer updated'); queryClient.invalidateQueries({ queryKey: ['customers'] }); closeForm(); },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); reset(); };
  const onEdit = (c: Record<string, unknown>) => {
    setEditId(c.id as string);
    Object.entries(c).forEach(([k, v]) => setValue(k, v as never));
    setShowForm(true);
  };

  const onSubmit = (data: Record<string, unknown>) => {
    if (editId) updateMutation.mutate({ id: editId, data });
    else createMutation.mutate(data);
  };

  const customers = data?.data || [];
  const meta = data?.meta || {};

  const totalOutstanding = customers.reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.outstandingBalance || 0), 0);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-muted-foreground text-sm">{meta.total || 0} registered customers</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 shadow-glow-sm">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {/* ── Mini stats ── */}
      {!isLoading && customers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between shadow-card">
            <span className="text-sm text-muted-foreground">Total Customers</span>
            <span className="text-xl font-bold text-foreground">{meta.total || 0}</span>
          </div>
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 px-4 py-3 flex items-center justify-between shadow-card">
            <span className="text-sm text-muted-foreground">Total Outstanding</span>
            <span className="text-xl font-bold text-rose-600">{formatCurrency(totalOutstanding)}</span>
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email..." className="pl-9 h-9" />
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>City</th>
                <th>Doctor</th>
                <th>Total Purchases</th>
                <th>Outstanding</th>
                <th className="text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && ['sk-1','sk-2','sk-3','sk-4','sk-5'].map((key) => (
                <tr key={key}><td colSpan={7}><div className="h-9 animate-shimmer rounded-lg my-1 mx-2" /></td></tr>
              ))}
              {!isLoading && customers.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold">No customers found</p>
                  <p className="text-xs mt-1">Add your first customer to get started</p>
                </td></tr>
              )}
              {!isLoading && customers.map((c: Record<string, unknown>) => (
                  <tr key={c.id as string}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {(c.name as string)?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.name as string}</p>
                          {Boolean(c.email) && <p className="text-xs text-muted-foreground">{c.email as string}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-sm">{c.phone as string}</span></td>
                    <td className="text-muted-foreground text-sm">{c.city as string || '—'}</td>
                    <td className="text-muted-foreground text-sm">{c.doctorName as string || '—'}</td>
                    <td className="font-semibold text-sm">{formatCurrency(Number(c.totalPurchases || 0))}</td>
                    <td>
                      {Number(c.outstandingBalance) > 0
                        ? <span className="text-rose-600 font-bold text-sm">{formatCurrency(Number(c.outstandingBalance))}</span>
                        : <span className="text-emerald-600 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Cleared</span>
                      }
                    </td>
                    <td>
                      <div className="flex justify-end pr-2">
                        <button onClick={() => onEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 text-muted-foreground hover:text-sky-600 transition-colors"
                          title="Edit">
                          <Edit className="w-3.5 h-3.5" />
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
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">← Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">Next →</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-modal animate-scale-in">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-semibold">{editId ? 'Edit Customer' : 'Add New Customer'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Customer profile and medical details</p>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5"><Label>Full Name *</Label><Input {...register('name', { required: true })} />{errors.name && <p className="text-xs text-destructive">Required</p>}</div>
                <div className="space-y-1.5"><Label>Phone *</Label><Input {...register('phone', { required: true })} />{errors.phone && <p className="text-xs text-destructive">Required</p>}</div>
                <div className="space-y-1.5"><Label>Email</Label><Input {...register('email')} type="email" /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <select {...register('gender')} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm">
                    <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Date of Birth</Label><Input {...register('dateOfBirth')} type="date" /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Address</Label><Input {...register('address')} /></div>
                <div className="space-y-1.5"><Label>City</Label><Input {...register('city')} /></div>
                <div className="space-y-1.5"><Label>State</Label><Input {...register('state')} /></div>
                <div className="space-y-1.5"><Label>Doctor Name</Label><Input {...register('doctorName')} /></div>
                <div className="space-y-1.5"><Label>Credit Limit</Label><Input {...register('creditLimit', { valueAsNumber: true })} type="number" defaultValue={0} /></div>
                <div className="md:col-span-2 space-y-1.5"><Label>Allergies</Label><Input {...register('allergies')} placeholder="Known drug allergies" /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={closeForm} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 shadow-glow-sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editId ? 'Update Customer' : 'Add Customer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
