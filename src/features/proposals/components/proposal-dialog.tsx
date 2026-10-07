'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { Switch } from '@/components/ui/switch';
import { proposalsService } from '../services/proposals.service';
import { usePrintIntake } from '../hooks/use-print-intake';
import { useProposalPrints } from '../hooks/use-proposal-prints';
import { ProposalPrintsField } from './proposal-prints-field';
import type { ProposalImageInput, ProposalMode, ProposalPreview, ReviewedProposal } from '../types';
import { getErrorMessage } from '@/lib/errors';
import { applyOtherEdits, reviewIssue } from '../lib/proposal-review';
import { ProposalReviewPanel } from './proposal-review-panel';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** idle = parado; uploading = subindo os prints; creating = gerando a proposta. */
type SubmitPhase = 'idle' | 'uploading' | 'reading' | 'creating';

const PRINTS_REMOVED_MESSAGE =
  'Tirei os prints: eles só vão na proposta sem link. Para enviá-los, ligue de novo "Enviar sem o link do checkout".';
const LINK_REQUIRED_MESSAGE =
  'Para enviar com o link, cole o link do checkout no campo acima — ou ligue "Enviar sem o link do checkout" para mandar só com o print.';

function createErrorFallback(withoutLink: boolean, hasPrints: boolean): string {
  if (!withoutLink) return 'Não consegui ler o carrinho. Confere o link e tenta de novo.';
  if (hasPrints) return 'Não consegui montar a proposta. Confere o print ou o resumo e tenta de novo.';
  return 'Não consegui ler o resumo. Confere se tem parques, datas e pessoas e tenta de novo.';
}

/**
 * Modal "Enviar proposta do carrinho": cola o link do checkout e/ou anexa
 * prints e dispara a geração da proposta. Usa o `<Dialog>` padrão (foco preso,
 * Esc, rolagem travada).
 */
