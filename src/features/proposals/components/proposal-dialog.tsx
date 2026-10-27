'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScanText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { proposalsService } from '../services/proposals.service';
import { usePrintIntake } from '../hooks/use-print-intake';
import { useProposalPrints } from '../hooks/use-proposal-prints';
import { ProposalPrintsField } from './proposal-prints-field';
import { MAX_PROPOSAL_PRINTS } from '../lib/print-intake';
import type { ProposalFormat, ProposalImageInput, ProposalMode, ProposalPreview, ReviewedProposal } from '../types';
import { getErrorMessage } from '@/lib/errors';
import { reviewTextIssue } from '../lib/proposal-review';
import { ProposalReviewPanel } from './proposal-review-panel';
import { useQuoteReview } from '@/features/quotes/hooks/use-quote-review';
import { QuoteEditor } from '@/features/quotes/components/editor/quote-editor';
import { ChoiceGroup } from '@/features/quotes/components/editor/editor-field';
import { notifyQuoteSent } from '@/features/quotes/components/quote-sent-toast';
import { validateQuoteDraft, type QuoteSubmission } from '@/features/quotes/lib/quote-draft';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** idle = parado; uploading = subindo os prints; reading = IA lendo; creating = enviando. */
type SubmitPhase = 'idle' | 'uploading' | 'reading' | 'creating';

// A proposta é montada só pelos prints: o envio com link do checkout saiu em 27/10/2026.
const NO_CHECKOUT_URL = '';

const READ_FALLBACK = 'Não consegui ler os prints. Confere as imagens e tenta de novo.';
const QUOTE_SEND_FALLBACK = 'Não consegui enviar a cotação. Confere os campos e tenta de novo.';
const TEXT_SEND_FALLBACK = 'Não consegui enviar a proposta. Confere o texto e tenta de novo.';

const FORMAT_OPTIONS: { value: ProposalFormat; label: string }[] = [
  { value: 'LINK', label: 'Página com link' },
  { value: 'TEXT', label: 'Texto' },
];

const MODE_OPTIONS: { value: ProposalMode; label: string }[] = [
  { value: 'NEW', label: 'Nova proposta' },
  { value: 'UPDATE', label: 'Atualização' },
];

function submitLabel(phase: SubmitPhase, hasReview: boolean, isLinkFlow: boolean): string {
  if (phase === 'uploading') return 'Enviando prints…';
  if (phase === 'reading') return 'Lendo prints…';
  if (!hasReview) return 'Ler prints';
  return isLinkFlow ? 'Enviar link ao cliente' : 'Enviar ao cliente';
}

/**
 * Modal "Enviar cotação": o atendente anexa os prints, a IA lê e ele confere
 * antes de qualquer coisa ir ao cliente — como página com link (padrão) ou
 * como texto com os prints. Usa o `<Dialog>` padrão (foco preso, Esc, rolagem travada).
 */
