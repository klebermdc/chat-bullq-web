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
import { unreadPrintsNotice } from '../lib/unread-prints';
import type { ProposalFormat, ProposalImageInput, ProposalMode, ProposalPreview, ReviewedProposal } from '../types';
import { getErrorMessage } from '@/lib/errors';
import { reviewTextIssue } from '../lib/proposal-review';
import { ProposalReviewPanel } from './proposal-review-panel';
import { useQuoteReview } from '@/features/quotes/hooks/use-quote-review';
import { QuoteEditor } from '@/features/quotes/components/editor/quote-editor';
import { ChoiceGroup } from '@/features/quotes/components/editor/editor-field';
import { notifyQuoteSent } from '@/features/quotes/components/quote-sent-toast';
import { validateQuoteDraft, type QuoteSubmission } from '@/features/quotes/lib/quote-draft';
import { replaceItemsFromPrint, updatableQuote } from '@/features/quotes/lib/quote-updatable';
import { previewFromSaved } from '@/features/quotes/lib/quote-draft';
import type { QuotePreview } from '@/features/quotes/types';
import { QuoteUpdateOffer } from '@/features/quotes/components/quote-update-offer';
import { QuoteUpdateDialog } from '@/features/quotes/components/quote-update-dialog';
import { QuoteSupplierCompare } from '@/features/quotes/components/editor/quote-supplier-compare';
import { applySupplierChoice, compareSuppliers, type SupplierCompareState } from '@/features/quotes/lib/supplier-compare';
import { useStoreQuote } from '../hooks/use-store-quote';
import { extractStoreLink } from '../lib/store-link';
import { submitLabel, type SubmitPhase } from '../lib/submit-label';
import { ProposalStoreLinkField } from './proposal-store-link-field';
import { useQuotePreview } from '@/features/quotes/hooks/use-quote-preview';
import { QuotePreviewButton, QuotePreviewDialog } from '@/features/quotes/components/preview/quote-preview-dialog';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// A proposta é montada só pelos prints: o envio com link do checkout saiu em 27/10/2026.
const NO_CHECKOUT_URL = '';

const READ_FALLBACK = 'Não consegui ler os prints. Confere as imagens e tenta de novo.';
const STORE_READ_FALLBACK = 'Não consegui ler o link da loja. Confere o link e tenta de novo.';
const QUOTE_SEND_FALLBACK = 'Não consegui enviar a cotação. Confere os campos e tenta de novo.';
const TEXT_SEND_FALLBACK = 'Não consegui enviar a proposta. Confere o texto e tenta de novo.';

const MODE_OPTIONS: { value: ProposalMode; label: string }[] = [
  { value: 'NEW', label: 'Nova proposta' },
  { value: 'UPDATE', label: 'Atualização' },
];

