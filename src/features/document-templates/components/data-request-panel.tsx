'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import { copyText } from '../lib/copy-link';
import { dataRequestFeedback } from '../lib/data-request-feedback';
import { placeholderLabel } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import { FillPanel } from './fill-panel';

interface DataRequestPanelProps {
  conversationId: string;
  templateId: string;
  onClose: () => void;
}

const WARNING_DURATION_MS = 15_000;
const COPIED_MESSAGE = 'Texto copiado.';

/**
 * "Pedir dados ao cliente": mostra a mensagem que a API monta com os dados
 * que faltam e deixa enviar na conversa ou copiar.
 */
export function DataRequestPanel({ conversationId, templateId, onClose }: DataRequestPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const preview = useQuery({
    queryKey: ['contract-data-request', conversationId, templateId],
    queryFn: () => documentTemplatesService.requestClientData(conversationId, templateId, false),
    gcTime: 0,
    retry: false,
  });

  async function send() {
    if (isSending) return;
    setIsSending(true);
    try {
      const result = await documentTemplatesService.requestClientData(conversationId, templateId, true);
      if (!result.ok) {
        toast.info(result.message);
        return;
      }
      const feedback = dataRequestFeedback(result.send);
      if (feedback.kind === 'success') {
        toast.success(feedback.message);
        onClose();
        return;
      }
      const text = result.text;
      toast.warning(feedback.message, {
        duration: WARNING_DURATION_MS,
        action: text ? { label: 'Copiar texto', onClick: () => void copyText(text, COPIED_MESSAGE) } : undefined,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível enviar o pedido.'));
    } finally {
      setIsSending(false);
    }
  }

  const data = preview.data;

  return (
    <FillPanel title="Pedir dados ao cliente" onClose={onClose}>
      {preview.isLoading ? (
        <LoadingState label="Montando a mensagem…" />
      ) : preview.isError || !data ? (
        <div role="alert" className="space-y-2 text-sm text-foreground">
          <p>{getErrorMessage(preview.error, 'Não foi possível montar a mensagem.')}</p>
          <Button variant="outline" size="sm" onClick={() => preview.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : !data.ok ? (
        <p role="status" className="text-sm text-muted-foreground">{data.message}</p>
      ) : (
        <>
          {data.fields.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Pede: <span className="text-foreground">{data.fields.map(placeholderLabel).join(', ')}</span>
            </p>
          )}
          <p
            aria-label="Mensagem para o cliente"
            className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
          >
            {data.text}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyText(data.text, COPIED_MESSAGE)} disabled={!data.text}>
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copiar
            </Button>
            <Button size="sm" onClick={send} loading={isSending} disabled={isSending || !data.text}>
              {!isSending && <Send aria-hidden="true" className="h-4 w-4" />}
              Enviar na conversa
            </Button>
          </div>
        </>
      )}
    </FillPanel>
  );
}
