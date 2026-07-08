import type { LucideIcon } from 'lucide-react';

export const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export type StatTone = 'violet' | 'emerald' | 'amber' | 'sky';

// classes literais (Tailwind precisa vê-las inteiras no source)
const TONES: Record<StatTone, { grad: string; chip: string; ring: string }> = {
  violet: {
    grad: 'from-violet-500/10 dark:from-violet-500/15',
    chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    ring: 'group-hover:ring-violet-500/30',
  },
  emerald: {
    grad: 'from-emerald-500/10 dark:from-emerald-500/15',
    chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    ring: 'group-hover:ring-emerald-500/30',
  },
  amber: {
    grad: 'from-amber-500/10 dark:from-amber-500/15',
    chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    ring: 'group-hover:ring-amber-500/30',
  },
  sky: {
    grad: 'from-sky-500/10 dark:from-sky-500/15',
    chip: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
    ring: 'group-hover:ring-sky-500/30',
  },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'violet',
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 ${t.ring}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.grad} to-transparent`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
          {hint ? <p className="mt-1 text-xs text-zinc-400">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${t.chip}`}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
