type Source = 'CTWA' | 'SITE_FORM' | 'ORGANIC' | null | undefined;

const MAP: Record<'CTWA' | 'SITE_FORM' | 'ORGANIC', { label: string; className: string; title: string }> = {
  CTWA:      { label: 'Anúncio',  className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', title: 'Veio de anúncio Click-to-WhatsApp' },
  SITE_FORM: { label: 'Site',     className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',          title: 'Veio do formulário do site' },
  ORGANIC:   { label: 'Orgânico', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',      title: 'Sem origem rastreada' },
};

/**
 * Selo informativo de origem do lead (Anúncio / Site / Orgânico). Puramente
 * presentacional: recebe `source` já carregado via props e auto-oculta
 * (renderiza `null`) quando não há origem, então pode ser montado
 * incondicionalmente ao lado do ChannelBadge / nas linhas de contato.
 */
export function SourceBadge({ source }: { source: Source }) {
  if (!source) return null;
  const cfg = MAP[source];
  if (!cfg) return null;
  return (
    <span
      title={cfg.title}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
