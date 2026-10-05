'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  pipelinesService,
  type CardSummary,
  type PipelineStage,
} from '../services/pipelines.service';
import { getErrorMessage } from '@/lib/errors';
import { parseMoneyBR } from '@/lib/money';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { stageOptionLabel } from './client-card-dialog';

interface Props {
  open: boolean;
  pipelineId: string;
  card: CardSummary | null;
  stageId: string | null;
  /** Etapas do quadro, na ordem das colunas. */
  stages: PipelineStage[];
  /** Etapa em que o card está agora (vem do quadro vivo, não do snapshot). */
  currentStageId: string | null;
  /** Move o card de etapa — o mesmo caminho do arrastar e soltar. */
  onMoveStage: (stageId: string) => Promise<void>;
  onClose: () => void;
  onSaved: () => void;
}

interface KirvanoMeta {
  event?: string;
  productName?: string | null;
  paymentMethod?: string | null;
  saleId?: string | null;
  checkoutUrl?: string | null;
  utm?: Record<string, unknown> | null;
}

const LABEL_CLS = 'block text-sm font-medium text-foreground';
const INFO_BOX_CLS = 'rounded-xl border border-border bg-muted/40 p-3 text-xs';

function KirvanoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function CardDialog({
  open,
  pipelineId,
  card,
  stageId,
  stages,
  currentStageId,
  onMoveStage,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [closedReason, setClosedReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? '');
      setValue(card.value ? String(card.value) : '');
      setClosedReason(card.closedReason ?? '');
    } else {
      setTitle('');
      setDescription('');
      setValue('');
      setClosedReason('');
    }
  }, [card, open]);

  if (!open) return null;

  const meta = (card?.metadata ?? {}) as Record<string, unknown>;
  const kirvano = (meta.kirvano as KirvanoMeta | undefined) ?? null;
  const utmSource =
    kirvano?.utm && typeof kirvano.utm === 'object'
      ? (kirvano.utm as Record<string, unknown>).utm_source
      : undefined;
  const attempts = (meta.outreach as { attempts?: number } | undefined)
    ?.attempts;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    // "4.500,00" é 4500 — o parseFloat antigo lia 4,5.
    const numericValue = value.trim() ? parseMoneyBR(value) : null;
    if (value.trim() && numericValue === null) {
      toast.error('Valor inválido. Use, por exemplo, 4.500,00');
      return;
    }
    setSaving(true);
    try {
      if (card) {
        await pipelinesService.updateCard(card.id, {
          title: title.trim(),
          description: description || null,
          // null limpa o valor quando o campo foi apagado.
          value: numericValue as any,
          closedReason: closedReason || undefined,
        } as any);
      } else {
        await pipelinesService.createCard(pipelineId, {
          title: title.trim(),
          description: description || undefined,
          value: numericValue ?? undefined,
          stageId: stageId ?? undefined,
        });
      }
      toast.success(card ? 'Card atualizado' : 'Card criado');
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  // Alternativa ao arraste (teclado, leitor de tela, toque). Vale na hora,
  // como o arraste: não espera o "Salvar" dos outros campos.
  const handleStageChange = async (nextStageId: string) => {
    if (!card || nextStageId === currentStageId) return;
    setMovingStage(true);
    try {
      await onMoveStage(nextStageId);
    } finally {
      setMovingStage(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    const confirmed = await confirm({
      title: `Excluir o card "${card.title}"?`,
      description:
        'O card sai do funil e não dá para desfazer. A conversa e o contato continuam existindo.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await pipelinesService.removeCard(card.id);
      toast.success('Card removido');
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao excluir'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        dismissible={false}
        size="lg"
        title={card ? 'Editar card' : 'Novo card'}
        footer={
          <>
            {card && (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={saving}
                className="mr-auto text-urgent-ink hover:bg-urgent-wash"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !title}>
              {saving ? 'Salvando…' : card ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="card-title" className={LABEL_CLS}>
              Título
            </label>
            <input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Lead Bravy School"
              className={`${controlCls} mt-1 w-full`}
            />
          </div>

          {card && currentStageId && (
            <div>
              <label htmlFor="card-stage" className={LABEL_CLS}>
                Etapa
              </label>
              <select
                id="card-stage"
                value={currentStageId}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={movingStage}
                aria-busy={movingStage}
                aria-describedby="card-stage-hint"
                className={`${controlCls} mt-1 w-full`}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stageOptionLabel(s)}
                  </option>
                ))}
              </select>
              <p id="card-stage-hint" className="mt-1 text-xs text-muted-foreground">
                O card muda de etapa assim que você escolhe.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="card-description" className={LABEL_CLS}>
              Descrição
            </label>
            <textarea
              id="card-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto, próximos passos, informações coletadas…"
              className={`${controlCls} mt-1 h-auto w-full py-2`}
            />
          </div>

          <div>
            <label htmlFor="card-value" className={LABEL_CLS}>
              Valor (R$)
            </label>
            <input
              id="card-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex.: 4.500,00"
              className={`${controlCls} mt-1 w-full font-mono tabular-nums`}
              inputMode="decimal"
            />
          </div>

          {card && card.status !== 'OPEN' && (
            <div>
              <label htmlFor="card-closed-reason" className={LABEL_CLS}>
                Motivo do fechamento
              </label>
              <input
                id="card-closed-reason"
                value={closedReason}
                onChange={(e) => setClosedReason(e.target.value)}
                placeholder={
                  card.status === 'WON'
                    ? 'Ex.: assinou contrato de 12 meses'
                    : 'Ex.: optou por concorrente'
                }
                className={`${controlCls} mt-1 w-full`}
              />
            </div>
          )}

          {card?.contact && (
            <div className={INFO_BOX_CLS}>
              <p className="text-muted-foreground">Contato</p>
              <p className="mt-0.5 font-medium text-foreground">
                {card.contact.name || card.contact.phone}
              </p>
            </div>
          )}

          {kirvano && (
            <div className={`${INFO_BOX_CLS} space-y-1.5`}>
              <p className="font-medium text-muted-foreground">
                Recuperação (Kirvano)
              </p>
              {kirvano.productName && (
                <KirvanoRow label="Produto" value={kirvano.productName} />
              )}
              {kirvano.event && (
                <KirvanoRow label="Origem" value={kirvano.event} />
              )}
              {kirvano.paymentMethod && (
                <KirvanoRow label="Pagamento" value={kirvano.paymentMethod} />
              )}
              {kirvano.saleId && (
                <KirvanoRow label="ID da venda" value={kirvano.saleId} />
              )}
              {utmSource ? (
                <KirvanoRow
                  label="Origem da campanha (UTM)"
                  value={String(utmSource)}
                />
              ) : null}
              {typeof attempts === 'number' && (
                <KirvanoRow label="Tentativas" value={String(attempts)} />
              )}
              {kirvano.checkoutUrl && (
                <a
                  href={kirvano.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block pt-0.5 font-medium text-primary hover:underline"
                >
                  Abrir checkout
                </a>
              )}
            </div>
          )}
        </div>
      </Dialog>
      {confirmDialog}
    </>
  );
}
