const MAP: Record<string,{label:string;cls:string}> = {
  DRAFT:{label:'Rascunho',cls:'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'},
  PENDING:{label:'Pendente',cls:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'},
  APPROVED:{label:'Aprovado',cls:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'},
  REJECTED:{label:'Rejeitado',cls:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'},
  PAUSED:{label:'Pausado',cls:'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'},
  DISABLED:{label:'Desativado',cls:'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'},
};
export function StatusBadge({ status, reason }:{ status:string; reason?:string|null }) {
  const s = MAP[status] ?? { label:status, cls:'bg-zinc-100 text-zinc-600' };
  return <span title={reason ?? undefined} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