/**
 * Modal "Enviar cotação": o atendente anexa os prints (a IA lê) ou cola o link
 * do carrinho da Just Travel (a API lê, sem IA) e confere
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
  // Cotação pelo carrinho da Just Travel: os itens vêm do link, sem print.
  const store = useStoreQuote();
  const { reset: resetStore } = store;
  // "Ver como o cliente vai ver": a página montada do rascunho, sem gravar nada.
  const clientPreview = useQuotePreview();
  const { close: closeClientPreview } = clientPreview;

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
      resetStore();
      closeClientPreview();
    }
  }, [open, clearPrints, resetQuote, resetStore, closeClientPreview]);

  // Já existe proposta: sugere "Atualização", a menos que o atendente tenha escolhido.
  useEffect(() => {
    if (open && !modeTouched && existing !== undefined) {
      setMode(existing.length > 0 ? 'UPDATE' : 'NEW');
    }
  }, [open, modeTouched, existing]);

  // Já mandou cotação nesta conversa: dá para atualizar a mesma com um print novo.
  const sentQuote = updatableQuote(existing);
  // "Atualizar com print": os prints desta janela viram a atualização da cotação enviada.
  const [isPrintUpdate, setIsPrintUpdate] = useState(false);
  const [printUpdatePreview, setPrintUpdatePreview] = useState<QuotePreview | null>(null);
  useEffect(() => {
    if (!open) return;
    setIsPrintUpdate(false);
    setPrintUpdatePreview(null);
  }, [open]);

  const hasPrints = prints.items.length > 0;
  const isLinkFlow = format === 'LINK';
  // Um caminho de cada vez: com print anexado o link fica travado, e com texto
  // no link os prints ficam travados. Assim nunca há dúvida de onde vêm os itens.
  const isStoreFlow = isLinkFlow && !hasPrints && !isPrintUpdate && store.link !== null;
  const hasReview = isLinkFlow ? quote.review !== null : review !== null;

  // Mudou print ou opção: a leitura anterior não vale mais.
  function resetReviews() {
    setReview(null);
    resetQuote();
  }

  function addPrints(files: File[]) {
    if (loading || store.hasText) return;
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
    const names = files.map((f) => f.name);
    await step('reading', READ_FALLBACK, async () => {
      try {
        const preview = await proposalsService.previewQuote(base(outcome.images));
        quote.append(preview);
        setError(unreadPrintsNotice(preview.unreadPrints, names));
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

  /** Trocou o link já lido: a cotação lida dele não vale mais. */
  function changeStoreText(text: string) {
    store.setText(text);
    if (store.readLink !== null && extractStoreLink(text) !== store.readLink) {
      store.forget();
      resetQuote();
    }
  }

  /** Azul digitada ou valor clicado: o menor Pix e o menor 10x vão para os totais. */
  function changeCompare(next: SupplierCompareState) {
    if (!store.offer || !quote.review) return;
    store.setCompare(next);
    quote.setDraft(applySupplierChoice(quote.review.draft, store.offer, compareSuppliers(store.offer, next)));
  }

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
      const names = prints.items.map((item) => item.file.name);
      await step('reading', READ_FALLBACK, async () => {
        const preview = await proposalsService.previewQuote(base(images));
        const saved = isPrintUpdate && sentQuote ? previewFromSaved(sentQuote.details) : null;
        if (saved) setPrintUpdatePreview(replaceItemsFromPrint(saved, preview));
        else quote.start(preview);
        setError(unreadPrintsNotice(preview.unreadPrints, names));
      });
      return;
    }
    const ready = submission;
    await step('creating', QUOTE_SEND_FALLBACK, async () => {
      const created = await proposalsService.createQuote({ ...base(images), ...ready });
      notifyQuoteSent(created?.quoteUrl);
      finishSent();
    });
  }

  /** Link da loja: lê o carrinho em itens (1º clique) ou grava e manda o link da cotação (2º). */
  async function submitStoreQuote(storeLink: string) {
    if (!quote.review) {
      await step('reading', STORE_READ_FALLBACK, async () => {
        const preview = await proposalsService.previewQuoteFromStore({ conversationId, mode, storeLink });
        // O link do carrinho já vira o "Link da loja online" (só a equipe vê).
        quote.start({ ...preview, quote: { ...preview.quote, storeUrl: storeLink } });
        store.begin(storeLink, preview.storeOffer ?? null);
      });
      return;
    }
    const result = validateQuoteDraft(quote.review.draft, quote.review.currency);
    if (!result.ok) {
      setError(result.errors.join('\n'));
      return;
    }
    const { quote: data, customerName } = result.value;
    await step('creating', QUOTE_SEND_FALLBACK, async () => {
      const created = await proposalsService.createQuote({
        ...base([]),
        storeLink,
        customerName,
        quote: { ...data, storeUrl: data.storeUrl ?? storeLink },
      });
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

  /** Mesma conferência do envio: com erro, mostra a lista e não abre a prévia. */
  function openClientPreview() {
    if (!quote.review || loading) return;
    const problem = clientPreview.show(quote.review.draft, quote.review.currency);
    setError(problem);
  }

  async function handleSubmit() {
    if (loading) return;
    if (isStoreFlow && store.link) {
      setError(null);
      await submitStoreQuote(store.readLink ?? store.link);
      return;
    }
    if (!hasPrints) return;
    setError(null);
    await (isLinkFlow ? submitQuoteLink() : submitText());
  }

  // Não fecha no meio do envio.
  const close = () => {
    if (!loading) onOpenChange(false);
  };

  if (printUpdatePreview && sentQuote) {
    return (
      <QuoteUpdateDialog
        proposal={sentQuote}
        initialPreview={printUpdatePreview}
        onClose={() => {
          setPrintUpdatePreview(null);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Enviar cotação"
      size={isLinkFlow && quote.review ? 'lg' : 'md'}
      // Com print anexado, Esc/clique fora não fecham sem querer.
      dismissible={!hasPrints && !store.hasText}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          {isLinkFlow && quote.review && <QuotePreviewButton onClick={openClientPreview} disabled={loading} />}
          <Button type="button" onClick={handleSubmit} disabled={!hasPrints && !isStoreFlow} loading={loading}>
            {!loading && <ScanText aria-hidden="true" className="h-4 w-4" />}
            {isPrintUpdate && phase === 'idle' ? 'Ler print e atualizar' : submitLabel({ phase, hasReview, isLinkFlow, isStoreFlow })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {sentQuote && !quote.review && (
          <QuoteUpdateOffer
            quote={sentQuote}
            disabled={loading}
            isPrintUpdate={isPrintUpdate}
            onTogglePrintUpdate={(on) => {
              setIsPrintUpdate(on);
              if (!on) return;
              // Atualizar com print é só por print: o link da loja sai de cena.
              store.reset();
              attachButtonRef.current?.focus();
            }}
          />
        )}
        {isLinkFlow && !isPrintUpdate && (
          <ProposalStoreLinkField
            value={store.text}
            disabled={loading}
            isBlockedByPrints={hasPrints}
            onChange={changeStoreText}
          />
        )}
        <ProposalPrintsField
          items={prints.items}
          rejected={prints.rejected}
          disabled={loading || store.hasText}
          isDragging={isDragging && !loading && !store.hasText}
          onPick={addPrints}
          onRemove={removePrint}
          onDismissRejected={prints.dismissRejected}
          attachButtonRef={attachButtonRef}
        />

        <div>
          {/* O envio como "Texto" saiu da tela em 06/11/2026: a cotação vai sempre como página com link. */}
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
            // Cotação do link: item a mais só manual, para não misturar print com o carrinho.
            onAddByPrint={isStoreFlow ? undefined : (files) => void addItemsByPrint(files)}
            canAddPrints={prints.items.length < MAX_PROPOSAL_PRINTS}
            supplierCompare={
              isStoreFlow && store.offer ? (
                <QuoteSupplierCompare
                  offer={store.offer}
                  value={store.compare}
                  currency={quote.review.currency}
                  disabled={loading}
                  onChange={changeCompare}
                />
              ) : undefined
            }
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
      <QuotePreviewDialog preview={clientPreview.preview} onClose={closeClientPreview} />
    </Dialog>
  );
}
