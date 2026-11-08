import { ChevronDown, Sparkles } from 'lucide-react';

/** Ficha que a Aline grava em conversation.metadata.handoffBrief ao transferir. */
export interface HandoffBrief {
  summary?: string;
  destination?: string;
  travelDates?: string;
  travelers?: string;
  budget?: string;
  pendingQuestions?: string;
  at?: string;
}

const TEXT_FIELDS = [
  'summary',
  'destination',
  'travelDates',
  'travelers',
  'budget',
  'pendingQuestions',
] as const;

const FIELD_ROWS: { key: (typeof TEXT_FIELDS)[number]; label: string }[] = [
  { key: 'destination', label: 'Destino' },
  { key: 'travelDates', label: 'Quando' },
  { key: 'travelers', label: 'Quem viaja' },
  { key: 'budget', label: 'Orçamento' },
  { key: 'pendingQuestions', label: 'Falta perguntar' },
];

/** Lê a ficha do metadata (dado externo): só aceita texto; null se vazia. */
export function readHandoffBrief(metadata: unknown): HandoffBrief | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).handoffBrief;
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;

  const fields = Object.fromEntries(
    TEXT_FIELDS.map((key) => [key, typeof source[key] === 'string' ? source[key].trim() : ''])
      .filter(([, value]) => value),
  ) as HandoffBrief;
  if (Object.keys(fields).length === 0) return null;
  return typeof source.at === 'string' ? { ...fields, at: source.at } : fields;
}

interface Props {
  brief: HandoffBrief;
  /** Aberta enquanto o cliente espera a 1ª resposta; depois fica recolhida. */
  isOpen: boolean;
}

/**
 * Faixa acima do campo de mensagem com o que a Aline levantou antes de passar
 * a conversa: o vendedor responde sem reler tudo. Recolhida, a linha de cima
 * já mostra destino, datas e quem viaja.
 */
export function HandoffBriefBanner({ brief, isOpen }: Props) {
  const headline = [brief.destination, brief.travelDates, brief.travelers].filter(Boolean).join(' · ');
  const rows = FIELD_ROWS.filter(({ key }) => brief[key]);

  return (
    <details open={isOpen} className="group border-t border-border bg-primary/5 text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 md:min-h-9 [&::-webkit-details-marker]:hidden">
        <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
        <span className="shrink-0 font-semibold text-foreground">Resumo da Aline</span>
        {headline && <span className="min-w-0 truncate text-muted-foreground">{headline}</span>}
        <ChevronDown
          aria-hidden="true"
          className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="max-h-48 space-y-2 overflow-y-auto px-4 pb-3 pl-10">
        {rows.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {rows.map(({ key, label }) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words text-foreground">{brief[key]}</dd>
              </div>
            ))}
          </dl>
        )}
        {brief.summary && <p className="whitespace-pre-line break-words text-foreground">{brief.summary}</p>}
      </div>
    </details>
  );
}