export function ProposalDialog({ conversationId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ProposalMode>('NEW');
  const [modeTouched, setModeTouched] = useState(false);
  const prints = useProposalPrints();
  const { clear: clearPrints } = prints;
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const loading = phase !== 'idle';
  // Conferência do formato Texto: o que foi lido, editável antes de enviar.
  const [review, setReview] = useState<ProposalPreview | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [format, setFormat] = useState<ProposalFormat>('LINK');
  const quote = useQuoteReview();
  const { reset: resetQuote } = quote;

  // Propostas já existentes deste contato — decide o padrão do "Tipo".
  const { data: existing } = useQuery({
    queryKey: ['proposals', 'conversation', conversationId],
    queryFn: () => proposalsService.listForConversation(conversationId),
    enabled: open,
  });

  // Reabrir sempre parte de um estado limpo. Os prints saem também ao fechar,
  // pra soltar as miniaturas da memória.
  useEffect(() => {
    clearPrints();
    if (open) {
      setError(null);
      setPhase('idle');
      setModeTouched(false);
      setReview(null);
      setFormat('LINK');
      resetQuote();
    }
  }, [open, clearPrints, resetQuote]);

  // Já existe proposta: sugere "Atualização", a menos que o atendente tenha escolhido.
  useEffect(() => {
    if (open && !modeTouched && existing !== undefined) {
      setMode(existing.length > 0 ? 'UPDATE' : 'NEW');
    }
  }, [open, modeTouched, existing]);

  const hasPrints = prints.items.length > 0;
  const isLinkFlow = format === 'LINK';
  const hasReview = isLinkFlow ? quote.review !== null : review !== null;

  // Mudou print ou opção: a leitura anterior não vale mais.
  function resetReviews() {
    setReview(null);
    resetQuote();
  }

  function addPrints(files: File[]) {
    if (loading) return;
    // Cotação já na conferência: print novo soma itens em vez de apagar a edição.
    if (isLinkFlow && quote.review) {
      void addItemsByPrint(files);
      return;
    }
    setError(null);
    if (prints.add(files).length > 0) resetReviews();
  }

  /** Lê só os prints novos e junta os itens à cotação em conferência. */
  async function addItemsByPrint(files: File[]) {
    if (loading) return;
    setError(null);
    const ids = prints.add(files);
    if (ids.length === 0) return;
    setPhase('uploading');
    const outcome = await prints.uploadAll(ids);
    if (!outcome.ok) {
      ids.forEach(prints.remove);
      setError(`O print "${outcome.failedName}" não subiu. ` + getErrorMessage(outcome.error, 'Confere a conexão e tenta de novo.'));
      setPhase('idle');
      return;
    }
    await step('reading', READ_FALLBACK, async () => {
      try {
        quote.append(await proposalsService.previewQuote(base(outcome.images)));
      } catch (err: unknown) {
        // Print que não virou item não fica anexado à proposta.
        ids.forEach(prints.remove);
        throw err;
      }
    });
  }

  function removePrint(id: string) {
    prints.remove(id);
    resetReviews();
    // O botão removido some; sem isso o foco cairia no <body>.
    attachButtonRef.current?.focus();
  }

  const { isDragging } = usePrintIntake(open, addPrints);

  /** Sobe os prints em sequência. null = algum falhou (o erro já está na tela). */
  async function uploadPrints(): Promise<ProposalImageInput[] | null> {
    setPhase('uploading');
    const outcome = await prints.uploadAll();
    if (outcome.ok) return outcome.images;
    setError(
      `O print "${outcome.failedName}" não subiu. ` +
        getErrorMessage(outcome.error, 'Confere a conexão e tenta de novo.'),
    );
    setPhase('idle');
    return null;
  }

  /** Roda um passo com a fase na tela e o erro amigável se falhar. */
  async function step(next: SubmitPhase, fallback: string, run: () => Promise<void>) {
    setPhase(next);
    try {
      await run();
    } catch (err: unknown) {
      setError(getErrorMessage(err, fallback));
    } finally {
      setPhase('idle');
    }
  }

  const base = (images: ProposalImageInput[]) => ({ conversationId, checkoutUrl: NO_CHECKOUT_URL, mode, images });

  function finishSent() {
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    // A proposta move o card para PROPOSTA ENVIADA no funil.
    queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
    onOpenChange(false);
  }

  /** Página com link: lê os prints em itens (1º clique) ou grava e manda o link (2º). */
  async function submitQuoteLink() {
    let submission: QuoteSubmission | null = null;
    if (quote.review) {
      const result = validateQuoteDraft(quote.review.draft, quote.review.currency);
      if (!result.ok) {
        setError(result.errors.join('\n'));
        return;
      }
      submission = result.value;
    }
    const images = await uploadPrints();
    if (!images) return;
    if (!submission) {
      await step('reading', READ_FALLBACK, async () => quote.start(await proposalsService.previewQuote(base(images))));
      return;
    }
    const ready = submission;
    await step('creating', QUOTE_SEND_FALLBACK, async () => {
      const created = await proposalsService.createQuote({ ...base(images), ...ready });
      notifyQuoteSent(created?.quoteUrl);
      finishSent();
    });
  }

  /** Texto: lê e mostra o texto (1º clique) ou envia o texto conferido e os prints (2º). */
  async function submitText() {
    const reviewed: { proposal: ReviewedProposal; text: string } | null = review
      ? { proposal: review.proposal, text: reviewText }
      : null;
    const issue = reviewed ? reviewTextIssue(reviewed.text) : null;
    if (issue) {
      setError(issue);
      return;
    }
    const images = await uploadPrints();
    if (!images) return;
    if (!reviewed) {
      await step('reading', READ_FALLBACK, async () => {
        const preview = await proposalsService.preview({ ...base(images), includeLink: false });
        setReview(preview);
        setReviewText(preview.text);
      });
      return;
    }
    await step('creating', TEXT_SEND_FALLBACK, async () => {
      await proposalsService.create({ ...base(images), includeLink: false, reviewed: reviewed.proposal, text: reviewed.text });
      finishSent();
    });
  }

  async function handleSubmit() {
    if (!hasPrints || loading) return;
    setError(null);
    await (isLinkFlow ? submitQuoteLink() : submitText());
  }

  // Não fecha no meio do envio.
  const close = () => {
    if (!loading) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Enviar cotação"
      size={isLinkFlow && quote.review ? 'lg' : 'md'}
      // Com print anexado, Esc/clique fora não fecham sem querer.
      dismissible={!hasPrints}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!hasPrints} loading={loading}>
            {!loading && <ScanText aria-hidden="true" className="h-4 w-4" />}
            {submitLabel(phase, hasReview, isLinkFlow)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ProposalPrintsField
          items={prints.items}
          rejected={prints.rejected}
          disabled={loading}
          isDragging={isDragging && !loading}
          onPick={addPrints}
          onRemove={removePrint}
          onDismissRejected={prints.dismissRejected}
          attachButtonRef={attachButtonRef}
        />

        <div>
          <ChoiceGroup
            labelId="proposal-format-label"
            label="Como enviar?"
            value={format}
            options={FORMAT_OPTIONS}
            disabled={loading}
            onChange={(next) => {
              setFormat(next);
              resetReviews();
            }}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isLinkFlow
              ? 'O cliente recebe uma mensagem curta com o link de uma página com a cotação completa. Os prints não vão.'
              : 'O cliente recebe a proposta em texto e os prints.'}
          </p>
        </div>

        {!isLinkFlow && (
          <div>
            <ChoiceGroup
              labelId="proposal-mode-label"
              label="Tipo"
              value={mode}
              options={MODE_OPTIONS}
              disabled={loading}
              onChange={(next) => {
                setMode(next);
                setModeTouched(true);
                resetReviews();
              }}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {mode === 'UPDATE'
                ? 'Envia uma mensagem curta ("Ajustei sua proposta…"), sem a saudação completa.'
                : 'Envia a mensagem completa de boas-vindas com a proposta.'}
            </p>
          </div>
        )}

        {isLinkFlow && quote.review && (
          <QuoteEditor
            draft={quote.review.draft}
            currency={quote.review.currency}
            disabled={loading}
            onChange={quote.setDraft}
            onAddByPrint={(files) => void addItemsByPrint(files)}
            canAddPrints={prints.items.length < MAX_PROPOSAL_PRINTS}
          />
        )}

        {!isLinkFlow && review && (
          <ProposalReviewPanel text={reviewText} disabled={loading} onTextChange={setReviewText} />
        )}

        {error && (
          <p role="alert" className="whitespace-pre-line rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
