'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import {
  discardVisit,
  fetchVisit,
  requestEvaluation,
  SHOPPER_KEY,
  updateScenario,
  visitQueryKey,
  type VisitDetail,
  type VisitLine,
} from '../api';
import { findLineForEvidence, scoreLabel, STATUS_BADGE, STATUS_LABEL } from '../format';

const ROLE_LABEL: Record<VisitLine['role'], string> = {
  CLIENTE: 'Cliente oculto',
  VENDEDOR: 'Vendedor',
  AUTOMATICA: 'IA / automática',
  EQUIPE: 'Equipe (outro)',
};
const EVALUATING_REFRESH_MS = 10_000;

export function VisitTranscript({ lines }: { lines: VisitLine[] }) {
  return (
    <ol className="space-y-2" aria-label="Conversa">
      {lines.map((line) => (
        <li
          key={line.messageId}
          id={`msg-${line.messageId}`}
          className={cn(
            'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
            line.role === 'CLIENTE' && 'bg-muted text-foreground',
            line.role === 'VENDEDOR' && 'ml-auto bg-bubble text-bubble-foreground',
            (line.role === 'AUTOMATICA' || line.role === 'EQUIPE') &&
              'ml-auto bg-muted/50 text-muted-foreground opacity-70',
          )}
        >
          <p className="mb-0.5 text-xs font-medium">{ROLE_LABEL[line.role]}</p>
          <p className="whitespace-pre-wrap break-words">{line.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function VisitScores({ visit, onEvidence }: { visit: VisitDetail; onEvidence: (quote: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-3xl font-semibold">
        {visit.totalScore ?? '—'}/100
        <span className="ml-2 text-base font-normal text-muted-foreground">{visit.sellerName ?? 'Sem vendedor'}</span>
      </p>
      {visit.summary && <p className="text-sm">{visit.summary.summary}</p>}
      <ul className="space-y-2">
        {visit.scores.map((s) => (
          <li key={s.criterion} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">
                {s.score === null ? scoreLabel(null) : `${s.score}/2 · ${scoreLabel(s.score)}`}
              </span>
            </div>
            {s.comment && <p className="mt-1 text-muted-foreground">{s.comment}</p>}
            {s.evidence && (
              <button
                type="button"
                onClick={() => onEvidence(s.evidence)}
                className="mt-1 text-left text-xs italic text-primary underline-offset-2 hover:underline"
              >
                “{s.evidence}”
              </button>
            )}
          </li>
        ))}
      </ul>
      {visit.summary && (
        <div className="grid gap-3 sm:grid-cols-2">
          <PointList title="Pontos fortes" items={visit.summary.strengths} />
          <PointList title="A melhorar" items={visit.summary.improvements} />
        </div>
      )}
    </div>
  );
}

function PointList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <p className="mb-1 font-medium">{title}</p>
      <ul className="list-disc space-y-1 pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function VisitDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: visit, isLoading, isError } = useQuery({
    queryKey: visitQueryKey(id),
    queryFn: () => fetchVisit(id),
    refetchInterval: (query) => (query.state.data?.status === 'EVALUATING' ? EVALUATING_REFRESH_MS : false),
  });
  const [scenario, setScenario] = useState('');
  useEffect(() => setScenario(visit?.scenario ?? ''), [visit?.scenario]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: SHOPPER_KEY });
  const onError = (fallback: string) => (err: unknown) => toast.error(getErrorMessage(err, fallback));
  const evaluate = useMutation({
    mutationFn: () => requestEvaluation(id),
    onSuccess: () => {
      toast.success('Avaliação iniciada. Leva cerca de 1 minuto.');
      refresh();
    },
    onError: onError('Não foi possível iniciar a avaliação.'),
  });
  const discard = useMutation({
    mutationFn: () => discardVisit(id),
    onSuccess: () => {
      toast.success('Visita descartada.');
      refresh();
      onBack();
    },
    onError: onError('Não foi possível descartar.'),
  });
  const saveScenario = useMutation({
    mutationFn: () => updateScenario({ id, scenario }),
    onSuccess: () => {
      toast.success('Cenário salvo.');
      refresh();
    },
    onError: onError('Não foi possível salvar o cenário.'),
  });

  const goToEvidence = (quote: string) => {
    const messageId = visit ? findLineForEvidence(visit.lines, quote) : null;
    if (messageId) document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (isLoading) return <LoadingState label="Carregando visita…" />;
  if (isError || !visit) {
    return (
      <p role="alert" className="text-sm text-urgent-ink">
        Não foi possível carregar a visita.
      </p>
    );
  }

  const canEvaluate = ['OPEN', 'DONE', 'FAILED'].includes(visit.status);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Visitas
        </Button>
        <Badge variant={STATUS_BADGE[visit.status]}>{STATUS_LABEL[visit.status]}</Badge>
        {visit.error && <span className="text-xs text-urgent-ink">{visit.error}</span>}
        <div className="ml-auto flex gap-2">
          {canEvaluate && (
            <Button size="sm" loading={evaluate.isPending} onClick={() => evaluate.mutate()}>
              {visit.status === 'OPEN' ? 'Encerrar e avaliar agora' : 'Reavaliar'}
            </Button>
          )}
          {visit.status !== 'DISCARDED' && visit.status !== 'EVALUATING' && (
            <Button
              size="sm"
              variant="outline"
              loading={discard.isPending}
              onClick={() => {
                if (window.confirm('Descartar esta visita? Ela sai do ranking.')) discard.mutate();
              }}
            >
              Descartar
            </Button>
          )}
        </div>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          saveScenario.mutate();
        }}
      >
        <label htmlFor="scenario" className="sr-only">
          Cenário
        </label>
        <input
          id="scenario"
          value={scenario}
          maxLength={500}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="Cenário: ex. família de 4, julho, achou mais barato em outro site"
          className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <Button type="submit" size="sm" variant="secondary" loading={saveScenario.isPending}>
          Salvar cenário
        </Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-chat p-4">
          <VisitTranscript lines={visit.lines} />
        </section>
        <section>
          {visit.status === 'DONE' ? (
            <VisitScores visit={visit} onEvidence={goToEvidence} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {visit.status === 'EVALUATING' ? 'Avaliando… a página atualiza sozinha.' : 'A avaliação aparece aqui quando a visita fechar.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