export function ProposalDialog({ conversationId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ProposalMode>('NEW');
  const [modeTouched, setModeTouched] = useState(false);
  // Proposta sem link: o cliente recebe tudo, menos a linha do checkout.
  const [withoutLink, setWithoutLink] = useState(false);
  // Prints: vão para o cliente com a proposta e o backend lê para montá-la.
  const prints = useProposalPrints();
  const { clear: clearPrints } = prints;
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const loading = phase !== 'idle';
  // Conferência: o que foi lido do print, mostrado ao atendente antes de
  // qualquer coisa ir ao cliente. Mudou print, texto ou opção → lê de novo.
  const [review, setReview] = useState<ProposalPreview | null>(null);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewLines, setReviewLines] = useState('');

  // Propostas já existentes deste contato — decide o padrão do seletor.
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
      setUrl('');
      setError(null);
      setPhase('idle');
      setModeTouched(false);
      setWithoutLink(false);
      setReview(null);
    }
  }, [open, clearPrints]);

  // Padrão inteligente: se já existe proposta, sugere "Atualização" (a menos
  // que o atendente já tenha escolhido manualmente).
  useEffect(() => {
    if (open && !modeTouched && existing !== undefined) {
      setMode(existing.length > 0 ? 'UPDATE' : 'NEW');
    }
  }, [open, modeTouched, existing]);

  const trimmed = url.trim();
  const hasPrints = prints.items.length > 0;
  const hasContent = !!trimmed || hasPrints;
  const canSubmit = hasContent && !loading;

  function addPrints(files: File[]) {
    if (loading) return;
    setError(null);
    const added = prints.add(files);
    if (added > 0) setReview(null);
    // Print só existe na proposta sem link: anexar (ou colar) um liga a opção.
    if (added > 0) setWithoutLink(true);
  }

  // Desligar "sem link" com prints anexados tira os prints: eles não vão na
  // proposta com link.
  function changeWithoutLink(next: boolean) {
    if (!next && hasPrints) {
      prints.clear();
      setError(PRINTS_REMOVED_MESSAGE);
    }
    setWithoutLink(next);
    setReview(null);
  }

  function removePrint(id: string) {
    prints.remove(id);
    setReview(null);
    // O botão removido some; sem isso o foco cairia no <body>.
    attachButtonRef.current?.focus();
  }

  const { isDragging } = usePrintIntake(open, addPrints);

  /** Sobe os prints em sequência. null = algum falhou (o erro já está na tela). */
  async function uploadPrints(): Promise<ProposalImageInput[] | null> {
    if (!hasPrints) return [];
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

  /** Lê os prints e abre a conferência. Nada é enviado ao cliente aqui. */
  async function readPrints(images: ProposalImageInput[]) {
    setPhase('reading');
    try {
      const preview = await proposalsService.preview({
        conversationId,
        checkoutUrl: trimmed,
        mode,
        includeLink: false,
        images,
      });
      setReview(preview);
      if (preview.proposal.kind === 'OTHER') {
        setReviewTitle(preview.proposal.title);
        setReviewLines(preview.proposal.lines.join('\n'));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, createErrorFallback(withoutLink, hasPrints)));
    } finally {
      setPhase('idle');
    }
  }

  /** A proposta conferida, com as correções do atendente (só OTHER é editável). */
  function reviewedProposal(): ReviewedProposal | null {
    if (!review) return null;
    if (review.proposal.kind !== 'OTHER') return review.proposal;
    return applyOtherEdits(review.proposal, { title: reviewTitle, linesText: reviewLines });
  }

  async function createProposal(images: ProposalImageInput[], reviewed?: ReviewedProposal) {
    setPhase('creating');
    try {
      await proposalsService.create({
        conversationId,
        checkoutUrl: trimmed,
        mode,
        includeLink: !withoutLink,
        ...(images.length > 0 ? { images } : {}),
        ...(reviewed ? { reviewed } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      // A proposta move o card para PROPOSTA ENVIADA no funil.
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
      setUrl('');
      onOpenChange(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, createErrorFallback(withoutLink, hasPrints)));
    } finally {
      setPhase('idle');
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    // Com link, o link é obrigatório — avisa antes de chamar a API.
    if (!withoutLink && !trimmed) {
      setError(LINK_REQUIRED_MESSAGE);
      return;
    }
    setError(null);
    // Com print, o envio é em dois passos: ler e conferir, depois enviar.
    const reviewed = hasPrints ? reviewedProposal() : null;
    if (reviewed) {
      const issue = reviewIssue(reviewed);
      if (issue) {
        setError(issue);
        return;
      }
    }
    const images = await uploadPrints();
    if (!images) return;
    if (hasPrints && !reviewed) {
      await readPrints(images);
      return;
    }
    await createProposal(images, reviewed ?? undefined);
  }

  // Não fecha no meio da geração (igual ao modal antigo).
  const close = () => {
    if (!loading) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Enviar proposta do carrinho"
      // Com link colado ou print anexado, Esc/clique fora não fecham sem querer.
      dismissible={!hasContent}
      footer={
        <>
          <Button type="button" variant="outline" onClick={close} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!hasContent} loading={loading}>
            {!loading && <ShoppingCart aria-hidden="true" className="h-4 w-4" />}
            {phase === 'uploading'
              ? 'Enviando prints…'
              : phase === 'reading'
                ? 'Lendo prints…'
                : hasPrints && !review
                  ? 'Ler prints'
                  : hasPrints
                    ? 'Enviar ao cliente'
                    : withoutLink
                      ? 'Enviar sem o link'
                      : 'Gerar proposta'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p id="proposal-mode-label" className="text-sm font-medium text-foreground">
            Tipo
          </p>
          <div
            role="group"
            aria-labelledby="proposal-mode-label"
            className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {([
              { v: 'NEW', label: 'Nova proposta' },
              { v: 'UPDATE', label: 'Atualização' },
            ] as { v: ProposalMode; label: string }[]).map((opt) => (
              <button
                key={opt.v}
                type="button"
                disabled={loading}
                aria-pressed={mode === opt.v}
                onClick={() => {
                  setMode(opt.v);
                  setReview(null);
                  setModeTouched(true);
                }}
                className={
                  'h-8 rounded-md px-2 text-xs font-medium transition-colors disabled:opacity-50 ' +
                  (mode === opt.v
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {mode === 'UPDATE'
              ? 'Envia uma mensagem curta ("Ajustei sua proposta…"), sem a saudação completa.'
              : 'Envia a mensagem completa de boas-vindas com a proposta.'}
          </p>
        </div>

        <div>
          <label htmlFor="proposal-url" className="block text-sm font-medium text-foreground">
            {withoutLink ? 'Resumo do carrinho' : 'Link do checkout'}
            {withoutLink && hasPrints && (
              <span className="text-xs font-normal text-muted-foreground"> (opcional)</span>
            )}
          </label>
          <textarea
            id="proposal-url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setReview(null);
            }}
            disabled={loading}
            rows={4}
            placeholder={
              withoutLink
                ? 'Cole o resumo do carrinho: parques, datas e quantidade de pessoas\n\nEx.: DISNEY 4 PARKS [4 dias]\n29/07/2026\n3 Adultos, 1 Criança'
                : 'Cole o link do checkout (pode colar junto com o resumo do carrinho)\n\nEx.: https://reservas.orlandofastpass.com.br/pt/checkout/...'
            }
            className={`${controlCls} mt-1.5 h-auto w-full resize-y py-2`}
            autoFocus
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {!withoutLink
              ? 'Pode colar o bloco inteiro do carrinho — eu pego o link e os dados automaticamente.'
              : hasPrints
                ? 'Com print anexado, o resumo é opcional.'
                : 'Sem link, eu monto a proposta só com o que estiver neste resumo.'}
          </p>
        </div>

        <div className="rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              Enviar sem o link do checkout
            </span>
            <Switch
              checked={withoutLink}
              onChange={changeWithoutLink}
              label="Enviar sem o link do checkout"
              disabled={loading}
              size="sm"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {!withoutLink
              ? 'A proposta vai com o link do checkout, como sempre. Prints só podem ser anexados na proposta sem link.'
              : hasPrints
                ? 'O cliente recebe a proposta e os prints, sem link para pagar. Desligar esta opção remove os prints.'
                : 'O cliente recebe a proposta inteira (pessoas, datas e parques), sem link para pagar. Basta colar o resumo do carrinho; o link não é necessário.'}
          </p>
        </div>

        {/* Prints só na proposta sem link. */}
        {withoutLink && (
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
        )}

        {review && (
          <ProposalReviewPanel
            preview={review}
            title={reviewTitle}
            linesText={reviewLines}
            disabled={loading}
            onTitleChange={setReviewTitle}
            onLinesChange={setReviewLines}
          />
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
