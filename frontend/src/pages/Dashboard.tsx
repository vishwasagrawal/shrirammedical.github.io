import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState, type ComponentType } from 'react';
import api from '@/api/axios';
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, Users,
  Clock, ArrowUpRight, RefreshCw, AlertCircle,
  ShoppingCart, PlusCircle, FileBarChart2, PackagePlus,
  ArrowUp, X, ChevronRight, Truck,
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface DashboardData {
  stats: {
    todaySales: number;
    monthSales: number;
    yearSales: number;
    todayInvoices: number;
    monthInvoices: number;
    totalMedicines: number;
    lowStockCount: number;
    expiringCount: number;
    totalCustomers: number;
    totalSuppliers: number;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
    invoiceDate: string;
    paymentMethod: string;
    customer?: { name: string } | null;
  }>;
  topMedicines: Array<{
    medicineName: string;
    _sum: { quantity: number; totalAmount: number };
  }>;
  monthlySalesChart: Array<{ month: string; total: number; count: number }>;
  lowStockMedicines: Array<{
    medicineName: string;
    stockQuantity: number;
    reorderLevel: number;
    rackLocation?: string;
  }>;
  expiringMedicines: Array<{
    medicineName: string;
    expiryDate: string;
    stockQuantity: number;
    batchNumber?: string;
  }>;
}

interface ModalPanelProps {
  readonly dashboard: DashboardData;
  readonly onNavigate: (path: string) => void;
  readonly chartData: Array<{ month: string; sales: number; count: number }>;
}

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#22c55e', CARD: '#3b82f6', UPI: '#8b5cf6',
  CHEQUE: '#f59e0b', CREDIT: '#ef4444', ONLINE: '#06b6d4',
};

const STATUS_CLASS: Record<string, string> = {
  PAID: 'badge-status-paid',
  PARTIAL: 'badge-status-partial',
  CANCELLED: 'badge-status-cancelled',
  DRAFT: 'badge-status-draft',
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ── Modal panel components ─────────────────────────────────────────────────

function TodaySalesPanel({ dashboard, onNavigate }: ModalPanelProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 font-medium mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(dashboard.stats.todaySales)}</p>
        </div>
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-100 dark:border-sky-800">
          <p className="text-xs text-sky-600 font-medium mb-1">Invoices Generated</p>
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{dashboard.stats.todayInvoices}</p>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-3">Recent Transactions</h4>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Method</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.recentInvoices.map((inv) => (
              <tr key={inv.id}>
                <td className="font-mono text-xs font-semibold">{inv.invoiceNumber}</td>
                <td className="text-sm">{inv.customer?.name || <span className="italic text-muted-foreground text-xs">Walk-in</span>}</td>
                <td className="font-semibold text-sm">{formatCurrency(inv.totalAmount)}</td>
                <td><span className={STATUS_CLASS[inv.status] || 'badge-status-draft'}>{inv.status}</span></td>
                <td className="text-xs text-muted-foreground">{inv.paymentMethod}</td>
              </tr>
            ))}
            {!dashboard.recentInvoices.length && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No invoices today</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => onNavigate('/billing')}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
        View All Invoices <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

