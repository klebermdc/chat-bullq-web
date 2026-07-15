'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, ChevronDown, ChevronRight } from 'lucide-react';
import { callsService } from '../services/calls.service';

const SENTIMENT: Record<string, string> = {
  positivo: '🙂 Positivo',
  neutro: '😐 Neutro',
  negativo: '⚠️ Negativo',
};

function fmtDur(sec?: number | null) {
  if (sec == null) return null;
  return `${Math.floor(sec / 60)}m${String(sec % 60).padStart(2, '0')}s`;
}

export function CallInsightBlock({ conversationId }: { conversationId: string }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const { data } = useQuery({
    queryKey: ['call-insight', conversationId],
    queryFn: () => callsService.getLatestInsight(conversationId),
    // enquanto o resumo está sendo gerado (gravação assíncrona), re-busca sozinho
    refetchInterval: (q) =>
      q.state.data?.hasCall && q.state.data?.insightState === 'PENDING' ? 15000 : false,
  });
  const transcriptQ = useQuery({
    queryKey: ['call-transcript', data?.callId],
    queryFn: () => callsService.getTranscript(conversationId, data!.callId!),
    enabled: showTranscript && !!data?.callId && !!data?.hasTranscript,
  });

  if (!data?.hasCall) return null;
  const dur = fmtDur(data.durationSec);

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
        <Phone className="h-4 w-4 text-emerald-600" />
        Resumo da última ligação
        {dur && <span className="font-normal text-muted-foreground">· {dur}</span>}
      </div>

      {data.insightState === 'PENDING' && (
        <p className="text-muted-foreground">⏳ Gerando resumo da ligação…</p>
      )}
      {(data.insightState === 'FAILED' || data.insightState === 'SKIPPED') && !data.insight && (
        <p className="text-muted-foreground">Resumo indisponível para esta ligação.</p>
      )}

      {data.insight && (
        <div className="space-y-2">
          <p className="text-foreground">{data.insight.summary}</p>
          {data.insight.nextSteps?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Próximos passos</p>
              <ul className="ml-4 list-disc text-foreground">
                {data.insight.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {SENTIMENT[data.insight.sentiment] ?? data.insight.sentiment}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs">
        {data.recordingUrl && (
          <a
            href={data.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 underline"
          >
            ▶️ ouvir gravação
          </a>
        )}
        {data.hasTranscript && (
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {showTranscript ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            transcrição
          </button>
        )}
      </div>
      {showTranscript && (
        <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs text-muted-foreground">
          {transcriptQ.data?.transcript ?? 'carregando…'}
        </p>
      )}
    </div>
  );
}
