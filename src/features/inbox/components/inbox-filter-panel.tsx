'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  X,
  Check,
  MailOpen,
  Archive,
  Users,
  User,
  FolderKanban,
} from 'lucide-react';
import type { Segment } from '@/features/segments/services/segments.service';
import type { Tag } from '@/features/settings/services/tags.service';
import type { Channel } from '@/features/channels/services/channels.service';
import type { Member } from '@/features/settings/services/members.service';
import { PROJECT_STATUSES } from '@/features/projects/project-fields';
import { controlSmCls } from '@/components/ui/control';

/** Sentinel value for the "Atribuídas a mim" option in the Atendente select. */
export const ASSIGNED_TO_ME = '__ME__';

/** Presets do filtro de Data. */
export type DateRangePreset = 'ALL' | 'TODAY' | '7D' | '30D' | 'RANGE';

const CONVERSATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Status: todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'WAITING', label: 'Aguardando' },
  { value: 'CLOSED', label: 'Fechado' },
];

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'TODAY', label: 'Hoje' },
  { value: '7D', label: '7 dias' },
  { value: '30D', label: '30 dias' },
  { value: 'RANGE', label: 'Intervalo' },
];

const labelCls =
  'block px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
interface InboxFilterPanelProps {
  /** When true, hide Setor/Canal selectors (a saved view already pins them). */
  hideChannelSegment?: boolean;
  /** When true, disable the Atendente row (AGENT role — server enforces RN-05). */
  disableAtendente?: boolean;

  // Data sources
  segments: Segment[];
  tags: Tag[];
  channels: Channel[];
  members: Member[];

  // Setor (Segmento) — mutually exclusive with Canal
  selectedSegmentId: string | null;
  onSegmentChange: (id: string | null) => void;

  // Canal
  selectedChannelId: string | null;
  onChannelChange: (id: string | null) => void;

  // Etiqueta (tags)
  selectedTagIds: string[];
  onToggleTag: (id: string) => void;
  onClearTags: () => void;

  // Atendente — value is a userId, ASSIGNED_TO_ME, or '' (todos)
  selectedAssignedToId: string | null;
  onAssignedToChange: (value: string | null) => void;

  // Data
  dateRange: DateRangePreset;
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (preset: DateRangePreset) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;

  // Status (conversation)
  selectedStatus: string;
  onStatusChange: (value: string) => void;

  // Projeto (mantido do filtro antigo)
  selectedProjectStatus: string;
  onProjectStatusChange: (value: string) => void;
  mineProjects: boolean;
  onToggleMineProjects: () => void;

  // Toggles — Individual e Grupo são INDEPENDENTES (nenhum = mostra tudo)
  individualOnly: boolean;
  onToggleIndividual: () => void;
  groupsOnly: boolean;
  onToggleGroups: () => void;
  unreadOnly: boolean;
  onToggleUnread: () => void;
  archivedOnly: boolean;
  onToggleArchived: () => void;

  onClearAll: () => void;
}

