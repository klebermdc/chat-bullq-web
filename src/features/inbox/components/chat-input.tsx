'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Trash2,
  Square,
  Loader2,
  FileText,
  Film,
  X,
  LayoutTemplate,
  Clock,
  Plane,
  Trophy,
  PackageCheck,
  FolderOpen,
  Smartphone,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { windowKindLabel, type WindowKind } from '../lib/window-state';
import {
  MAX_PENDING_FILES,
  filesFromClipboard,
  formatBytes,
  renamePastedFile,
  validateFiles,
} from '../lib/attachment-intake';
import { ScheduleMessageDialog } from '@/features/scheduling/components/schedule-message-dialog';
import { ProposalDialog } from '@/features/proposals/components/proposal-dialog';
import { WonDialog } from '@/features/pipelines/components/won-dialog';
import { AcceptanceDialog } from '@/features/acceptances/components/acceptance-dialog';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '@/components/ui/dropdown';
import { MediaLibraryDialog } from '@/features/media-library/components/media-library-dialog';

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  onSendAudio?: (blob: Blob) => Promise<void>;
  /**
   * `caption` só vai no primeiro arquivo da leva (é o texto do compositor).
   * `onProgress` recebe 0..1 conforme os bytes sobem — é o que alimenta a
   * barra na bandeja (upload de 300KB já levou 69s em rede ruim; sem barra
   * isso é indistinguível de travado).
   */
  onSendFile?: (
    file: File,
    caption?: string,
    onProgress?: (ratio: number) => void,
  ) => Promise<void>;
  disabled?: boolean;
  /** Janela de atendimento fechada (WHATSAPP_OFFICIAL) — bloqueia texto livre. */
  windowClosed?: boolean;
  /** Regra da janela vigente — só muda o texto (24h padrão, 72h se CTWA). */
  windowKind?: WindowKind | null;
  /** Abre o picker de templates aprovados. */
  onUseTemplate?: () => void;
  /** Abre o picker de templates a partir do compositor (canal oficial). */
  onOpenTemplates?: () => void;
  /** Habilita o botão "Agendar" (abre o modal de agendamento). */
  conversationId?: string;
}

// Espelha o whitelist do backend (UploadsService.ALLOWED_MEDIA_MIME) — o
// accept é só UX; a validação real acontece no upload.
const FILE_ACCEPT = [
  'image/*',
  'video/*',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
].join(',');

export interface ChatInputHandle {
  insertText: (text: string) => void;
  /**
   * Enfileira arquivos vindos de fora do compositor (drop em qualquer canto
   * do painel da conversa). Eles entram na mesma fila do clipe/colar.
   */
  addFiles: (files: File[]) => void;
}

/** Anexo já escolhido, esperando o "Enviar". */
interface PendingAttachment {
  id: string;
  file: File;
  /** objectURL da miniatura — só para imagens; precisa de revoke. */
  previewUrl?: string;
  /** 0..1 enquanto sobe. `undefined` = ainda não começou. */
  progress?: number;
  /** "finishing" = bytes já subiram, esperando o POST /messages. */
  phase?: 'uploading' | 'finishing';
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({
  onSend,
  onSendAudio,
  onSendFile,
  disabled,
  windowClosed,
  windowKind,
  onUseTemplate,
  onOpenTemplates,
  conversationId,
}, ref) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [wonOpen, setWonOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();
  // Espelho do `pending` pra ler sem virar dependência de callback (e pra
  // revogar os objectURLs no unmount).
  const pendingRef = useRef<PendingAttachment[]>([]);
  const seqRef = useRef(0);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(
    () => () => {
      pendingRef.current.forEach(
        (item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl),
      );
    },
    [],
  );

  /**
   * Entrada única de anexo: clipe, Ctrl+V e drag-and-drop caem todos aqui.
   * Nada é enviado na hora — o arquivo fica na bandeja até o "Enviar", que é
   * o que torna colar um print seguro (um Ctrl+V sem querer não vaza pro
   * cliente) e permite mandar legenda junto.
   */
  const addFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;
      if (!onSendFile) {
        toast.error('Esta conversa não aceita anexos no momento.');
        return;
      }
      const slots = MAX_PENDING_FILES - pendingRef.current.length;
      const { accepted, rejected } = validateFiles(incoming, slots);
      for (const item of rejected) {
        toast.error(`"${item.name}" não foi anexado — ${item.reason}.`);
      }
      if (!accepted.length) return;
      const added: PendingAttachment[] = accepted.map((file) => ({
        id: `att-${(seqRef.current += 1)}`,
        file,
        previewUrl: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
      }));
      setPending((prev) => [...prev, ...added]);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    [onSendFile],
  );

