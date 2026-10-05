'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useSyncExternalStore,
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
  MessageSquareReply,
  Clock,
  Plane,
  Trophy,
  PackageCheck,
  FolderOpen,
  Smartphone,
  Plus,
  Smile,
  Zap,
} from 'lucide-react';
import { useQuickReplies } from '@/features/quick-replies/hooks/use-quick-replies';
import {
  QuickReplyPopover,
  QUICK_REPLY_LISTBOX_ID,
  quickReplyOptionId,
} from '@/features/quick-replies/components/quick-reply-popover';
import type { QuickReply } from '@/features/quick-replies/services/quick-replies.service';
import {
  applyQuickReply,
  fillVariables,
  filterQuickReplies,
  slashQueryAt,
  type SlashMatch,
} from '@/features/quick-replies/lib/quick-reply-match';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useAudioRecorder } from '../hooks/use-audio-recorder';
import { windowKindLabel, type WindowKind } from '../lib/window-state';
import { insertAtCursor } from '../lib/text-insert';
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
import { EmojiStickerPopover } from './emoji-sticker-popover';
import { getErrorMessage } from '@/lib/errors';
import { loadDraft, saveDraft } from '../lib/drafts';

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
  /**
   * Envia uma figurinha da Biblioteca. Recebe a url do asset — o backend
   * confere que ele pertence à organização antes de repassar ao provedor.
   */
  onSendSticker?: (mediaUrl: string) => Promise<void>;
  disabled?: boolean;
  /** Janela de atendimento fechada (WHATSAPP_OFFICIAL) — bloqueia texto livre. */
  windowClosed?: boolean;
  /** Regra da janela vigente — só muda o texto ("de 24h" ou "de anúncio"). */
  windowKind?: WindowKind | null;
  /** Abre o picker de templates aprovados. */
  onUseTemplate?: () => void;
  /** Abre o picker de templates a partir do compositor (canal oficial). */
  onOpenTemplates?: () => void;
  /** Abre o template de retomada do canal (reabre a janela de 24h). */
  onReengage?: () => void;
  /** Habilita o botão "Agendar" (abre o modal de agendamento). */
  conversationId?: string;
  /** Nome do cliente — preenche {{nome}}/{{primeiro_nome}} das mensagens rápidas. */
  contactName?: string | null;
}

