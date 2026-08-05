'use client';

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
        <div className="absolute inset-x-0 top-0 z-10 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600">
          {error ?? 'Não consegui atualizar a prévia.'} Mostrando a última versão — seu conteúdo
          está salvo aqui na tela.
        </div>
      )}
      {loading && !html && (
        <p className="p-4 text-sm text-muted-foreground">Gerando prévia…</p>
      )}
      {/* iframe e não div: o HTML de email traz <html>, <body> e estilos
          próprios, que injetados na página contaminariam o CSS do app. */}
      <iframe
        title="Prévia do email"
        srcDoc={html}
        sandbox=""
        className="h-full w-full rounded-lg border bg-white"
      />
    </div>
  );
}
