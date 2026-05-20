import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/api/axios';
import { formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800',
  UPDATE: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-800',
  DELETE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800',
  LOGIN:  'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-800',
  EXPORT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ tableName: '', startDate: '', endDate: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => api.get('/audit-logs', { params: { page, limit: 25, ...filters } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const logs = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="text-muted-foreground text-sm">Complete activity history</p>
        </div>
        {meta.total > 0 && (
          <span className="text-sm text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full shadow-card">
            {meta.total} records
          </span>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-card flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label>Table</Label>
          <select
            value={filters.tableName}
            onChange={(e) => setFilters((p) => ({ ...p, tableName: e.target.value }))}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm hover:border-primary/30 transition-colors"
          >
            <option value="">All Tables</option>
            {['medicines', 'invoices', 'purchases', 'customers', 'suppliers', 'users'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" value={filters.startDate} onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))} className="w-44" />
        </div>
        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input type="date" value={filters.endDate} onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))} className="w-44" />
        </div>
        {(filters.tableName || filters.startDate || filters.endDate) && (
          <Button variant="outline" size="sm" onClick={() => setFilters({ tableName: '', startDate: '', endDate: '' })} className="h-9">
            Clear Filters
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Description</th>
                <th>IP Address</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && ['sk-1','sk-2','sk-3','sk-4','sk-5','sk-6','sk-7','sk-8','sk-9','sk-10'].map((key) => (
                <tr key={key}><td colSpan={6}><div className="h-9 animate-shimmer rounded-lg my-1 mx-2" /></td></tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">No audit logs found</p>
                    <p className="text-xs mt-1">Activity will appear here as changes are made</p>
                  </td>
                </tr>
              )}
              {!isLoading && logs.map((log: Record<string, unknown>) => (
                <tr key={log.id as string}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-sky-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {((log.user as { username: string } | null)?.username || 'S')[0].toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{(log.user as { username: string } | null)?.username || 'System'}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_STYLES[log.action as string] || 'bg-gray-100 text-gray-800'}`}>
                      {log.action as string}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {log.tableName as string || '—'}
                    </span>
                  </td>
                  <td className="text-sm text-foreground max-w-xs truncate">{log.description as string || '—'}</td>
                  <td className="text-xs text-muted-foreground font-mono">{log.ipAddress as string || '—'}</td>
                  <td className="text-xs text-muted-foreground whitespace-nowrap">{typeof log.createdAt === 'string' ? formatDateTime(log.createdAt) : '—'}</td>
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
    </div>
  );
}
