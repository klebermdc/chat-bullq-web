'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Flame, MessageSquare, Snowflake, Sun, User } from 'lucide-react';
import { ZappfyIcon, WasenderIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import type { CardSummary } from '../services/pipelines.service';
import { resolveLeadOrigin } from '../lib/lead-origin';
import { formatMoney } from '@/lib/money';
import { getInitials } from '@/lib/initials';

const chipCls =
  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4';

/** Termômetro do lead: ícone + palavra, nas cores de estado do tema. */
const TEMPERATURE = {
  hot: { label: 'Quente', icon: Flame, cls: 'bg-urgent-wash text-urgent-ink' },
  warm: { label: 'Morno', icon: Sun, cls: 'bg-warning-wash text-warning-ink' },
  cold: { label: 'Frio', icon: Snowflake, cls: 'bg-muted text-muted-foreground' },
} as const;

function temperatureOf(value: number) {
  if (value >= 3) return TEMPERATURE.hot;
  if (value === 2) return TEMPERATURE.warm;
  return TEMPERATURE.cold;
}

const channelIconByType: Record<string, React.ElementType> = {
  WHATSAPP_ZAPPFY: ZappfyIcon,
  WHATSAPP_WASENDER: WasenderIcon,
  WHATSAPP_OFFICIAL: MetaIcon,
  INSTAGRAM: InstagramIcon,
};

const fmtDayMonth = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface KirvanoMeta {
  event?: string;
  productName?: string | null;
  checkoutUrl?: string | null;
}

// Rótulo curto da origem do lead (evento da Kirvano) pra mostrar no card.
const KIRVANO_ORIGIN: Record<string, string> = {
  PIX_GENERATED: 'PIX',
  PIX_EXPIRED: 'PIX expirado',
  BANK_SLIP_GENERATED: 'Boleto',
  BANK_SLIP_EXPIRED: 'Boleto expirado',
  ABANDONED_CART: 'Abandono',
  SALE_REFUSED: 'Recusado',
  SALE_APPROVED: 'Pago',
  SALE_REFUNDED: 'Reembolso',
  SALE_CHARGEBACK: 'Chargeback',
};

function readKirvano(metadata: Record<string, unknown>): KirvanoMeta | null {
  const k = (metadata as { kirvano?: KirvanoMeta })?.kirvano;
  return k && typeof k === 'object' ? k : null;
}

interface Props {
  card: CardSummary;
  onClick?: () => void;
}

export function KanbanCard({ card, onClick }: Props) {
  const { listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { type: 'card', card },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  // Moeda do próprio card: o carrinho pode vir em dólar.
  const value = formatMoney(card.value, card.currency);
  const contact = card.contact;
  const assignedTo = card.assignedTo;
  const kirvano = readKirvano(card.metadata);
  const origin = kirvano?.event ? KIRVANO_ORIGIN[kirvano.event] : null;
  const leadOrigin = resolveLeadOrigin(card);

  const temperature = card.conversation?.temperature
    ? temperatureOf(card.conversation.temperature)
    : null;
  const contactLabel = contact ? contact.name || contact.phone : null;
  // O título do card costuma ser o nome do contato; repetir embaixo só ocupa linha.
  const showContact = !!contactLabel && contactLabel !== card.title;

  const channel = card.conversation?.channel ?? null;
  const ChannelIcon = channel
    ? (channelIconByType[channel.type] ?? MessageSquare)
    : null;
  const entryDate = fmtDayMonth(card.createdAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...listeners}
      className="group relative cursor-grab rounded-lg border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-elevated active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        {/* Botão real: Tab chega aqui e Enter abre o card (o clique sobe para o card). */}
        <button
          type="button"
          className="min-w-0 truncate rounded text-left text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {card.title}
        </button>
        {value && (
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
            {value}
          </span>
        )}
      </div>
      {card.description && (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{card.description}</p>
      )}

      {/* Uma linha só de chips: a altura é fixa e o que não cabe quebra para
          uma segunda linha que fica escondida, então o chip some inteiro em
          vez de aparecer cortado ao meio. */}
      <div className="mt-2 flex h-5 flex-wrap content-start items-center gap-x-1.5 gap-y-2 overflow-hidden">
        {temperature && (
          <span className={`${chipCls} ${temperature.cls}`} title="Termômetro do lead">
            <temperature.icon aria-hidden="true" className="h-3 w-3" />
            {temperature.label}
          </span>
        )}
        {card.status === 'WON' && (
          <span className={`${chipCls} bg-success-wash text-success-ink`}>Ganho</span>
        )}
        {card.status === 'LOST' && (
          <span className={`${chipCls} bg-urgent-wash text-urgent-ink`}>Perdido</span>
        )}
        <span className={`${chipCls} bg-muted text-muted-foreground`} title="Origem do lead">
          {leadOrigin.label}
        </span>
        {origin && <span className={`${chipCls} bg-muted text-muted-foreground`}>{origin}</span>}
      </div>

      {kirvano && (kirvano.productName || kirvano.checkoutUrl) && (
        <div className="mt-2 space-y-0.5">
          {kirvano.productName && (
            <p className="truncate text-[11px] text-muted-foreground">
              {kirvano.productName}
            </p>
          )}
          {kirvano.checkoutUrl && (
            <a
              href={kirvano.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-block text-[11px] font-medium text-primary hover:underline"
            >
              Abrir checkout →
            </a>
          )}
        </div>
      )}

      {showContact && (
        <p className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <User aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span className="truncate">{contactLabel}</span>
        </p>
      )}

      {/* Rodapé fixo, presente em todo card: data à esquerda, canal e
          responsável à direita. */}
      <div className="mt-2 flex h-6 items-center justify-between gap-2">
        {entryDate ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground"
            title="Data de entrada do lead"
          >
            <CalendarDays aria-hidden="true" className="h-3 w-3" />
            {entryDate}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        <div className="flex shrink-0 items-center gap-1">
          {channel && ChannelIcon && (
            <span
              role="img"
              aria-label={`Canal: ${channel.name}`}
              title={`Canal: ${channel.name}`}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted"
            >
              <ChannelIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
          {!card.conversation && card.conversationId && (
            <span
              role="img"
              aria-label="Tem conversa vinculada"
              title="Tem conversa vinculada"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted"
            >
              <MessageSquare aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
          {assignedTo && (
            <span
              title={`Responsável: ${assignedTo.name}`}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
            >
              <span aria-hidden="true">{getInitials(assignedTo.name) || '?'}</span>
              <span className="sr-only">Responsável: {assignedTo.name}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
