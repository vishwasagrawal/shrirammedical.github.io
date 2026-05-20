import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Loader2, Building2, Receipt, Package, Lock, ShieldCheck } from 'lucide-react';
import api from '@/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

type Tab = 'pharmacy' | 'billing' | 'inventory' | 'security';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pharmacy',  label: 'Pharmacy Info', icon: Building2 },
  { id: 'billing',   label: 'Billing',       icon: Receipt },
  { id: 'inventory', label: 'Inventory',     icon: Package },
  { id: 'security',  label: 'Security',      icon: Lock },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pharmacy');
  const [form, setForm] = useState<Record<string, string>>({});

  const { isLoading } = useQuery({
    queryKey: ['settings-all'],
    queryFn: () => api.get('/settings/all').then((r) => {
      const map: Record<string, string> = {};
      r.data.data.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
      setForm(map);
      return map;
    }),
    enabled: user?.role === 'ADMIN',
  });

  const saveMutation = useMutation({
    mutationFn: (updates: { key: string; value: string }[]) => api.put('/settings', updates),
    onSuccess: () => { toast.success('Settings saved'); queryClient.invalidateQueries({ queryKey: ['settings-all'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = (keys: string[]) => {
    saveMutation.mutate(keys.map((k) => ({ key: k, value: form[k] || '' })));
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
          <p className="font-semibold text-foreground">Access Restricted</p>
          <p className="text-muted-foreground text-sm mt-1">Only administrators can access settings</p>
        </div>
      </div>
    );
  }

  const pharmacyKeys = ['pharmacy_name', 'pharmacy_address', 'pharmacy_phone', 'pharmacy_email', 'pharmacy_gstin', 'pharmacy_drug_license', 'state_code'];
  const billingKeys = ['currency', 'tax_type', 'default_gst', 'invoice_prefix'];
  const inventoryKeys = ['low_stock_threshold', 'expiry_alert_days'];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure your pharmacy system</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin Access
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-card shadow-sm text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 rounded-xl animate-shimmer" />
      ) : (
        <>
          {/* ── Pharmacy Info ── */}
          {activeTab === 'pharmacy' && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20">
                  <Building2 className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Pharmacy Details</h3>
                  <p className="text-xs text-muted-foreground">This information appears on invoices and receipts</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'pharmacy_name',         label: 'Pharmacy Name',   placeholder: 'MedStore Pharmacy' },
                  { key: 'pharmacy_phone',         label: 'Phone Number',    placeholder: '+91 98765 43210' },
                  { key: 'pharmacy_email',         label: 'Email',           placeholder: 'info@pharmacy.com' },
                  { key: 'pharmacy_gstin',         label: 'GSTIN',           placeholder: '27AABCU9603R1ZX' },
                  { key: 'pharmacy_drug_license',  label: 'Drug License',    placeholder: '20B-MH-2024-001' },
                  { key: 'state_code',             label: 'State Code',      placeholder: '27' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input value={form[key] || ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
                  </div>
                ))}
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form['pharmacy_address'] || ''} onChange={(e) => setForm((p) => ({ ...p, pharmacy_address: e.target.value }))} placeholder="Full pharmacy address" />
                </div>
              </div>
              <Button onClick={() => handleSave(pharmacyKeys)} disabled={saveMutation.isPending} className="shadow-glow-sm">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Pharmacy Info
              </Button>
            </div>
          )}

          {/* ── Billing ── */}
          {activeTab === 'billing' && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                  <Receipt className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Billing Configuration</h3>
                  <p className="text-xs text-muted-foreground">Invoice and tax settings</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'currency',       label: 'Currency Symbol', placeholder: 'INR' },
                  { key: 'tax_type',       label: 'Tax Type',        placeholder: 'GST' },
                  { key: 'default_gst',    label: 'Default GST %',   placeholder: '12' },
                  { key: 'invoice_prefix', label: 'Invoice Prefix',  placeholder: 'INV' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input value={form[key] || ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} />
                  </div>
                ))}
              </div>
              <Button onClick={() => handleSave(billingKeys)} disabled={saveMutation.isPending} className="shadow-glow-sm">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Billing Settings
              </Button>
            </div>
          )}

          {/* ── Inventory ── */}
          {activeTab === 'inventory' && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Inventory Alerts</h3>
                  <p className="text-xs text-muted-foreground">Stock and expiry alert thresholds</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Low Stock Alert Threshold</Label>
                  <Input type="number" value={form['low_stock_threshold'] || ''} onChange={(e) => setForm((p) => ({ ...p, low_stock_threshold: e.target.value }))} placeholder="10" />
                  <p className="text-xs text-muted-foreground">Alert when stock falls below this quantity</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry Alert Days</Label>
                  <Input type="number" value={form['expiry_alert_days'] || ''} onChange={(e) => setForm((p) => ({ ...p, expiry_alert_days: e.target.value }))} placeholder="30" />
                  <p className="text-xs text-muted-foreground">Alert when medicine expires within these days</p>
                </div>
              </div>
              <Button onClick={() => handleSave(inventoryKeys)} disabled={saveMutation.isPending} className="shadow-glow-sm">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Inventory Settings
              </Button>
            </div>
          )}

          {/* ── Security / Users ── */}
          {activeTab === 'security' && (
            <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <Lock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold">User Management</h3>
                  <p className="text-xs text-muted-foreground">Manage user accounts and access levels</p>
                </div>
              </div>
              <UsersList />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UsersList() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/auth/users').then((r) => r.data.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/auth/users/${id}/status`, { status }),
    onSuccess: () => { toast.success('User status updated'); queryClient.invalidateQueries({ queryKey: ['users-list'] }); },
  });

  if (isLoading) return <div className="h-32 animate-shimmer m-4 rounded-lg" />;

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Last Login</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {(data || []).map((u: Record<string, unknown>) => (
          <tr key={u.id as string}>
            <td>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {(u.fullName as string)?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">{u.fullName as string}</p>
                  <p className="text-xs text-muted-foreground">{u.username as string} · {u.email as string}</p>
                </div>
              </div>
            </td>
            <td>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {u.role as string}
              </span>
            </td>
            <td className="text-xs text-muted-foreground">
              {u.lastLoginAt
                ? new Date(u.lastLoginAt as string).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                : <span className="italic">Never</span>}
            </td>
            <td>
              <select
                value={u.status as string}
                onChange={(e) => updateStatusMutation.mutate({ id: u.id as string, status: e.target.value })}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background hover:border-primary/30 transition-colors"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