// Espelha o whitelist do backend (UploadsService.ALLOWED_MEDIA_MIME) — o
// accept é só UX; a validação real acontece no upload.
const FILE_ACCEPT = [
  'image/*',
  'video/*',
  // Sem `audio/*` o seletor do sistema esconde os arquivos de áudio — o
  // operador não conseguia nem escolher um MP3 do próprio aparelho.
  'audio/*',
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

/**
 * Altura máxima (px) que o textarea cresce antes de rolar. Espelha `lg:max-h-80`.
 * No celular o teto é menor (5 linhas, `max-h-36`) e quem manda é o CSS.
 */
const TEXTAREA_MAX_HEIGHT = 320;

/**
 * Botões da barra de ações do desktop (fica acima do campo de texto). Todos
 * com a mesma área de clique (32px), o mesmo hover e anel de foco; cada um
 * leva `aria-label` + `title`, porque são só ícone.
 */
const TOOLBAR_BUTTON_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'data-[open]:bg-muted data-[open]:text-foreground disabled:cursor-not-allowed disabled:opacity-50';
const TOOLBAR_ICON_CLASS = 'h-[18px] w-[18px]';

/** `lg` do Tailwind: daqui pra cima há teclado físico e a barra de ações do desktop. */
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeDesktop(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/**
 * true a partir do breakpoint `lg`. Só decide o texto do placeholder: a dica
 * "cole um print com Ctrl+V" não faz sentido no celular, onde não há Ctrl+V.
 */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

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
  onSendSticker,
  disabled,
  windowClosed,
  windowKind,
  onUseTemplate,
  onOpenTemplates,
  onReengage,
  conversationId,
  contactName,
}, ref) {
  // Rascunho por conversa: o texto pela metade volta quando o operador
  // retorna a esta conversa.
  const [text, setText] = useState(() => loadDraft(conversationId));
  useEffect(() => {
    saveDraft(conversationId, text);
  }, [conversationId, text]);
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
  const isDesktop = useIsDesktop();
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
          el.style.height = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px';
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
   * Insere o emoji onde o cursor está e devolve o foco ao textarea com o cursor
   * DEPOIS do emoji. Sem reposicionar o cursor à mão, o navegador joga o cursor
   * para o fim a cada emoji — escolher dois emojis no meio da frase inverteria a
   * ordem deles.
   *
   * O painel não é fechado de propósito: o atendente costuma escolher mais de um.
   *
   * Diferente do `insertText` do handle imperativo, que acrescenta numa linha
   * nova no fim (comportamento certo para sugestão da IA e template, errado
   * para emoji).
   */
  const handlePickEmoji = useCallback((emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const { text: next, caret } = insertAtCursor(text, start, end, emoji);

    setText(next);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
      node.style.height = 'auto';
      node.style.height = Math.min(node.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px';
    });
  }, [text]);

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
        getErrorMessage(err, 'Erro ao enviar arquivo'),
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
    // Limpa já no Enter: o operador costuma emendar a próxima frase enquanto
    // a anterior sai, e limpar só no fim apagava o que ele digitou no meio.
    clearTextarea();
    try {
      await onSend(trimmed);
    } catch (err) {
      // Devolve o texto para não perder a mensagem, na frente do que já foi
      // digitado depois, e diz o motivo em vez de falhar calado.
      setText((typedMeanwhile) =>
        typedMeanwhile.trim() ? `${trimmed}\n${typedMeanwhile}` : trimmed,
      );
      toast.error(getErrorMessage(err, 'A mensagem não foi enviada. Tente de novo.'));
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSend, handleSendPending, clearTextarea]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (handleQuickReplyKey(e)) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
    el.style.height = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px';
  };

  // ── Mensagens rápidas: "/" no campo abre a lista (estilo Umbler) ──────────
  const [slashMatch, setSlashMatch] = useState<SlashMatch | null>(null);
  const [quickIndex, setQuickIndex] = useState(0);
  const { data: quickReplies = [], isLoading: quickLoading } = useQuickReplies();
  const quickSuggestions = slashMatch ? filterQuickReplies(quickReplies, slashMatch.query) : [];
  const isQuickListOpen = quickSuggestions.length > 0;
  const activeQuickReply = isQuickListOpen
    ? quickSuggestions[Math.min(quickIndex, quickSuggestions.length - 1)]
    : undefined;

  const refreshSlashMatch = useCallback((value: string, caret: number) => {
    setSlashMatch(slashQueryAt(value, caret));
    setQuickIndex(0);
  }, []);

  const pickQuickReply = useCallback((reply: QuickReply) => {
    if (!slashMatch) return;
    const content = fillVariables(reply.content, contactName);
    const { text: next, caret } = applyQuickReply(text, slashMatch, content);
    setText(next);
    setSlashMatch(null);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
      node.style.height = 'auto';
      node.style.height = Math.min(node.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px';
    });
  }, [slashMatch, contactName, text]);

  /** Botão ⚡ da barra: escreve a "/" no cursor e abre a lista. */
  const openQuickReplies = useCallback(() => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const needsSpace = start > 0 && !/\s/.test(text[start - 1]);
    const { text: next, caret } = insertAtCursor(text, start, end, needsSpace ? ' /' : '/');
    setText(next);
    refreshSlashMatch(next, caret);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  }, [text, refreshSlashMatch]);

  /** true = a tecla foi usada pela lista de mensagens rápidas. */
  const handleQuickReplyKey = (e: React.KeyboardEvent): boolean => {
    // Enter/setas confirmando acento ou candidato do IME não são da lista.
    if (!slashMatch || e.nativeEvent.isComposing) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      setSlashMatch(null);
      return true;
    }
    if (quickSuggestions.length === 0) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setQuickIndex((i) => (i + step + quickSuggestions.length) % quickSuggestions.length);
      return true;
    }
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
      e.preventDefault();
      pickQuickReply(quickSuggestions[Math.min(quickIndex, quickSuggestions.length - 1)]);
      return true;
    }
    return false;
  };

  const handleSendAudio = useCallback(async () => {
    if (!recorder.blob || !onSendAudio) return;
    setIsSendingAudio(true);
    try {
      await onSendAudio(recorder.blob);
      recorder.reset();
    } catch (err: any) {
      toast.error(
        getErrorMessage(err, 'Erro ao enviar áudio'),
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
              Conversa encerrada e a janela {windowKindLabel(windowKind ?? null)}{' '}
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
  // inbound, ou o prazo de anúncio que a Meta informa para Click-to-WhatsApp). Texto
  // livre é rejeitado pela Meta — só um template aprovado reabre a conversa.
  if (windowClosed) {
    return (
      <div className="m-3 rounded-2xl bg-warning-wash px-4 py-3 shadow-soft">
        <p className="text-sm leading-relaxed text-warning-ink">
          A janela {windowKindLabel(windowKind ?? null)} fechou. Só é possível
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
        <div className="flex items-center gap-2 rounded-xl bg-urgent-wash px-3 py-2.5">
          <button
            type="button"
            onClick={recorder.cancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-urgent-ink hover:bg-urgent/15"
            aria-label="Cancelar gravação"
            title="Cancelar gravação"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-2 text-sm text-urgent-ink">
            <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-urgent" />
            </span>
            {/* O cronômetro muda 5x por segundo: fora do leitor de tela, que
                só precisa saber que a gravação começou. */}
            <span aria-hidden="true" className="font-mono font-medium tabular-nums">{formatElapsed(recorder.elapsedMs)}</span>
            <span role="status" className="text-xs">Gravando…</span>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={recorder.stop}
            className="h-10 w-10 shrink-0"
            aria-label="Parar gravação"
            title="Parar gravação"
          >
            <Square aria-hidden="true" className="h-4 w-4" />
          </Button>
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
            type="button"
            onClick={recorder.cancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted-foreground/10 hover:text-urgent-ink"
            aria-label="Descartar áudio"
            title="Descartar áudio"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
          <audio
            controls
            aria-label="Prévia do áudio gravado"
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
          <p role="alert" className="mt-1 text-xs text-urgent-ink">{recorder.error}</p>
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
                  ) : item.file.type.startsWith('audio/') ? (
                    <Mic className="h-5 w-5" />
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
                    <div
                      role="progressbar"
                      aria-label={`Envio de ${item.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round((item.progress ?? 0) * 100)}
                      aria-valuetext={
                        item.phase === 'finishing'
                          ? 'Entregando'
                          : `${Math.round((item.progress ?? 0) * 100)}% enviado`
                      }
                      className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-150"
                        style={{
                          width: `${Math.round((item.progress ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                    <p aria-hidden="true" className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {item.phase === 'finishing'
                        ? 'Entregando…'
                        : `Subindo ${Math.round((item.progress ?? 0) * 100)}%`}
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePending(item.id)}
                disabled={isSendingFile}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-urgent-ink disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Remover ${item.file.name}`}
                title="Remover anexo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT}
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Desktop: barra de ações acima do campo. No mobile elas vivem no bottom sheet (botão "+").
          Dois grupos separados por um fio: ferramentas da mensagem | ações de venda. */}
      <div
        role="toolbar"
        aria-label="Ações da mensagem"
        className="mb-2 hidden flex-wrap items-center gap-0.5 lg:flex"
      >
        {/*
          Só desktop: no celular o teclado do sistema já tem tecla de emoji.
          Fica dentro desta div, que o `windowClosed` (early return acima) já
          remove inteira quando a janela de atendimento fecha.
        */}
        <Popover className="relative">
          <PopoverButton
            as="button"
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            title="Emojis e figurinhas"
            aria-label="Emojis e figurinhas"
          >
            <Smile aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
          </PopoverButton>
          <PopoverPanel
            anchor="top start"
            className="z-50 rounded-xl border border-border bg-popover shadow-elevated"
          >
            <EmojiStickerPopover
              onPickEmoji={handlePickEmoji}
              onPickSticker={(asset) => {
                void onSendSticker?.(asset.url);
              }}
            />
          </PopoverPanel>
        </Popover>
        <button
          type="button"
          // mousedown só segura o foco: o cursor do textarea fica onde o
          // atendente parou. Quem abre é o click — que também vem do teclado
          // (Enter/Espaço), coisa que o mousedown sozinho não cobria.
          onMouseDown={(e) => e.preventDefault()}
          onClick={openQuickReplies}
          aria-haspopup="listbox"
          className={TOOLBAR_BUTTON_CLASS}
          title="Mensagens rápidas (ou digite / no campo)"
          aria-label="Mensagens rápidas"
        >
          <Zap aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
        </button>
        <Dropdown>
          <DropdownButton
            as="button"
            type="button"
            disabled={isSendingFile}
            className={TOOLBAR_BUTTON_CLASS}
            title={isSendingFile ? 'Enviando arquivo…' : 'Anexar arquivo'}
            aria-label="Anexar arquivo"
          >
            {isSendingFile ? (
              <Loader2 aria-hidden="true" className={`${TOOLBAR_ICON_CLASS} animate-spin`} />
            ) : (
              <Paperclip aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
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
            className={TOOLBAR_BUTTON_CLASS}
            title="Enviar template"
            aria-label="Enviar template"
          >
            <LayoutTemplate aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
          </button>
        )}
        {onReengage && (
          <button
            type="button"
            onClick={onReengage}
            className={TOOLBAR_BUTTON_CLASS}
            title="Retomar contato (template de 24h)"
            aria-label="Retomar contato com template"
          >
            <MessageSquareReply aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
          </button>
        )}
        {conversationId && (
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className={TOOLBAR_BUTTON_CLASS}
            title="Agendar mensagem"
            aria-label="Agendar mensagem"
          >
            <Clock aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
          </button>
        )}
        {conversationId && (
          <>
            {/* Fio entre as ferramentas da mensagem e as ações de venda. */}
            <span aria-hidden="true" className="mx-1.5 h-5 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={() => setProposalOpen(true)}
              className={TOOLBAR_BUTTON_CLASS}
              title="Enviar proposta do carrinho"
              aria-label="Enviar proposta do carrinho"
            >
              <Plane aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
            </button>
            <button
              type="button"
              onClick={() => setWonOpen(true)}
              className={TOOLBAR_BUTTON_CLASS}
              title="Marcar como Ganho (nº do pedido)"
              aria-label="Marcar como Ganho"
            >
              <Trophy aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
            </button>
            <button
              type="button"
              onClick={handleOrderSent}
              className={TOOLBAR_BUTTON_CLASS}
              title="Marcar pedido como enviado"
              aria-label="Marcar pedido como enviado"
            >
              <PackageCheck aria-hidden="true" className={TOOLBAR_ICON_CLASS} />
            </button>
          </>
        )}
      </div>
      <div className="relative flex items-end gap-2">
        {slashMatch && (
          <QuickReplyPopover
            items={quickSuggestions}
            activeIndex={quickIndex}
            query={slashMatch.query}
            isLoading={quickLoading}
            onPick={pickQuickReply}
            onHover={setQuickIndex}
          />
        )}
        {/* Mobile: recolhe as ações extras num "+" pra não espremer o campo de texto */}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Mais ações"
          title="Mais ações"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            refreshSlashMatch(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onBlur={() => setSlashMatch(null)}
          // Cursor mudou sem digitar (clique, setas): a posição do "/" guardada
          // ficaria velha e a mensagem rápida entraria no lugar errado.
          onSelect={(e) => {
            if (!slashMatch) return;
            const el = e.currentTarget;
            const next = slashQueryAt(el.value, el.selectionStart ?? el.value.length);
            if (!next || next.start !== slashMatch.start || next.end !== slashMatch.end) setSlashMatch(next);
          }}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          aria-label={hasPending ? 'Legenda do anexo' : 'Mensagem'}
          // Combobox: a lista de mensagens rápidas (aberta com "/") é anunciada
          // e a opção ativa acompanha as setas, sem tirar o foco do campo.
          role="combobox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-expanded={isQuickListOpen}
          aria-controls={isQuickListOpen ? QUICK_REPLY_LISTBOX_ID : undefined}
          aria-activedescendant={activeQuickReply ? quickReplyOptionId(activeQuickReply.id) : undefined}
          placeholder={
            hasPending
              ? 'Escreva uma legenda (opcional)…'
              : isDesktop
                ? 'Digite uma mensagem… (cole um print com Ctrl+V)'
                : 'Digite uma mensagem…'
          }
          // Celular: começa com 1 linha e cresce até 5. Desktop: as 3 linhas de sempre.
          rows={1}
          className="max-h-36 min-h-12 flex-1 resize-none rounded-xl border border-border bg-muted px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-h-80 lg:min-h-[96px]"
        />
        {showMic ? (
          <button
            onClick={recorder.start}
            type="button"
            className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:mb-1 lg:h-auto lg:w-auto lg:p-2.5"
            aria-label="Gravar áudio"
            title="Gravar áudio"
          >
            <Mic aria-hidden="true" className="h-5 w-5" />
          </button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={(!text.trim() && !hasPending) || isSending || isSendingFile}
            loading={isSending || isSendingFile}
            size="icon"
            className="mb-0.5 h-11 w-11 shrink-0 lg:mb-1 lg:h-auto lg:w-auto lg:p-2.5"
            aria-label={hasPending ? 'Enviar anexos' : 'Enviar mensagem'}
            title={hasPending ? 'Enviar anexos' : 'Enviar mensagem (Enter)'}
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
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Smartphone aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Anexar do dispositivo
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setLibraryOpen(true); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <FolderOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Biblioteca de arquivos
            </button>
          )}
          {onOpenTemplates && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); onOpenTemplates(); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <LayoutTemplate aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Enviar template
            </button>
          )}
          {onReengage && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); onReengage(); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <MessageSquareReply aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Retomar contato
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setScheduleOpen(true); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Clock aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Agendar mensagem
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setProposalOpen(true); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Plane aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Enviar proposta do carrinho
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); setWonOpen(true); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
            >
              <Trophy aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Marcar como Ganho
            </button>
          )}
          {conversationId && (
            <button
              type="button"
              onClick={() => { setMoreOpen(false); handleOrderSent(); }}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <PackageCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" /> Marcar pedido como enviado
            </button>
          )}
        </div>
      </BottomSheet>
      {recorder.error && (
        <p role="alert" className="mt-1.5 text-xs text-urgent-ink">{recorder.error}</p>
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
