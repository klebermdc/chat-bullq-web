import { Phone } from 'lucide-react';

const LABELS: Record<string, string> = {
  DIALING: 'Ligação iniciada',
  RINGING: 'Chamando…',
  TALKING: 'Em conversa…',
  ANSWERED: 'Atendida',
  FINISHED: 'Ligação encerrada',
  NO_ANSWER: 'Não atendida',
  BUSY: 'Ocupado',
  FAILED: 'Falha ao iniciar',
};

function fmtDur(sec?: number) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${String(s).padStart(2, '0')}s`;
}

export function CallCard({ content, senderName }: { content: any; senderName?: string | null }) {
  const label = LABELS[content?.status] ?? 'Ligação';
  const dur = fmtDur(content?.durationSec);
  const insightReady = content?.insightState === 'READY' && content?.insight?.summary;
  const insightPending = content?.insightState === 'PENDING';
  return (
    <div className="mx-auto my-2 flex max-w-sm flex-col gap-1 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-emerald-600" />
        <span className="font-medium">📞 {label}</span>
        {senderName && <span className="opacity-70">· {senderName}</span>}
        {dur && <span>· {dur}</span>}
        {content?.recordingUrl && (
          <a href={content.recordingUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">▶️ gravação</a>
        )}
      </div>
      {insightPending && <p className="text-xs opacity-70">⏳ gerando resumo…</p>}
      {insightReady && (
        <p className="line-clamp-2 text-xs opacity-80">{content.insight.summary}</p>
      )}
    </div>
  );
}
