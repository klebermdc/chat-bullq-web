'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/errors';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import type { Proposal } from '@/features/proposals/types';
import { draftFromPreview, previewFromSaved, validateQuoteDraft, type QuoteDraft } from '../lib/quote-draft';
import { formatQuoteNumber } from '../lib/quote-format';
import { QuoteEditor } from './editor/quote-editor';
import { notifyQuoteUpdated } from './quote-sent-toast';

const SAVE_FALLBACK = 'Não consegui atualizar a cotação. Confere os campos e tenta de novo.';

interface Props {
  proposal: Proposal;
  onClose: () => void;
}

/** Rascunho inicial = a cotação que o cliente já recebeu (sem ler print de novo). */
function useSavedDraft(proposal: Proposal) {
  const seq = useRef(0);
  return useState<QuoteDraft | null>(() => {
    const preview = previewFromSaved(proposal.details);
    return preview ? draftFromPreview(preview, () => `quote-item-${++seq.current}`) : null;
  });
}

/**
 * Atualizar uma cotação por link já enviada: abre o editor com o que está na
 * página, o atendente muda só o que mudou e salva. Mesmo link; a validade
 * recomeça agora. Montado só enquanto aberto, então sempre parte da versão atual.
 */
export function QuoteUpdateDialog({ proposal, onClose }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useSavedDraft(proposal);
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currency = proposal.details?.quote?.currency ?? proposal.currency;
  const title = proposal.quoteNumber ? `Atualizar cotação nº ${formatQuoteNumber(proposal.quoteNumber)}` : 'Atualizar cotação';

  async function save() {
    if (!draft || saving) return;
    const result = validateQuoteDraft(draft, currency);
    if (!result.ok) {
      setError(result.errors.join('\n'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await proposalsService.updateQuote(proposal.id, { ...result.value, notify, version: proposal.quoteVersion });
      notifyQuoteUpdated(updated?.quoteUrl, notify);
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, SAVE_FALLBACK));
    } finally {
      setSaving(false);
    }
  }

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog
      open
      onClose={close}
      title={title}
      size="lg"
      // Com edição na tela, Esc/clique fora perguntam antes de descartar.
      dismissible={false}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={!draft} loading={saving}>
            {!saving && <RefreshCw aria-hidden="true" className="h-4 w-4" />}
            {notify ? 'Salvar e avisar o cliente' : 'Salvar sem avisar'}
          </Button>
        </>
      }
    >
      {draft ? (
        <div className="space-y-4">
          <QuoteEditor draft={draft} currency={currency} disabled={saving} onChange={setDraft} mode="update" />
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={notify}
              disabled={saving}
              onChange={(e) => setNotify(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              Avisar o cliente pelo WhatsApp
              <span className="block text-xs text-muted-foreground">
                Vai a mensagem &quot;Atualizei sua cotação&quot; com o mesmo link e o lembrete de que os valores em reais
                seguem o câmbio do dólar.
              </span>
            </span>
          </label>
          {error && (
            <p role="alert" className="whitespace-pre-line rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Esta cotação foi enviada antes do editor e não tem os itens gravados. Gere uma nova pelo botão de proposta.
        </p>
      )}
    </Dialog>
  );
}
