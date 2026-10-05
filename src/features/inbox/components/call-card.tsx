import { Loader2, Phone, Play } from 'lucide-react';

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
    <div className="mx-auto my-2 flex max-w-sm flex-col gap-1.5 rounded-2xl bg-card px-3.5 py-2.5 text-sm text-muted-foreground shadow-soft">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-wash">
          <Phone className="h-4 w-4 text-success-ink" />
        </span>
        <span className="font-semibold text-foreground">{label}</span>
        {senderName && <span>· {senderName}</span>}
        {dur && <span className="font-mono tabular-nums">· {dur}</span>}
        {content?.recordingUrl && (
          <a href={content.recordingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Play aria-hidden="true" className="h-3.5 w-3.5" /> Ouvir gravação
          </a>
        )}
      </div>
      {insightPending && (
        <p role="status" className="flex items-center gap-1.5 text-[13px]">
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> Gerando resumo…
        </p>
      )}
      {insightReady && (
        <p className="line-clamp-2 text-[13px] leading-snug">{content.insight.summary}</p>
      )}
    </div>
  );
}
