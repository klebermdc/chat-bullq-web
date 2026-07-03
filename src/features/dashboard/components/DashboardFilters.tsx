'use client';

import type { DashboardFilters as Filters } from '@/features/dashboard/services/dashboard.service';

const PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DashboardFilters({
  filters, onChange, channels, sellers, departments, canFilterSeller,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  channels: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  canFilterSeller: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const selectCls =
    'rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => set({ from: isoDaysAgo(p.days), to: new Date().toISOString().slice(0, 10) })}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            {p.label}
          </button>
        ))}
      </div>

      <input type="date" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value })} className={selectCls} />
      <input type="date" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value })} className={selectCls} />

      <select value={filters.channelId ?? ''} onChange={(e) => set({ channelId: e.target.value || undefined })} className={selectCls}>
        <option value="">Todos os canais</option>
        {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select value={filters.departmentId ?? ''} onChange={(e) => set({ departmentId: e.target.value || undefined })} className={selectCls}>
        <option value="">Todos os departamentos</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })} className={selectCls}>
        <option value="">Todos os status</option>
        {['PENDING', 'OPEN', 'WAITING', 'CLOSED', 'BOT'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {canFilterSeller && (
        <select value={filters.assignedToId ?? ''} onChange={(e) => set({ assignedToId: e.target.value || undefined })} className={selectCls}>
          <option value="">Todos os vendedores</option>
          {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  );
}