function MonthSalesPanel({ dashboard, onNavigate, chartData }: ModalPanelProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-100 dark:border-sky-800">
          <p className="text-xs text-sky-600 font-medium mb-1">Month Revenue</p>
          <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{formatCurrency(dashboard.stats.monthSales)}</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-100 dark:border-violet-800">
          <p className="text-xs text-violet-600 font-medium mb-1">Invoices This Month</p>
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{dashboard.stats.monthInvoices}</p>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-3">Monthly Trend (Last 12 Months)</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} width={46} />
          <Tooltip formatter={(value: number) => [formatCurrency(value), 'Sales']}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px' }} />
          <Bar dataKey="sales" fill="#0284c7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <button type="button" onClick={() => onNavigate('/reports')}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
        Detailed Sales Report <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

function YearSalesPanel({ dashboard, chartData }: ModalPanelProps) {
  const yearTotal = chartData.reduce((sum, d) => sum + d.sales, 0);
  const bestMonth = chartData.reduce((best, d) => d.sales > best.sales ? d : best, chartData[0] || { month: '—', sales: 0, count: 0 });
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4 border border-violet-100 dark:border-violet-800">
          <p className="text-xs text-violet-600 font-medium mb-1">Year Revenue</p>
          <p className="text-xl font-bold text-violet-700 dark:text-violet-400">{formatCurrency(dashboard.stats.yearSales)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs text-emerald-600 font-medium mb-1">Best Month</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{bestMonth.month}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">{formatCurrency(bestMonth.sales)}</p>
        </div>
        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-100 dark:border-sky-800">
          <p className="text-xs text-sky-600 font-medium mb-1">Avg / Month</p>
          <p className="text-xl font-bold text-sky-700 dark:text-sky-400">{formatCurrency(chartData.length ? yearTotal / chartData.length : 0)}</p>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-3">12-Month Sales Breakdown</h4>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} width={46} />
          <Tooltip formatter={(value: number) => [formatCurrency(value), 'Sales']}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px' }} />
          <Area type="monotone" dataKey="sales" stroke="#7c3aed" fill="url(#yearGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

function MedicinesPanel({ dashboard, onNavigate }: ModalPanelProps) {
  return (
    <>
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 mb-6">
        <p className="text-xs text-indigo-600 font-medium mb-1">Total Active Medicines</p>
        <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{dashboard.stats.totalMedicines.toLocaleString()}</p>
        <p className="text-xs text-indigo-500 mt-1">items in inventory</p>
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-3">Top Selling Medicines</h4>
      {dashboard.topMedicines.length > 0 ? (
        <div className="space-y-2.5">
          {dashboard.topMedicines.map((med, idx) => {
            const maxQty = dashboard.topMedicines[0]._sum.quantity || 1;
            const pct = Math.round((med._sum.quantity / maxQty) * 100);
            return (
              <div key={med.medicineName} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{med.medicineName}</span>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{med._sum.quantity} units</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-foreground flex-shrink-0">{formatCurrency(med._sum.totalAmount || 0)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No sales data available</p>
      )}
      <button type="button" onClick={() => onNavigate('/medicines')}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
        Manage Medicines <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

function LowStockPanel({ dashboard, onNavigate }: ModalPanelProps) {
  return (
    <>
      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800 mb-6 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{dashboard.stats.lowStockCount} items below reorder level</p>
          <p className="text-xs text-orange-600/70 mt-0.5">Reorder these medicines to avoid stock-outs</p>
        </div>
      </div>
      {dashboard.lowStockMedicines.length > 0 ? (
        <div className="space-y-3">
          {dashboard.lowStockMedicines.map((med) => {
            const pct = med.reorderLevel > 0 ? Math.min(100, Math.round((med.stockQuantity / (med.reorderLevel * 2)) * 100)) : 50;
            const isCritical = med.stockQuantity <= Math.floor(med.reorderLevel * 0.5);
            return (
              <div key={med.medicineName} className="p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{med.medicineName}</p>
                    {med.rackLocation && <p className="text-[10px] text-muted-foreground mt-0.5">Rack: {med.rackLocation}</p>}
                  </div>
                  <span className={cn(
                    'text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0',
                    isCritical
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  )}>
                    {med.stockQuantity} left
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', isCritical ? 'bg-rose-500' : 'bg-orange-500')} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">Reorder: {med.reorderLevel}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">All stocks are adequate ✓</p>
      )}
      <button type="button" onClick={() => onNavigate('/purchases')}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
        Create Purchase Order <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

function ExpiringPanel({ dashboard, onNavigate }: ModalPanelProps) {
  return (
    <>
      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800 mb-6 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/40">
          <Clock className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{dashboard.stats.expiringCount} medicines expiring within 30 days</p>
          <p className="text-xs text-rose-600/70 mt-0.5">Review and take action before expiry</p>
        </div>
      </div>
      {dashboard.expiringMedicines.length > 0 ? (
        <div className="space-y-2.5">
          {dashboard.expiringMedicines.map((med) => {
            const days = daysUntil(med.expiryDate);
            const urgent = days <= 7;
            return (
              <div key={`${med.medicineName}-${med.batchNumber}`} className={cn(
                'p-3 rounded-xl border bg-card flex items-center gap-3',
                urgent ? 'border-rose-300 dark:border-rose-800' : 'border-border'
              )}>
                <div className={cn('w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white font-bold', urgent ? 'bg-rose-500' : 'bg-amber-500')}>
                  <span className="text-sm leading-none">{days}</span>
                  <span className="text-[8px] leading-none mt-0.5">days</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{med.medicineName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {med.batchNumber && <span className="font-mono mr-2">#{med.batchNumber}</span>}
                    Expires: {formatDate(med.expiryDate)} · Stock: {med.stockQuantity}
                  </p>
                </div>
                {urgent && (
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full flex-shrink-0">
                    URGENT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">No medicines expiring soon ✓</p>
      )}
      <button type="button" onClick={() => onNavigate('/medicines')}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors">
        Review Inventory <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

function CustomersPanel({ dashboard, onNavigate }: ModalPanelProps) {
  return (
    <>
      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-6 border border-teal-100 dark:border-teal-800 mb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-3">
          <Users className="w-8 h-8 text-white" />
        </div>
        <p className="text-4xl font-bold text-teal-700 dark:text-teal-400">{dashboard.stats.totalCustomers.toLocaleString()}</p>
        <p className="text-sm text-teal-600 mt-1">Registered Customers</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Month Invoices</p>
              <p className="text-xs text-muted-foreground">Billed this month</p>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{dashboard.stats.monthInvoices}</span>
        </div>
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Month Sales</p>
              <p className="text-xs text-muted-foreground">Revenue from customers</p>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{formatCurrency(dashboard.stats.monthSales)}</span>
        </div>
      </div>
      <button type="button" onClick={() => onNavigate('/customers')}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors">
        View All Customers <ChevronRight className="w-4 h-4" />
      </button>
    </>
  );
}

function SuppliersPanel({ dashboard, onNavigate }: ModalPanelProps) {
  return (
    <>
      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-6 border border-cyan-100 dark:border-cyan-800 mb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center mx-auto mb-3">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <p className="text-4xl font-bold text-cyan-700 dark:text-cyan-400">{dashboard.stats.totalSuppliers.toLocaleString()}</p>
        <p className="text-sm text-cyan-600 mt-1">Active Suppliers</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <Package className="w-4 h-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Low Stock Items</p>
              <p className="text-xs text-muted-foreground">Pending reorder</p>
            </div>
          </div>
          <span className={cn('text-lg font-bold', dashboard.stats.lowStockCount > 0 ? 'text-orange-600' : 'text-foreground')}>
            {dashboard.stats.lowStockCount}
          </span>
        </div>
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <PackagePlus className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Total Medicines</p>
              <p className="text-xs text-muted-foreground">From all suppliers</p>
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{dashboard.stats.totalMedicines}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <button type="button" onClick={() => onNavigate('/suppliers')}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors">
          View Suppliers <ChevronRight className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onNavigate('/purchases')}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
          Purchases <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

const MODAL_PANELS: Record<string, ComponentType<ModalPanelProps>> = {
  today_sales: TodaySalesPanel,
  month_sales: MonthSalesPanel,
  year_sales: YearSalesPanel,
  medicines: MedicinesPanel,
  low_stock: LowStockPanel,
  expiring: ExpiringPanel,
  customers: CustomersPanel,
  suppliers: SuppliersPanel,
};

// ── Main page component ────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: paymentData } = useQuery({
    queryKey: ['payment-breakdown'],
    queryFn: () => api.get('/dashboard/payment-breakdown').then((r) => r.data.data),
  });

  const dashboard = data?.data;

  const KPI_CARDS = [
    { id: 'today_sales', label: "Today's Sales", value: formatCurrency(dashboard?.stats.todaySales || 0), sub: `${dashboard?.stats.todayInvoices || 0} invoices`, icon: TrendingUp, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', alert: false, accent: 'border-l-2 border-l-emerald-500' },
    { id: 'month_sales', label: 'Month Sales', value: formatCurrency(dashboard?.stats.monthSales || 0), sub: `${dashboard?.stats.monthInvoices || 0} invoices`, icon: ShoppingBag, iconColor: 'text-sky-600', iconBg: 'bg-sky-50 dark:bg-sky-900/20', alert: false, accent: 'border-l-2 border-l-sky-500' },
    { id: 'year_sales', label: 'Year Sales', value: formatCurrency(dashboard?.stats.yearSales || 0), sub: 'Current year', icon: FileBarChart2, iconColor: 'text-violet-600', iconBg: 'bg-violet-50 dark:bg-violet-900/20', alert: false, accent: 'border-l-2 border-l-violet-500' },
    { id: 'medicines', label: 'Total Medicines', value: (dashboard?.stats.totalMedicines || 0).toLocaleString(), sub: 'Active items', icon: Package, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50 dark:bg-indigo-900/20', alert: false, accent: 'border-l-2 border-l-indigo-500' },
    { id: 'low_stock', label: 'Low Stock', value: (dashboard?.stats.lowStockCount || 0).toLocaleString(), sub: 'Need reorder', icon: AlertTriangle, iconColor: 'text-orange-600', iconBg: 'bg-orange-50 dark:bg-orange-900/20', alert: (dashboard?.stats.lowStockCount || 0) > 0, accent: 'border-l-2 border-l-orange-500' },
    { id: 'expiring', label: 'Expiring Soon', value: (dashboard?.stats.expiringCount || 0).toLocaleString(), sub: 'Within 30 days', icon: AlertCircle, iconColor: 'text-rose-600', iconBg: 'bg-rose-50 dark:bg-rose-900/20', alert: (dashboard?.stats.expiringCount || 0) > 0, accent: 'border-l-2 border-l-rose-500' },
    { id: 'customers', label: 'Customers', value: (dashboard?.stats.totalCustomers || 0).toLocaleString(), sub: 'Registered', icon: Users, iconColor: 'text-teal-600', iconBg: 'bg-teal-50 dark:bg-teal-900/20', alert: false, accent: 'border-l-2 border-l-teal-500' },
    { id: 'suppliers', label: 'Suppliers', value: (dashboard?.stats.totalSuppliers || 0).toLocaleString(), sub: 'Active', icon: Truck, iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50 dark:bg-cyan-900/20', alert: false, accent: 'border-l-2 border-l-cyan-500' },
  ];

  const QUICK_ACTIONS = [
    { label: 'New Invoice', icon: ShoppingCart, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', path: '/billing' },
    { label: 'Add Medicine', icon: PlusCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', path: '/medicines' },
    { label: 'New Purchase', icon: PackagePlus, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', path: '/purchases' },
    { label: 'View Reports', icon: FileBarChart2, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', path: '/reports' },
  ];

  const chartData = (dashboard?.monthlySalesChart || []).map((d) => ({
    month: d.month.slice(5),
    sales: d.total,
    count: d.count,
  }));

  const pieData = (paymentData || []).map((p: { paymentMethod: string; _sum: { totalAmount: number }; _count: { id: number } }) => ({
    name: p.paymentMethod,
    value: Number(p._sum.totalAmount || 0),
    count: p._count.id,
  }));

  const activeCard = KPI_CARDS.find((c) => c.id === activeModal);

  const handleNavigate = (path: string) => {
    setActiveModal(null);
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {['sk-1','sk-2','sk-3','sk-4','sk-5','sk-6','sk-7','sk-8'].map((key) => (
            <div key={key} className="h-24 rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const ModalPanel = activeModal ? MODAL_PANELS[activeModal] : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors border border-border"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.path)}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-card
                       hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary/20
                       transition-all duration-200 text-left group"
          >
            <div className={cn('p-2 rounded-lg flex-shrink-0 transition-transform group-hover:scale-110', action.bg)}>
              <action.icon className={cn('w-4 h-4', action.color)} />
            </div>
            <span className="text-sm font-medium text-foreground">{action.label}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {KPI_CARDS.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setActiveModal(card.id)}
            className={cn(
              'kpi-card text-left cursor-pointer group',
              'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary/30',
              'transition-all duration-200',
              card.accent,
              card.alert && 'ring-1 ring-orange-200 dark:ring-orange-900/50'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn('p-1.5 rounded-lg transition-transform group-hover:scale-110', card.iconBg)}>
                <card.icon className={cn('w-4 h-4', card.iconColor)} />
              </div>
              {card.alert && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse-dot" />}
            </div>
            <p className="text-xl font-bold text-foreground leading-none">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">{card.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
            <p className="text-[9px] text-primary/60 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
              Click for details →
            </p>
          </button>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 stat-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground">Monthly Sales Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 12 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full font-medium">
              <ArrowUp className="w-3 h-3" />
              {chartData.length > 1 && (chartData.at(-1)?.sales ?? 0) > (chartData.at(-2)?.sales ?? 0) ? 'Growing' : 'Trending'}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Sales']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="sales" stroke="#0284c7" fill="url(#salesGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#0284c7', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-1">Payment Methods</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution by amount</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry: { name: string }) => (
                      <Cell key={entry.name} fill={PAYMENT_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {pieData.map((entry: { name: string; value: number; count: number }) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PAYMENT_COLORS[entry.name] || '#94a3b8' }} />
                    <span className="text-muted-foreground truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-muted-foreground text-sm">No payment data</div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 stat-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Recent Invoices</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Latest transactions</p>
            </div>
            <a href="/billing" className="text-xs text-primary flex items-center gap-1 hover:underline font-medium">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-5">Invoice #</th><th>Customer</th><th>Amount</th><th>Status</th><th className="pr-5">Date</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.recentInvoices || []).map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs font-semibold pl-5">{inv.invoiceNumber}</td>
                    <td>{inv.customer?.name || <span className="text-muted-foreground italic text-xs">Walk-in</span>}</td>
                    <td className="font-semibold">{formatCurrency(inv.totalAmount)}</td>
                    <td><span className={STATUS_CLASS[inv.status] || 'badge-status-draft'}>{inv.status}</span></td>
                    <td className="text-muted-foreground text-xs pr-5">{formatDate(inv.invoiceDate)}</td>
                  </tr>
                ))}
                {!(dashboard?.recentInvoices?.length) && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-10">No invoices yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="stat-card border-l-2 border-l-orange-400">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Low Stock
              <span className="ml-auto text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full px-2 py-0.5">
                {dashboard?.stats.lowStockCount || 0}
              </span>
            </h3>
            <div className="space-y-2.5 max-h-44 overflow-y-auto scrollbar-hide">
              {(dashboard?.lowStockMedicines || []).map((med) => (
                <div key={med.medicineName} className="flex items-center justify-between gap-2">
                  <span className="truncate flex-1 text-sm text-foreground">{med.medicineName}</span>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full flex-shrink-0">{med.stockQuantity} left</span>
                </div>
              ))}
              {!(dashboard?.lowStockMedicines?.length) && <p className="text-sm text-muted-foreground">All stocks adequate ✓</p>}
            </div>
          </div>

          <div className="stat-card border-l-2 border-l-rose-400">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              Expiring Soon
              <span className="ml-auto text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full px-2 py-0.5">
                {dashboard?.stats.expiringCount || 0}
              </span>
            </h3>
            <div className="space-y-2.5 max-h-44 overflow-y-auto scrollbar-hide">
              {(dashboard?.expiringMedicines || []).map((med) => (
                <div key={med.medicineName} className="flex items-center justify-between gap-2">
                  <span className="truncate flex-1 text-sm text-foreground">{med.medicineName}</span>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full flex-shrink-0">{formatDate(med.expiryDate)}</span>
                </div>
              ))}
              {!(dashboard?.expiringMedicines?.length) && <p className="text-sm text-muted-foreground">No medicines expiring soon ✓</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Detail Modal ── */}
      {activeModal && ModalPanel && dashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-modal animate-scale-in overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
              {activeCard && (
                <div className={cn('p-2 rounded-lg', activeCard.iconBg)}>
                  <activeCard.icon className={cn('w-5 h-5', activeCard.iconColor)} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground">{activeCard?.label}</h2>
                <p className="text-xs text-muted-foreground">{activeCard?.sub}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <ModalPanel dashboard={dashboard} onNavigate={handleNavigate} chartData={chartData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
