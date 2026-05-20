import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, FileText, TrendingUp, Package, Download, Calendar, ChevronRight, AlertTriangle, ChevronDown, FileSpreadsheet } from 'lucide-react';
import api from '@/api/axios';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ReportType = 'daily' | 'monthly' | 'gst' | 'inventory' | 'expiry' | 'purchase';

const REPORT_TABS: { id: ReportType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'daily',     label: 'Daily Sales', icon: Calendar,   color: 'text-sky-600' },
  { id: 'monthly',   label: 'Monthly',     icon: TrendingUp, color: 'text-violet-600' },
  { id: 'gst',       label: 'GST Report',  icon: FileText,   color: 'text-emerald-600' },
  { id: 'inventory', label: 'Inventory',   icon: Package,    color: 'text-indigo-600' },
  { id: 'expiry',    label: 'Expiry',      icon: BarChart2,  color: 'text-orange-600' },
  { id: 'purchase',  label: 'Purchases',   icon: Download,   color: 'text-rose-600' },
];

// ── Typed responses ────────────────────────────────────────────────────────────
type PurchaseRow = {
  id: string;
  purchaseNumber: string;
  purchaseDate: string;
  totalAmount: number;
  status: string;
  supplier?: { name: string } | null;
};
type PurchaseReportData = {
  period: { startDate: string; endDate: string };
  summary: { _sum: { totalAmount: number | null; taxAmount: number | null }; _count: { id: number } };
  purchases: PurchaseRow[];
};
type InventoryRow = {
  id: string;
  medicine_name: string;
  stock_quantity: number;
  purchase_price: number;
  selling_price: number;
  purchase_value: number;
  selling_value: number;
  category_name: string;
};
type ExpiryMed = {
  id: string;
  medicineName: string;
  batchNumber?: string | null;
  expiryDate: string;
  stockQuantity: number;
  category?: { name: string } | null;
};
type ExpiryData = { expired: ExpiryMed[]; expiring30: ExpiryMed[]; expiring90: ExpiryMed[] };

// ── Helpers ────────────────────────────────────────────────────────────────────
const errMsg = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error');