function ToggleRow({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${focusRing} ${
        active
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      <div
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input'
        }`}
      >
        {active && <Check className="h-2.5 w-2.5" />}
      </div>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 leading-tight">
        <span className="block">{label}</span>
        {description && (
          <span className="block text-[11px] font-normal text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function InboxFilterPanel(props: InboxFilterPanelProps) {
  const {
    hideChannelSegment,
    disableAtendente,
    segments,
    tags,
    channels,
    members,
    selectedSegmentId,
    onSegmentChange,
    selectedChannelId,
    onChannelChange,
    selectedTagIds,
    onToggleTag,
    onClearTags,
    selectedAssignedToId,
    onAssignedToChange,
    dateRange,
    dateFrom,
    dateTo,
    onDateRangeChange,
    onDateFromChange,
    onDateToChange,
    selectedStatus,
    onStatusChange,
    selectedProjectStatus,
    onProjectStatusChange,
    mineProjects,
    onToggleMineProjects,
    individualOnly,
    onToggleIndividual,
    groupsOnly,
    onToggleGroups,
    unreadOnly,
    onToggleUnread,
    archivedOnly,
    onToggleArchived,
    onClearAll,
  } = props;

  const [tagSearch, setTagSearch] = useState('');

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagSearch]);

  const activeMembers = useMemo(
    () => members.filter((m) => m.user.isActive),
    [members],
  );

  const section = 'px-1.5 py-1';

  return (
    <div className="max-h-[min(70vh,32rem)] overflow-y-auto scrollbar-thin">
      {/* ─── Setor (Segmento) ─── */}
      {!hideChannelSegment && (
        <div className={section}>
          <label htmlFor="inbox-filter-segment" className={labelCls}>Setor</label>
          <select
            id="inbox-filter-segment"
            value={selectedSegmentId ?? ''}
            onChange={(e) => onSegmentChange(e.target.value || null)}
            className={`${controlSmCls} w-full`}
          >
            <option value="">Todos os setores</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ─── Canal ─── */}
      {!hideChannelSegment && (
        <div className={section}>
          <label htmlFor="inbox-filter-channel" className={labelCls}>Canal</label>
          <select
            id="inbox-filter-channel"
            value={selectedChannelId ?? ''}
            onChange={(e) => onChannelChange(e.target.value || null)}
            className={`${controlSmCls} w-full`}
          >
            <option value="">Todos os canais</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ─── Atendente ─── */}
      <div className={section}>
        <label htmlFor="inbox-filter-assignee" className={labelCls}>Atendente</label>
        <select
          id="inbox-filter-assignee"
          value={selectedAssignedToId ?? ''}
          onChange={(e) => onAssignedToChange(e.target.value || null)}
          disabled={disableAtendente}
          className={`${controlSmCls} w-full`}
        >
          <option value="">Todos</option>
          <option value={ASSIGNED_TO_ME}>Atribuídas a mim</option>
          {activeMembers.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Status ─── */}
      <div className={section}>
        <label htmlFor="inbox-filter-status" className={labelCls}>Status</label>
        <select
          id="inbox-filter-status"
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`${controlSmCls} w-full`}
        >
          {CONVERSATION_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Data ─── */}
      <div className={section}>
        <p id="inbox-filter-date" className={labelCls}>Data</p>
        <div role="group" aria-labelledby="inbox-filter-date" className="flex flex-wrap gap-1">
          {DATE_RANGE_OPTIONS.map((o) => {
            const active = dateRange === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => onDateRangeChange(o.value)}
                className={`flex h-6 items-center rounded-md px-2 text-[11px] font-medium transition-colors ${focusRing} ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-foreground/10'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {dateRange === 'RANGE' && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              type="date"
              aria-label="Data inicial"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className={`${controlSmCls} min-w-0 flex-1`}
            />
            <span className="text-[11px] text-muted-foreground">até</span>
            <input
              type="date"
              aria-label="Data final"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className={`${controlSmCls} min-w-0 flex-1`}
            />
          </div>
        )}
      </div>

      {/* ─── Projeto ─── */}
      <div className={`${section} border-t border-border`}>
        <label htmlFor="inbox-filter-project" className={labelCls}>Projeto</label>
        <select
          id="inbox-filter-project"
          value={selectedProjectStatus}
          onChange={(e) => onProjectStatusChange(e.target.value)}
          className={`${controlSmCls} w-full`}
        >
          <option value="">Status: todos</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="mt-1">
          <ToggleRow
            active={mineProjects}
            onClick={onToggleMineProjects}
            icon={FolderKanban}
            label="Meus projetos"
          />
        </div>
      </div>

      {/* ─── Etiqueta (Tags) ─── */}
      {tags.length > 0 && (
        <div className={`${section} border-t border-border`}>
          <div className="flex items-center justify-between px-1 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Etiqueta
            </p>
            {selectedTagIds.length > 0 && (
              <button
                type="button"
                onClick={onClearTags}
                aria-label="Limpar etiquetas selecionadas"
                className={`flex h-6 items-center rounded px-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
              >
                Limpar
              </button>
            )}
          </div>
          <div className="pb-1">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar tag…"
                aria-label="Buscar tag"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && tagSearch) {
                    e.stopPropagation();
                    setTagSearch('');
                  }
                }}
                className={`${controlSmCls} w-full pl-7 pr-8`}
              />
              {tagSearch && (
                <button
                  type="button"
                  onClick={() => setTagSearch('')}
                  aria-label="Limpar busca de tag"
                  title="Limpar busca"
                  className={`absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-md scrollbar-thin">
            {filteredTags.length === 0 ? (
              <p className="px-2.5 py-2 text-center text-[11px] text-muted-foreground">
                Nenhuma tag encontrada
              </p>
            ) : (
              filteredTags.map((tag) => {
                const isActive = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isActive}
                    onClick={() => onToggleTag(tag.id)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${focusRing} ${
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      }`}
                    >
                      {isActive && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Toggles ─── */}
      <div className={`${section} border-t border-border`}>
        <ToggleRow
          active={individualOnly}
          onClick={onToggleIndividual}
          icon={User}
          label="Individual"
          description="Conversas individuais"
        />
        <ToggleRow
          active={groupsOnly}
          onClick={onToggleGroups}
          icon={Users}
          label="Grupo"
          description="Apenas conversas de grupos"
        />
        <ToggleRow
          active={unreadOnly}
          onClick={onToggleUnread}
          icon={MailOpen}
          label="Não lidas"
          description="Apenas com mensagens novas"
        />
        <ToggleRow
          active={archivedOnly}
          onClick={onToggleArchived}
          icon={Archive}
          label="Arquivadas"
          description="Mostra a inbox arquivada"
        />
      </div>

      {/* ─── Rodapé fixo: sempre à vista, e a sombra para cima avisa que há
          mais conteúdo rolando por baixo dele. ─── */}
      <div className="sticky bottom-0 border-t border-border bg-popover px-1.5 py-1.5 shadow-[0_-8px_12px_-10px_rgb(0_0_0/0.35)]">
        <button
          type="button"
          onClick={onClearAll}
          className={`flex h-8 w-full items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
        >
          <X aria-hidden="true" className="h-3 w-3" />
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
