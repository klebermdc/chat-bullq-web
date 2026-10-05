'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, MessageSquare, Phone, Instagram, Mail, Send, Users, Tag, Star, Filter } from 'lucide-react';
import { toast } from 'sonner';
import {
  inboxViewsService,
  type InboxView,
  type InboxViewFilters,
} from '../services/inbox-views.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { tagsService } from '@/features/settings/services/tags.service';
import { getErrorMessage } from '@/lib/errors';
import { channelTypeLabel } from '@/lib/channel-labels';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';

interface Props {
  open: boolean;
  view: InboxView | null;
  onClose: () => void;
  onSaved: () => void;
}

const ICONS = [
  { name: 'Inbox', Icon: Inbox },
  { name: 'MessageSquare', Icon: MessageSquare },
  { name: 'Phone', Icon: Phone },
  { name: 'Instagram', Icon: Instagram },
  { name: 'Mail', Icon: Mail },
  { name: 'Send', Icon: Send },
  { name: 'Users', Icon: Users },
  { name: 'Tag', Icon: Tag },
  { name: 'Star', Icon: Star },
  { name: 'Filter', Icon: Filter },
];

// Cor escolhida pelo usuário para a inbox (dado, não estado) — fica como está.
const COLORS = [
  { name: 'default', label: 'Cinza', cls: 'bg-zinc-400' },
  { name: 'green', label: 'Verde', cls: 'bg-green-500' },
  { name: 'pink', label: 'Rosa', cls: 'bg-pink-500' },
  { name: 'violet', label: 'Violeta', cls: 'bg-violet-500' },
  { name: 'blue', label: 'Azul', cls: 'bg-blue-500' },
  { name: 'amber', label: 'Âmbar', cls: 'bg-amber-500' },
  { name: 'red', label: 'Vermelho', cls: 'bg-red-500' },
];

const fieldLabelCls = 'block text-sm font-medium text-foreground';
const pillCls = (active: boolean) =>
  `inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
  }`;

const STATUSES = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'OPEN', label: 'Aberta' },
  { value: 'WAITING', label: 'Aguardando' },
  { value: 'CLOSED', label: 'Fechada' },
];

const ASSIGNED_OPTIONS = [
  { value: 'any', label: 'Qualquer pessoa' },
  { value: 'me', label: 'Atribuída a mim' },
  { value: 'none', label: 'Não atribuída' },
];

/** Mesmo sinal das abas Esperando / Caixa de entrada, fixado na view. */
const QUEUE_OPTIONS: Array<{ value: '' | 'waiting' | 'answered'; label: string }> = [
  { value: '', label: 'Qualquer' },
  { value: 'waiting', label: 'Aguardando atendimento' },
  { value: 'answered', label: 'Já respondidas' },
];

const KIND_OPTIONS: Array<{ value: '' | 'INDIVIDUAL' | 'GROUP'; label: string }> = [
  { value: '', label: 'Todas' },
  { value: 'INDIVIDUAL', label: 'Apenas individuais' },
  { value: 'GROUP', label: 'Apenas grupos' },
];