// ── Shared skeleton loader ─────────────────────────────────────────────────────
function ReportSkeleton({ rows = 4, cols = 4 }: { readonly rows?: number; readonly cols?: number }) {
  const colKeys = Array.from({ length: cols }, (_, i) => `sk-col-${i}`);
  const rowKeys = Array.from({ length: rows }, (_, i) => `sk-row-${i}`);
  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
        {colKeys.map((k) => <div key={k} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="h-10 bg-muted animate-pulse" />
        {rowKeys.map((k) => (
          <div key={k} className="h-10 border-t border-border px-4 flex items-center gap-4">
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────
function ReportError({ message }: { readonly message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <AlertTriangle className="w-8 h-8 text-destructive" />
      <p className="font-medium text-foreground">Failed to load report</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────
const downloadReport = async (url: string, params: Record<string, unknown>, filename: string, format: 'excel' | 'csv') => {
  const response = await api.get(url, { params: { ...params, format }, responseType: 'blob' });
  const ext = format === 'excel' ? 'xlsx' : 'csv';
  const blobUrl = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${filename}.${ext}`;
  a.click();
  URL.revokeObjectURL(blobUrl);
};

function ExportMenu({ onExcel, onCsv }: { readonly onExcel: () => void; readonly onCsv: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" onClick={() => setOpen((p) => !p)} className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
          <button
            type="button"
            onClick={() => { onExcel(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => { onCsv(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2.5 transition-colors border-t border-border"
          >
            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [monthYear, setMonthYear] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: dailyData, isLoading: dailyLoading, isError: dailyError, error: dailyErr } = useQuery({
    queryKey: ['report-daily', dateFilter],
    queryFn: () => api.get('/reports/daily-sales', { params: { date: dateFilter } }).then((r) => r.data.data),
    enabled: reportType === 'daily',
  });

  const { data: monthlyData, isLoading: monthlyLoading, isError: monthlyError, error: monthlyErr } = useQuery({
    queryKey: ['report-monthly', monthYear],
    queryFn: () => api.get('/reports/monthly-sales', { params: monthYear }).then((r) => r.data.data),
    enabled: reportType === 'monthly',
  });

  const { data: gstData, isLoading: gstLoading, isError: gstError, error: gstErr } = useQuery({
    queryKey: ['report-gst', dateRange],
    queryFn: () => api.get('/reports/gst', { params: dateRange }).then((r) => r.data.data),
    enabled: reportType === 'gst',
  });

  const { data: inventoryRaw, isLoading: inventoryLoading, isError: inventoryError, error: inventoryErr } = useQuery<InventoryRow[]>({
    queryKey: ['report-inventory'],
    queryFn: () => api.get('/reports/inventory-valuation').then((r) => r.data.data),
    enabled: reportType === 'inventory',
  });

  const { data: expiryRaw, isLoading: expiryLoading, isError: expiryError, error: expiryErr } = useQuery<ExpiryData>({
    queryKey: ['report-expiry'],
    queryFn: () => api.get('/reports/expiry').then((r) => r.data.data),
    enabled: reportType === 'expiry',
  });

  const { data: purchaseRaw, isLoading: purchaseLoading, isError: purchaseError, error: purchaseErr } = useQuery<PurchaseReportData>({
    queryKey: ['report-purchase', dateRange],
    queryFn: () => api.get('/reports/purchases', { params: dateRange }).then((r) => r.data.data),
    enabled: reportType === 'purchase',
  });

  const currentTab = REPORT_TABS.find((t) => t.id === reportType);

  const monthNames = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-IN', { month: 'long' }));

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-muted-foreground text-sm">Business analytics and reporting</p>
        </div>
        {currentTab && (
          <div className={cn('flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-card border border-border', currentTab.color)}>
            <currentTab.icon className="w-4 h-4" />
            {currentTab.label}
          </div>
        )}
      </div>

      {/* ── Report Type Tabs ── */}
      <div className="bg-card border border-border rounded-xl p-1.5 shadow-card flex flex-wrap gap-1">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportType(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex-1 justify-center',
              reportType === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-4">
          {reportType === 'daily' && (
            <>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
              </div>
              <ExportMenu
                onExcel={() => downloadReport('/reports/daily-sales', { date: dateFilter }, `daily-sales-${dateFilter}`, 'excel')}
                onCsv={() => downloadReport('/reports/daily-sales', { date: dateFilter }, `daily-sales-${dateFilter}`, 'csv')}
              />
            </>
          )}
          {reportType === 'monthly' && (
            <>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={monthYear.year} onChange={(e) => setMonthYear((p) => ({ ...p, year: parseInt(e.target.value, 10) }))} className="w-28" />
              </div>
              <div className="space-y-1.5">
                <Label>Month</Label>
                <select value={monthYear.month} onChange={(e) => setMonthYear((p) => ({ ...p, month: parseInt(e.target.value, 10) }))}
                  className="h-9 px-3 rounded-lg border border-border bg-background text-sm">
                  {monthNames.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <ExportMenu
                onExcel={() => downloadReport('/reports/monthly-sales', monthYear, `monthly-sales-${monthYear.year}-${String(monthYear.month).padStart(2, '0')}`, 'excel')}
                onCsv={() => downloadReport('/reports/monthly-sales', monthYear, `monthly-sales-${monthYear.year}-${String(monthYear.month).padStart(2, '0')}`, 'csv')}
              />
            </>
          )}
          {reportType === 'gst' && (
            <>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} className="w-44" /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} className="w-44" /></div>
              <ExportMenu
                onExcel={() => downloadReport('/reports/gst', dateRange, `gst-report-${dateRange.startDate}-to-${dateRange.endDate}`, 'excel')}
                onCsv={() => downloadReport('/reports/gst', dateRange, `gst-report-${dateRange.startDate}-to-${dateRange.endDate}`, 'csv')}
              />
            </>
          )}
          {reportType === 'inventory' && (
            <ExportMenu
              onExcel={() => downloadReport('/reports/inventory-valuation', {}, `inventory-valuation-${new Date().toISOString().split('T')[0]}`, 'excel')}
              onCsv={() => downloadReport('/reports/inventory-valuation', {}, `inventory-valuation-${new Date().toISOString().split('T')[0]}`, 'csv')}
            />
          )}
          {reportType === 'expiry' && (
            <ExportMenu
              onExcel={() => downloadReport('/reports/expiry', {}, `expiry-report-${new Date().toISOString().split('T')[0]}`, 'excel')}
              onCsv={() => downloadReport('/reports/expiry', {}, `expiry-report-${new Date().toISOString().split('T')[0]}`, 'csv')}
            />
          )}
          {reportType === 'purchase' && (
            <>
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} className="w-44" /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} className="w-44" /></div>
              <ExportMenu
                onExcel={() => downloadReport('/reports/purchases', dateRange, `purchases-${dateRange.startDate}-to-${dateRange.endDate}`, 'excel')}
                onCsv={() => downloadReport('/reports/purchases', dateRange, `purchases-${dateRange.startDate}-to-${dateRange.endDate}`, 'csv')}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Daily Report ── */}
      {reportType === 'daily' && dailyLoading && <ReportSkeleton />}
      {reportType === 'daily' && dailyError && <ReportError message={errMsg(dailyErr)} />}
      {reportType === 'daily' && dailyData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales', value: formatCurrency(Number(dailyData.summary._sum?.totalAmount || 0)),    color: 'text-emerald-600', border: 'border-l-2 border-l-emerald-500' },
              { label: 'Invoices',    value: dailyData.summary._count?.id || 0,                                    color: 'text-sky-600',     border: 'border-l-2 border-l-sky-500' },
              { label: 'Total Tax',   value: formatCurrency(Number(dailyData.summary._sum?.totalTax || 0)),         color: 'text-violet-600',  border: 'border-l-2 border-l-violet-500' },
              { label: 'Discounts',   value: formatCurrency(Number(dailyData.summary._sum?.discountAmount || 0)),   color: 'text-orange-600',  border: 'border-l-2 border-l-orange-500' },
            ].map((s) => (
              <div key={s.label} className={cn('stat-card text-center', s.border)}>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">Invoice Details — {new Date(dateFilter).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Invoice #</th><th>Customer</th><th>Amount</th><th>Tax</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {(dailyData.invoices || []).map((inv: Record<string, unknown>) => (
                    <tr key={inv.id as string}>
                      <td className="font-mono text-xs font-semibold">{inv.invoiceNumber as string}</td>
                      <td>{(inv.customer as { name: string } | null)?.name || <span className="text-muted-foreground italic text-xs">Walk-in</span>}</td>
                      <td className="font-semibold">{formatCurrency(Number(inv.totalAmount))}</td>
                      <td>{formatCurrency(Number(inv.totalTax))}</td>
                      <td><span className={`badge-status-${(inv.status as string).toLowerCase()}`}>{inv.status as string}</span></td>
                      <td className="text-muted-foreground text-xs">{new Date(inv.invoiceDate as string).toLocaleTimeString('en-IN')}</td>
                    </tr>
                  ))}
                  {!(dailyData.invoices?.length) && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No invoices for selected date</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Report ── */}
      {reportType === 'monthly' && monthlyLoading && <ReportSkeleton cols={4} rows={6} />}
      {reportType === 'monthly' && monthlyError && <ReportError message={errMsg(monthlyErr)} />}
      {reportType === 'monthly' && monthlyData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Month Sales',    value: formatCurrency(Number(monthlyData.summary._sum?.totalAmount || 0)),    border: 'border-l-2 border-l-sky-500' },
              { label: 'Total Invoices', value: monthlyData.summary._count?.id || 0,                                   border: 'border-l-2 border-l-violet-500' },
              { label: 'Total GST',      value: formatCurrency(Number(monthlyData.summary._sum?.totalTax || 0)),        border: 'border-l-2 border-l-emerald-500' },
              { label: 'Discounts',      value: formatCurrency(Number(monthlyData.summary._sum?.discountAmount || 0)),  border: 'border-l-2 border-l-orange-500' },
            ].map((s) => (
              <div key={s.label} className={cn('stat-card text-center', s.border)}>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="stat-card">
            <h3 className="font-semibold mb-1">Daily Sales Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Sales and GST per day</p>
            {(monthlyData.dailyBreakdown || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(monthlyData.dailyBreakdown || []).map((d: Record<string, unknown>) => ({ day: (d.day as string).slice(8), sales: d.total, tax: d.tax }))} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} width={44} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="sales" fill="#0284c7" name="Sales" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tax" fill="#8b5cf6" name="GST" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-10 text-muted-foreground text-sm">No sales data for selected month</p>
            )}
          </div>
        </div>
      )}

      {/* ── GST Report ── */}
      {reportType === 'gst' && gstLoading && <ReportSkeleton cols={4} rows={5} />}
      {reportType === 'gst' && gstError && <ReportError message={errMsg(gstErr)} />}
      {reportType === 'gst' && gstData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Taxable Amount', value: formatCurrency(Number(gstData.totals._sum?.taxableAmount || 0)), border: 'border-l-2 border-l-sky-500' },
              { label: 'CGST',           value: formatCurrency(Number(gstData.totals._sum?.cgstAmount || 0)),    border: 'border-l-2 border-l-violet-500' },
              { label: 'SGST',           value: formatCurrency(Number(gstData.totals._sum?.sgstAmount || 0)),    border: 'border-l-2 border-l-indigo-500' },
              { label: 'Total GST',      value: formatCurrency(Number(gstData.totals._sum?.totalTax || 0)),       border: 'border-l-2 border-l-emerald-500' },
            ].map((s) => (
              <div key={s.label} className={cn('stat-card text-center', s.border)}>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">GST Slab-wise Breakdown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>HSN Code</th><th>GST %</th><th>Taxable Amt</th><th>CGST</th><th>SGST</th><th>Total Tax</th><th>Invoices</th></tr></thead>
                <tbody>
                  {(gstData.gstBreakdown || []).length > 0 ? (
                    (gstData.gstBreakdown || []).map((row: Record<string, unknown>) => (
                      <tr key={`${row.hsn_code as string}-${row.gst_percentage as number}`}>
                        <td className="font-mono text-xs font-semibold">{row.hsn_code as string}</td>
                        <td><span className="bg-muted px-2 py-0.5 rounded-full text-xs font-semibold">{row.gst_percentage as number}%</span></td>
                        <td>{formatCurrency(Number(row.taxable_amount))}</td>
                        <td>{formatCurrency(Number(row.cgst_amount))}</td>
                        <td>{formatCurrency(Number(row.sgst_amount))}</td>
                        <td className="font-semibold">{formatCurrency(Number(row.total_tax))}</td>
                        <td>{row.invoice_count as number}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No GST data for selected period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Inventory Valuation ── */}
      {reportType === 'inventory' && inventoryLoading && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="h-12 bg-muted animate-pulse" />
          {['inv-sk-1','inv-sk-2','inv-sk-3','inv-sk-4','inv-sk-5','inv-sk-6','inv-sk-7','inv-sk-8'].map((k) => (
            <div key={k} className="h-10 border-t border-border px-4 flex items-center gap-4">
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      )}
      {reportType === 'inventory' && inventoryError && <ReportError message={errMsg(inventoryErr)} />}
      {reportType === 'inventory' && inventoryRaw && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">Inventory Valuation Report</span>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">{inventoryRaw.length} items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Purchase Price</th><th>Selling Price</th><th>Purchase Value</th><th>Selling Value</th></tr></thead>
              <tbody>
                {inventoryRaw.length > 0 ? (
                  inventoryRaw.map((row) => (
                    <tr key={row.id}>
                      <td className="font-semibold">{row.medicine_name}</td>
                      <td><span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{row.category_name}</span></td>
                      <td className="font-semibold">{row.stock_quantity}</td>
                      <td>{formatCurrency(Number(row.purchase_price))}</td>
                      <td>{formatCurrency(Number(row.selling_price))}</td>
                      <td className="font-semibold">{formatCurrency(Number(row.purchase_value))}</td>
                      <td className="font-semibold text-emerald-600">{formatCurrency(Number(row.selling_value))}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No inventory data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expiry Report ── */}
      {reportType === 'expiry' && expiryLoading && <ReportSkeleton cols={2} rows={5} />}
      {reportType === 'expiry' && expiryError && <ReportError message={errMsg(expiryErr)} />}
      {reportType === 'expiry' && expiryRaw && (
        <div className="space-y-4">
          {([
            { title: 'Expired Medicines',      data: expiryRaw.expired,    color: 'text-rose-600',   border: 'border-l-2 border-l-rose-500',   bg: 'bg-rose-50 dark:bg-rose-900/10' },
            { title: 'Expiring in 30 Days',    data: expiryRaw.expiring30, color: 'text-orange-600', border: 'border-l-2 border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10' },
            { title: 'Expiring in 31–90 Days', data: expiryRaw.expiring90, color: 'text-amber-600',  border: 'border-l-2 border-l-amber-500',  bg: '' },
          ] as const).map(({ title, data, color, border, bg }) => (
            <div key={title} className={cn('bg-card border border-border rounded-xl overflow-hidden shadow-card', border)}>
              <div className={cn('px-4 py-3 border-b border-border flex items-center gap-2', bg)}>
                <span className={cn('font-semibold text-sm', color)}>{title}</span>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full ml-1', color, bg || 'bg-muted')}>{data?.length ?? 0}</span>
              </div>
              {data?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Medicine</th><th>Category</th><th>Batch</th><th>Expiry</th><th>Stock</th></tr></thead>
                    <tbody>
                      {data.map((med) => (
                        <tr key={med.id}>
                          <td className="font-semibold">{med.medicineName}</td>
                          <td><span className="text-xs text-muted-foreground">{med.category?.name || '—'}</span></td>
                          <td className="font-mono text-xs">{med.batchNumber || '—'}</td>
                          <td className={cn('font-semibold text-sm', color)}>{formatDate(med.expiryDate)}</td>
                          <td>{med.stockQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">No medicines in this category</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Purchase Report ── */}
      {reportType === 'purchase' && purchaseLoading && <ReportSkeleton cols={3} rows={6} />}
      {reportType === 'purchase' && purchaseError && <ReportError message={errMsg(purchaseErr)} />}
      {reportType === 'purchase' && purchaseRaw && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Orders',  value: purchaseRaw.summary._count?.id || 0,                                          border: 'border-l-2 border-l-rose-500' },
              { label: 'Total Amount',  value: formatCurrency(Number(purchaseRaw.summary._sum?.totalAmount || 0)),             border: 'border-l-2 border-l-sky-500' },
              { label: 'Total Tax',     value: formatCurrency(Number(purchaseRaw.summary._sum?.taxAmount || 0)),               border: 'border-l-2 border-l-violet-500' },
            ].map((s) => (
              <div key={s.label} className={cn('stat-card text-center', s.border)}>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Purchases table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">Purchase Orders</span>
              <span className="ml-auto text-xs text-muted-foreground">{dateRange.startDate} <ChevronRight className="w-3 h-3 inline" /> {dateRange.endDate}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>PO #</th><th>Supplier</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {purchaseRaw.purchases.length > 0 ? (
                    purchaseRaw.purchases.map((po) => (
                      <tr key={po.id}>
                        <td className="font-mono text-xs font-semibold">{po.purchaseNumber}</td>
                        <td>{po.supplier?.name || '—'}</td>
                        <td className="font-semibold">{formatCurrency(Number(po.totalAmount))}</td>
                        <td><span className={`badge-status-${po.status.toLowerCase()}`}>{po.status}</span></td>
                        <td className="text-xs text-muted-foreground">{formatDate(po.purchaseDate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No purchases in selected date range</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
