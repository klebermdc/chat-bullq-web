'use client';

import { LoadingState } from '@/components/ui/empty-state';

export function EmailPreview({
  html,
  stale,
  loading,
  error,
}: {
  html: string;
  stale: boolean;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="relative h-full">
      {stale && (
        <div
          role="status"
          className="absolute inset-x-0 top-0 z-10 rounded-t-xl bg-warning-wash px-3 py-1.5 text-xs text-warning-ink"
        >
          {error ?? 'Não foi possível atualizar a prévia.'} Mostrando a última versão — seu conteúdo
          está salvo aqui na tela.
        </div>
      )}
      {loading && !html && (
        <LoadingState
          label="Gerando prévia…"
          className="absolute inset-x-0 top-0 z-10 rounded-t-xl border border-border bg-card py-3"
        />
      )}
      {/* iframe e não div: o HTML de email traz <html>, <body> e estilos
          próprios, que injetados na página contaminariam o CSS do app. */}
      <iframe
        title="Prévia do email"
        srcDoc={html}
        sandbox=""
        className="h-full w-full rounded-xl border border-border bg-white shadow-soft"
      />
    </div>
  );
}