export function InboxViewDialog({ open, view, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Filter');
  const [color, setColor] = useState('default');
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('any');
  const [queue, setQueue] = useState<'' | 'waiting' | 'answered'>('');
  const [kind, setKind] = useState<'' | 'INDIVIDUAL' | 'GROUP'>('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
    enabled: open,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsService.list(),
    enabled: open,
  });

  useEffect(() => {
    if (view) {
      setName(view.name);
      setIcon(view.icon ?? 'Filter');
      setColor(view.color ?? 'default');
      setChannelIds(view.filters?.channelIds ?? []);
      setStatuses(view.filters?.statuses ?? []);
      setAssignedTo(view.filters?.assignedTo ?? 'any');
      setQueue(
        view.filters?.awaitingHumanReply === true
          ? 'waiting'
          : view.filters?.awaitingHumanReply === false
            ? 'answered'
            : '',
      );
      setKind(view.filters?.kind ?? '');
      setTagIds(view.filters?.tagIds ?? []);
    } else {
      setName('');
      setIcon('Filter');
      setColor('default');
      setChannelIds([]);
      setStatuses([]);
      setAssignedTo('any');
      setQueue('');
      setKind('');
      setTagIds([]);
    }
  }, [view, open]);

  const toggleChannel = (id: string) =>
    setChannelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleStatus = (s: string) =>
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Dê um nome para a inbox');
      return;
    }
    const filters: InboxViewFilters = {};
    if (channelIds.length) filters.channelIds = channelIds;
    if (statuses.length) filters.statuses = statuses;
    if (assignedTo && assignedTo !== 'any') filters.assignedTo = assignedTo;
    if (queue) filters.awaitingHumanReply = queue === 'waiting';
    if (kind) filters.kind = kind;
    if (tagIds.length) filters.tagIds = tagIds;

    setSaving(true);
    try {
      if (view) {
        await inboxViewsService.update(view.id, { name, icon, color, filters });
        toast.success('Inbox atualizada');
      } else {
        await inboxViewsService.create({ name, icon, color, filters });
        toast.success('Inbox criada');
      }
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={view ? 'Editar inbox' : 'Nova inbox'}
      description="Uma inbox é uma lista de conversas já filtrada, salva no menu."
      size="lg"
      // Nome e filtros são montados aqui: Esc/clique fora não fecham.
      dismissible={false}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!name} loading={saving}>
            {view ? 'Salvar' : 'Criar'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="inbox-view-name" className={fieldLabelCls}>
            Nome
          </label>
          <input
            id="inbox-view-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Vendas WhatsApp"
            className={`${controlCls} mt-1.5 w-full`}
          />
        </div>

        <div>
          <p className={fieldLabelCls}>Ícone</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ICONS.map(({ name: n, Icon }) => (
              <button
                key={n}
                type="button"
                onClick={() => setIcon(n)}
                aria-pressed={icon === n}
                aria-label={`Ícone ${n}`}
                className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
                  icon === n
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                }`}
              >
                <Icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={fieldLabelCls}>Cor</p>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-pressed={color === c.name}
                aria-label={c.label}
                title={c.label}
                className={`size-8 rounded-full ${c.cls} ${
                  color === c.name
                    ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                    : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Filtros
          </p>
        </div>

        <div>
          <p className={fieldLabelCls}>
            Canais{' '}
            <span className="font-normal text-muted-foreground">
              ({channelIds.length || 'todos'})
            </span>
          </p>
          <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
            {channels.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum canal cadastrado.</p>
            )}
            {channels.map((c: any) => (
              <label
                key={c.id}
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={channelIds.includes(c.id)}
                  onChange={() => toggleChannel(c.id)}
                  className="size-4 shrink-0"
                />
                <span className="min-w-0 truncate font-medium text-foreground">{c.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {channelTypeLabel(c.type)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className={fieldLabelCls}>Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUSES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => toggleStatus(st.value)}
                aria-pressed={statuses.includes(st.value)}
                className={pillCls(statuses.includes(st.value))}
              >
                {st.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Vazio = todos os status.
          </p>
        </div>

        <div>
          <label htmlFor="inbox-view-assigned" className={fieldLabelCls}>
            Atribuição
          </label>
          <select
            id="inbox-view-assigned"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className={`${controlCls} mt-1.5 w-full`}
          >
            {ASSIGNED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="inbox-view-queue" className={fieldLabelCls}>
            Fila de atendimento
          </label>
          <select
            id="inbox-view-queue"
            value={queue}
            onChange={(e) =>
              setQueue(e.target.value as '' | 'waiting' | 'answered')
            }
            className={`${controlCls} mt-1.5 w-full`}
          >
            {QUEUE_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Mesmo sinal das abas Esperando / Caixa de entrada. Combinado com
            Atribuição = &ldquo;Não atribuída&rdquo;, dá a fila de leads
            prontos para distribuir. Conversas fechadas ficam de fora.
          </p>
        </div>

        <div>
          <p className={fieldLabelCls}>Tipo de conversa</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KIND_OPTIONS.map((o) => (
              <button
                key={o.value || 'all'}
                type="button"
                onClick={() => setKind(o.value)}
                aria-pressed={kind === o.value}
                className={pillCls(kind === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={fieldLabelCls}>
            Tags{' '}
            <span className="font-normal text-muted-foreground">
              ({tagIds.length || 'nenhuma — todas'})
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma tag cadastrada. Crie em Configurações &gt; Tags.
              </p>
            )}
            {tags.map((t: any) => {
              const active = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setTagIds((prev) =>
                      prev.includes(t.id)
                        ? prev.filter((x) => x !== t.id)
                        : [...prev, t.id],
                    )
                  }
                  className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: active ? t.color : `${t.color}1f`,
                    color: active ? '#fff' : t.color,
                    border: `1px solid ${active ? t.color : `${t.color}40`}`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: active ? '#fff' : t.color,
                    }}
                  />
                  {t.name}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            A conversa entra se tiver qualquer uma das tags marcadas (na conversa ou no contato).
          </p>
        </div>
      </div>
    </Dialog>
  );
}
