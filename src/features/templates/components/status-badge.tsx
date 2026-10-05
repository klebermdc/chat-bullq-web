const MAP: Record<string,{label:string;cls:string}> = {
  DRAFT:{label:'Rascunho',cls:'bg-muted text-muted-foreground'},
  PENDING:{label:'Pendente',cls:'bg-warning-wash text-warning-ink'},
  APPROVED:{label:'Aprovado',cls:'bg-success-wash text-success-ink'},
  REJECTED:{label:'Rejeitado',cls:'bg-urgent-wash text-urgent-ink'},
  PAUSED:{label:'Pausado',cls:'bg-warning-wash text-warning-ink'},
  DISABLED:{label:'Desativado',cls:'bg-muted text-muted-foreground'},
};
export function StatusBadge({ status, reason }:{ status:string; reason?:string|null }) {
  const s = MAP[status] ?? { label:status, cls:'bg-muted text-muted-foreground' };
  return <span title={reason ?? undefined} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
