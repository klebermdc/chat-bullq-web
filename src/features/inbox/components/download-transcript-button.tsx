'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { inboxService } from '../services/inbox.service';

type DownloadTranscriptButtonProps = {
  conversationId: string;
};

/**
 * Baixa o histórico do cliente em PDF.
 *
 * O download não pode ser um `<a href>`: o token vai no header, não em cookie,
 * então o link nu voltaria 401. Busca o blob pela mesma camada autenticada e
 * dispara o download por object URL.
 */
export function DownloadTranscriptButton({ conversationId }: DownloadTranscriptButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    let objectUrl: string | null = null;
    try {
      const { blob, fileName } = await inboxService.downloadTranscript(conversationId);
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.click();
    } catch {
      // Falha aqui precisa aparecer: um download que não acontece em silêncio
      // faz o atendente achar que o arquivo saiu.
      toast.error('Não foi possível gerar o PDF. Tente de novo.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isGenerating}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-opacity hover:opacity-80 disabled:opacity-60"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Gerando PDF…
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Baixar histórico em PDF
        </>
      )}
    </button>
  );
}
