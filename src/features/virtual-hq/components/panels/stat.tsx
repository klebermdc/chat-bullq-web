export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

/** Aviso curto no lugar dos números, quando não há dado (nunca inventamos número). */
export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">{children}</p>;
}

export const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