  const removePending = useCallback((id: string) => {
    setPending((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    insertText: (incoming: string) => {
      setText((prev) => (prev.trim() ? `${prev}\n${incoming}` : incoming));
      // Foca e reajusta a altura no próximo tick, após o setText aplicar.
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 160) + 'px';
        }
      });
    },
    addFiles,
  }), [addFiles]);

  const handleOrderSent = useCallback(() => {
    if (!conversationId) return;
    setAcceptOpen(true);
  }, [conversationId]);

  const clearTextarea = useCallback(() => {
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, []);

  /**
   * Envia a fila de anexos, um por um. O texto do compositor vai como legenda
   * do PRIMEIRO arquivo (é assim que o WhatsApp casa foto + comentário).
   * Se um envio falhar no meio, os já enviados saem da bandeja e o resto fica
   * lá pro operador tentar de novo — nada é enviado em duplicidade.
   */
  const handleSendPending = useCallback(async () => {
    if (!onSendFile || isSendingFile) return;
    const caption = text.trim();
    const queue = [...pendingRef.current];
    if (!queue.length) return;
    setIsSendingFile(true);
    let captionSent = false;
    try {
      while (queue.length) {
        const item = queue[0];
        const patch = (fields: Partial<PendingAttachment>) =>
          setPending((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, ...fields } : p)),
          );
        patch({ progress: 0, phase: 'uploading' });
        await onSendFile(
          item.file,
          !captionSent && caption ? caption : undefined,
          (ratio) =>
            patch(
              ratio >= 1
                ? { progress: 1, phase: 'finishing' }
                : { progress: ratio, phase: 'uploading' },
            ),
        );
        captionSent = true;
        queue.shift();
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        // Some da bandeja assim que sai — feedback imediato numa leva grande.
        setPending((prev) => prev.filter((p) => p.id !== item.id));
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar arquivo',
      );
    } finally {
      setPending(queue);
      if (captionSent) clearTextarea();
      setIsSendingFile(false);
    }
  }, [onSendFile, isSendingFile, text, clearTextarea]);

  const handleSubmit = useCallback(async () => {
    if (pendingRef.current.length) {
      await handleSendPending();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      clearTextarea();
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSend, handleSendPending, clearTextarea]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /**
   * Ctrl+V de um print (ou de um arquivo copiado no Finder/Explorer) vira
   * anexo direto. Só engolimos o paste quando veio arquivo — colar texto
   * continua normal.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = filesFromClipboard(e.clipboardData).map((file) =>
        renamePastedFile(file),
      );
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    },
    [addFiles],
  );

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Erro ao enviar áudio',
      );
    } finally {
      setIsSendingAudio(false);
    }
  }, [recorder, onSendAudio]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      // Limpa o value pra permitir reescolher o MESMO arquivo em seguida —
      // sem isso o onChange não dispara na segunda escolha.
      e.target.value = '';
      addFiles(files);
    },
    [addFiles],
  );

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (disabled) {
    // Conversa encerrada. Se for canal oficial com a janela de 24h fechada,
    // texto livre não reabre a conversa — só um template aprovado. Oferecemos
    // o botão aqui mesmo pra reengajar o lead frio sem ter que reabrir antes.
    const canUseTemplate = windowClosed && !!onUseTemplate;
    return (
      <div className="m-3 rounded-2xl border border-border bg-card px-4 py-3 text-center text-sm text-muted-foreground shadow-soft">
        {canUseTemplate ? (
          <>
            <p className="leading-relaxed">
              Conversa encerrada e a janela de {windowKindLabel(windowKind ?? null)}{' '}
              fechou. Envie um template aprovado para reabrir e falar com o cliente.
            </p>
            <Button
              onClick={onUseTemplate}
              size="sm"
              className="mt-2.5"
              aria-label="Usar template aprovado"
            >
              <FileText className="h-4 w-4" />
              Usar template
            </Button>
          </>
        ) : (
          'Conversa encerrada — reabra para enviar mensagens'
        )}
      </div>
    );
  }

  // WINDOW CLOSED: a janela de atendimento do WhatsApp fechou (24h do último
  // inbound, ou 72h quando o lead veio de anúncio Click-to-WhatsApp). Texto
  // livre é rejeitado pela Meta — só um template aprovado reabre a conversa.
  if (windowClosed) {
    return (
      <div className="m-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-soft dark:border-amber-900/50 dark:bg-amber-900/20">
        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          A janela de {windowKindLabel(windowKind ?? null)} fechou. Só é possível
          enviar um template aprovado.
        </p>
        <Button
          onClick={onUseTemplate}
          disabled={!onUseTemplate}
          size="sm"
          className="mt-2.5"
          aria-label="Usar template aprovado"
        >
          <FileText className="h-4 w-4" />
          Usar template
        </Button>
      </div>
    );
  }

  // RECORDING MODE: shows a big bar with a pulsing red dot and the timer.
  if (recorder.state === 'recording') {
    return (
      <div className="m-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-500/10">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
            aria-label="Cancelar gravação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span className="text-xs opacity-70">Gravando…</span>
          </div>
          <button
            onClick={recorder.stop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
            aria-label="Parar gravação"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // PREVIEW MODE: the recording finished, user can listen/discard/send.
  if (recorder.state === 'stopped' && recorder.blob) {
    const audioSrc = URL.createObjectURL(recorder.blob);
    return (
      <div className="m-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
          <button
            onClick={recorder.cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted-foreground/10 hover:text-red-500"
            aria-label="Descartar áudio"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <audio
            controls
            src={audioSrc}
            className="h-9 flex-1 min-w-0"
          />
          <Button
            onClick={handleSendAudio}
            disabled={isSendingAudio}
            loading={isSendingAudio}
            size="sm"
            aria-label="Enviar áudio"
          >
            {!isSendingAudio && <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </div>
        {recorder.error && (
          <p className="mt-1 text-xs text-red-500">{recorder.error}</p>
        )}
      </div>
    );
  }

  // IDLE MODE: text input + mic button.
  const hasPending = pending.length > 0;
  const canRecord = !!onSendAudio;
  const showMic = canRecord && !text.trim() && !hasPending;

  return (
    <div className="m-3 rounded-2xl border border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-soft">
      {/* Bandeja de anexos: o que foi colado, arrastado ou escolhido no clipe
          espera aqui até o "Enviar" — com chance de tirar e de pôr legenda. */}
      {hasPending && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-1.5 pr-2"
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  {item.file.type.startsWith('video/') ? (
                    <Film className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
              )}
              <div className="min-w-0 w-[9rem]">
                <p className="truncate text-xs font-medium text-foreground">
                  {item.file.name}
                </p>
                {item.phase ? (
                  <>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-150"
                        style={{
                          width: `${Math.round((item.progress ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.phase === 'finishing'
                        ? 'Entregando…'
                        : `Subindo ${Math.round((item.progress ?? 0) * 100)}%`}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePending(item.id)}
                disabled={isSendingFile}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remover ${item.file.name}`}
                title="Remover anexo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
        {/* Mobile: recolhe as ações extras num "+" pra não espremer o campo de texto */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Mais ações"
          title="Mais ações"
        >
          <Plus className="h-5 w-5" />
        </button>
        {/* Desktop: ações inline. No mobile elas vivem no bottom sheet (botão "+"). */}
        <div className="hidden items-end gap-2 lg:flex">
        <Dropdown>
          <DropdownButton
            as="button"
            type="button"
            disabled={isSendingFile}
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
            aria-label="Anexar arquivo"
          >
            {isSendingFile ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </DropdownButton>
          <DropdownMenu anchor="top start">
            <DropdownItem
              onClick={() => onSendFile && fileInputRef.current?.click()}
              className={!onSendFile ? 'cursor-not-allowed opacity-50' : undefined}
            >
              <Smartphone /> Do meu dispositivo
            </DropdownItem>
            {conversationId && (
              <DropdownItem onClick={() => setLibraryOpen(true)}>
                <FolderOpen /> Biblioteca de arquivos
              </DropdownItem>
            )}
          </DropdownMenu>
        </Dropdown>
        {onOpenTemplates && (
          <button
            type="button"
            onClick={onOpenTemplates}
            disabled={!onOpenTemplates}
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
            title="Enviar template"
            aria-label="Enviar template"
          >
            <LayoutTemplate className="h-5 w-5" />
          </button>
        )}
        {conversationId && (
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
            title="Agendar mensagem"
            aria-label="Agendar mensagem"
          >
            <Clock className="h-5 w-5" />
          </button>
        )}
        {conversationId && (
          <button
            type="button"
            onClick={() => setProposalOpen(true)}
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
            title="Enviar proposta do carrinho"
            aria-label="Enviar proposta do carrinho"
          >
            <Plane className="h-5 w-5" />
          </button>
        )}
        {conversationId && (
          <button
            type="button"
            onClick={() => setWonOpen(true)}
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
            title="Marcar como Ganho (nº do pedido)"
            aria-label="Marcar como Ganho"
          >
            <Trophy className="h-5 w-5" />
          </button>
        )}
        {conversationId && (
          <button
            type="button"
            onClick={handleOrderSent}
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
            title="Marcar pedido como enviado"
            aria-label="Marcar pedido como enviado"
          >
            <PackageCheck className="h-5 w-5" />
          </button>
        )}
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={
            hasPending
              ? 'Escreva uma legenda (opcional)…'
              : 'Digite uma mensagem... (cole um print com Ctrl+V)'
          }
          rows={1}
          className="max-h-40 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-foreground transition-colors hover:bg-muted/70 lg:mb-1 lg:h-auto lg:w-auto lg:p-2.5"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={(!text.trim() && !hasPending) || isSending || isSendingFile}
            loading={isSending || isSendingFile}
            size="icon"
            className="mb-0.5 h-11 w-11 lg:mb-1 lg:h-auto lg:w-auto lg:p-2.5"
            aria-label={hasPending ? 'Enviar anexos' : 'Enviar mensagem'}
          >
            {!isSending && !isSendingFile && <Send className="h-5 w-5" />}
          </Button>
        )}
      </div>
      {/* Mobile: bottom sheet com as ações extras (espelha os ícones do desktop) */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Ações da mensagem">
        <div className="flex flex-col">
          {onSendFile && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); fileInputRef.current?.click(); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Smartphone className="h-5 w-5" /> Anexar do dispositivo
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setLibraryOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <FolderOpen className="h-5 w-5" /> Biblioteca de arquivos
            </button>
          )}
          {onOpenTemplates && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); onOpenTemplates(); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <LayoutTemplate className="h-5 w-5" /> Enviar template
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setScheduleOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Clock className="h-5 w-5" /> Agendar mensagem
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setProposalOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Plane className="h-5 w-5" /> Enviar proposta do carrinho
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setWonOpen(true); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Trophy className="h-5 w-5" /> Marcar como Ganho
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); handleOrderSent(); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <PackageCheck className="h-5 w-5" /> Marcar pedido como enviado
            </button>
          )}
        </div>
      </BottomSheet>
      {recorder.error && (
        <p className="mt-1.5 text-xs text-red-500">{recorder.error}</p>
      )}
      {conversationId && (
        <ScheduleMessageDialog
          conversationId={conversationId}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          initialText={text.trim() || undefined}
        />
      )}
      {conversationId && (
        <ProposalDialog
          conversationId={conversationId}
          open={proposalOpen}
          onOpenChange={setProposalOpen}
        />
      )}
      {conversationId && (
        <WonDialog
          conversationId={conversationId}
          open={wonOpen}
          onOpenChange={setWonOpen}
        />
      )}
      {conversationId && (
        <AcceptanceDialog
          conversationId={conversationId}
          open={acceptOpen}
          onOpenChange={setAcceptOpen}
        />
      )}
      {conversationId && (
        <MediaLibraryDialog
          conversationId={conversationId}
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
        />
      )}
    </div>
  );
});
