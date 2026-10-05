'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { toast } from 'sonner';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { acceptancesService } from '../services/acceptances.service';
import { mergeVoucherItems, stripSource, type SourcedItem } from '../voucher-merge';
import { countFailedUploads, voucherPayload } from '../voucher-payload';
import { summarizeOrderSent } from '../voucher-send-summary';
import { VoucherDropZone, type VoucherFileState } from './voucher-drop-zone';
import { VoucherTextField, type VoucherTextFeedback } from './voucher-text-field';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/**
 * Diálogo de Aceite de Entrega (E6 — Entrega): ao marcar "Pedido enviado", o
 * atendente confere/edita os itens entregues (rascunho vindo da Ficha do
 * Pedido) e um termo opcional, e então gera + envia o link de aceite ao
 * cliente. Usa o `<Dialog>` padrão (foco preso, Esc, rolagem travada).
 */
export function AcceptanceDialog({
  conversationId,
  open,
  onOpenChange,
  onDone,
}: Props) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<SourcedItem[]>([]);
  const [term, setTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<VoucherFileState[]>([]);
  // Texto colado do voucher: a ÚNICA fonte dos itens. O PDF anexado é enviado
  // ao cliente, mas não é lido.
  const [voucherText, setVoucherText] = useState('');
  const [organizing, setOrganizing] = useState(false);
  const [textFeedback, setTextFeedback] = useState<VoucherTextFeedback | null>(null);
  const [textOrderRef, setTextOrderRef] = useState<string | null>(null);
  const fileSeq = useRef(0);

  // Ao abrir: parte de estado limpo e tenta puxar o rascunho da Ficha do Pedido.
  useEffect(() => {
    if (!open) return;
    setTerm('');
    setError(null);
    setSaving(false);
    setItems([]);
    setFiles([]);
    setVoucherText('');
    setOrganizing(false);
    setTextFeedback(null);
    setTextOrderRef(null);
    let cancelled = false;
    setLoadingDraft(true);
    orderFichaService
      .getForConversation(conversationId)
      .then((ficha) => {
        if (cancelled) return;
        const draft: SourcedItem[] = (ficha?.items ?? []).map((it) => ({
          description: it.produto,
          qty: it.quantidade,
        }));
        setItems(draft);
      })
      .catch(() => {
        // Sem ficha / falha: começa vazio, o atendente adiciona à mão.
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId]);

  const addItem = () =>
    setItems((xs) => [...xs, { description: '' }]);
  const setDesc = (i: number, v: string) =>
    setItems((xs) => xs.map((x, k) => (k === i ? { ...x, description: v } : x)));
  const removeItem = (i: number) =>
    setItems((xs) => xs.filter((_, k) => k !== i));

  const hasItems = items.some((x) => x.description.trim());

  const busyWithFiles = files.some((f) => f.status === 'uploading');

  // Nº do pedido: só o texto colado informa. Antes havia duas fontes (o texto e
  // o que a IA lia de cada PDF), e o `pickOrderRef` existia para reconciliá-las
  // — divergência entre elas acendia o aviso de "vouchers de pedidos
  // diferentes". Sem a leitura do PDF sobrou uma fonte só, e uma fonte não
  // diverge de si mesma: o aviso nunca poderia acender de novo, então saiu
  // junto em vez de ficar na tela como promessa que o código não cumpre mais.
  const orderRef = textOrderRef;

  const patchFile = (id: string, next: Partial<VoucherFileState>) =>
    setFiles((xs) => xs.map((x) => (x.id === id ? { ...x, ...next } : x)));

  const errorText = (err: unknown, fallback: string): string => getErrorMessage(err, fallback);

  /**
   * Sobe cada PDF para o storage — e só. O arquivo é anexo do aceite: vai para
   * o cliente junto com o link, mas ninguém o lê.
   *
   * A leitura automática saiu porque enchia a lista com o que estava escrito no
   * voucher (inclusive em inglês), num documento que o cliente assina. Os itens
   * agora saem só do texto que o atendente cola e confere.
   *
   * Cada arquivo é independente: um que falha não impede os outros, e nenhum
   * deles bloqueia o envio.
   */
  async function addFiles(picked: File[]) {
    const entries: VoucherFileState[] = picked.map((f) => ({
      id: `voucher-${++fileSeq.current}`,
      filename: f.name,
      size: f.size,
      status: 'uploading',
    }));
    setFiles((xs) => [...xs, ...entries]);

    await Promise.all(
      picked.map(async (file, i) => {
        const { id } = entries[i];
        try {
          const upload = await inboxService.uploadMedia(file);
          // Se o atendente removeu o chip no meio do upload, o `patchFile` não
          // acha o id e a atualização evapora — o arquivo descartado não volta.
          patchFile(id, { url: upload.url, size: upload.size, status: 'done' });
        } catch (err: unknown) {
          patchFile(id, {
            status: 'error',
            message: errorText(err, 'não consegui enviar este arquivo'),
          });
        }
      }),
    );
  }

  const removeFile = (id: string) =>
    setFiles((xs) => xs.filter((x) => x.id !== id));

  /**
   * Manda o texto colado pra IA organizar e mescla o resultado nos itens.
   *
   * Nada aqui trava o envio: falhou, o atendente digita à mão e o voucher vai
   * ao cliente do mesmo jeito — é a regra que governa este modal inteiro. Por
   * isso o desfecho vira uma linha de aviso no próprio campo, e não o `error`
   * do diálogo (que é reservado a "não consegui concluir o envio").
   */
  async function organizeText() {
    const text = voucherText.trim();
    if (!text || organizing) return;
    setOrganizing(true);
    setTextFeedback(null);
    try {
      const result = await acceptancesService.extractVoucherText(text);
      const found = result.items;
      setItems((xs) => mergeVoucherItems(xs, found, 'texto'));
      if (result.orderRef) setTextOrderRef(result.orderRef);
      setTextFeedback(
        found.length
          ? {
              tone: 'ok',
              text: `${found.length} ${found.length === 1 ? 'item organizado' : 'itens organizados'} — confira abaixo`,
            }
          : {
              tone: 'warn',
              text:
                result.warning ??
                'Não identifiquei itens nesse texto — confira e ajuste à mão.',
            },
      );
    } catch (err: unknown) {
      setTextFeedback({
        tone: 'warn',
        text: `${errorText(err, 'não consegui organizar')} — digite os itens à mão`,
      });
    } finally {
      setOrganizing(false);
    }
  }

  async function submit(withAcceptance: boolean) {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      // `stripSource` tira a marca de qual fonte preencheu o item: ela é
      // escrituração da mescla, o backend não conhece esse campo.
      const clean = stripSource(items.filter((x) => x.description.trim())).map(
        (x) => ({ ...x, description: x.description.trim() }),
      );
      const vouchers = voucherPayload(files);
      const failedUploads = countFailedUploads(files);

      const result = await pipelinesService.markOrderSent(
        conversationId,
        withAcceptance
          ? {
              withAcceptance: true,
              items: clean,
              termText: term.trim() || undefined,
              vouchers,
              orderRef: orderRef ?? undefined,
            }
          : { withAcceptance: false },
      );
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-board'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      const summary = summarizeOrderSent({
        withAcceptance,
        sentCount: withAcceptance ? vouchers.length : 0,
        results: result.voucherResults,
        linkResult: result.linkResult,
        failedUploads: withAcceptance ? failedUploads : 0,
      });
      if (summary.kind === 'error') {
        // Cliente sem o voucher e ninguém sabendo é o pior desfecho possível:
        // o toast fica bem mais tempo na tela que um sucesso.
        toast.error(summary.message, { duration: 15000 });
      } else {
        toast.success(summary.message);
      }
      onOpenChange(false);
      onDone?.();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Não foi possível concluir. Tente de novo.'));
    } finally {
      setSaving(false);
    }
  }

  // Não fecha no meio do envio (igual ao modal antigo).
  const close = () => {
    if (!saving) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Aceite de entrega"
      description="Confira o que foi entregue e envie o link de aceite ao cliente."
      // Itens, termo e anexos são digitados aqui: Esc/clique fora não fecham.
      dismissible={false}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => submit(false)} disabled={saving}>
            Só marcar enviado
          </Button>
          <Button
            type="button"
            onClick={() => submit(true)}
            // `organizing` entra aqui pelo mesmo motivo que `busyWithFiles`:
            // enviar no meio da organização mandaria a lista SEM o que a IA
            // está prestes a mesclar. É espera de segundos, não é bloqueio por
            // falha — se a organização falhar, o botão volta na hora.
            disabled={busyWithFiles || organizing || !hasItems}
            loading={saving}
          >
            Gerar aceite e enviar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <VoucherDropZone
          files={files}
          disabled={saving}
          onAdd={addFiles}
          onRemove={removeFile}
        />

        {/*
          Logo abaixo do anexo, e não no fim do modal: o anexo é o que vai
          para o cliente, este campo é de onde saem os itens da lista. Quem
          acabou de arrastar o PDF precisa achar o caminho de colar o texto
          sem procurar — sem ele a lista abaixo continua vazia.
        */}
        <VoucherTextField
          value={voucherText}
          busy={organizing}
          feedback={textFeedback}
          disabled={saving}
          onChange={setVoucherText}
          onOrganize={organizeText}
        />

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Itens entregues</p>
            <button
              type="button"
              onClick={addItem}
              disabled={saving}
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Adicionar item
            </button>
          </div>

          {loadingDraft ? (
            <div role="status" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> Carregando itens
              da ficha…
            </div>
          ) : items.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
              Nenhum item ainda. Cole o texto do voucher acima ou clique em
              “Adicionar item” para incluir o que foi entregue.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.description}
                    onChange={(e) => setDesc(i, e.target.value)}
                    disabled={saving}
                    placeholder="Ex.: 2x ingresso Magic Kingdom"
                    aria-label={`Item ${i + 1}`}
                    className={`${controlCls} w-full`}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={saving}
                    aria-label={`Remover item ${i + 1}`}
                    title="Remover item"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-urgent-wash hover:text-urgent-ink disabled:opacity-50"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="acceptance-term" className="block text-sm font-medium text-foreground">
            Termo de aceite <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="acceptance-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            disabled={saving}
            rows={4}
            placeholder="Deixe em branco para usar o termo padrão."
            className={`${controlCls} mt-1.5 h-auto w-full resize-none py-2`}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-urgent-wash px-3 py-2 text-xs text-urgent-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
