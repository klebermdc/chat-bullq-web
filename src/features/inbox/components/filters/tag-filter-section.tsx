'use client';

import { useMemo, useState } from 'react';
import { Ban, Check, Search, X } from 'lucide-react';
import type { Tag } from '@/features/settings/services/tags.service';
import {
  cycleTag,
  tagFilterState,
  type InboxFilterState,
  type TagFilterMode,
  type TagMatch,
} from '../../lib/inbox-filters';
import {
  ClearButton,
  FilterSection,
  PillGroup,
  filterControlCls,
  focusRing,
  scrollListCls,
  type PillOption,
} from './filter-ui';

const MATCH_OPTIONS: PillOption<TagMatch>[] = [
  { value: 'any', label: 'Qualquer uma' },
  { value: 'all', label: 'Todas' },
];

const MODE_TEXT: Record<TagFilterMode, { state: string; next: string }> = {
  none: { state: 'sem filtro', next: 'incluir' },
  include: { state: 'incluída', next: 'excluir' },
  exclude: { state: 'excluída', next: 'tirar do filtro' },
};

const MODE_TONE: Record<TagFilterMode, string> = {
  none: 'text-foreground hover:bg-muted',
  include: 'bg-primary/10 font-semibold text-primary',
  exclude: 'bg-urgent-wash font-semibold text-urgent-ink',
};

const BOX_TONE: Record<TagFilterMode, string> = {
  none: 'border-input',
  include: 'border-primary bg-primary text-primary-foreground',
  exclude: 'border-urgent-ink text-urgent-ink',
};

function TagRow({ tag, mode, onClick }: { tag: Tag; mode: TagFilterMode; onClick: () => void }) {
  const text = MODE_TEXT[mode];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${tag.name}: ${text.state}. Clique para ${text.next}.`}
      title={`Clique para ${text.next}`}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors ${focusRing} ${MODE_TONE[mode]}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${BOX_TONE[mode]}`}
      >
        {mode === 'include' && <Check className="h-3 w-3" />}
        {mode === 'exclude' && <Ban className="h-3 w-3" />}
      </span>
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      <span className={`flex-1 truncate ${mode === 'exclude' ? 'line-through' : ''}`}>{tag.name}</span>
      {mode === 'exclude' && <span className="shrink-0 text-xs">sem</span>}
    </button>
  );
}

function TagSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative pb-1.5">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar etiqueta…"
        aria-label="Buscar etiqueta"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onChange('');
          }
        }}
        className={`${filterControlCls} w-full pl-9 pr-10`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca de etiqueta"
          className={`absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-primary ${focusRing}`}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Etiquetas: cada linha gira entre sem filtro → incluir → excluir. */
export function TagFilterSection({
  value,
  onChange,
  tags,
}: {
  value: InboxFilterState;
  onChange: (next: InboxFilterState) => void;
  tags: readonly Tag[];
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  }, [tags, query]);
  if (tags.length === 0) return null;
  const hasAny = value.tagIds.length + value.excludeTagIds.length > 0;

  return (
    <FilterSection
      id="inbox-filter-tags"
      title="Etiquetas"
      bordered
      action={
        hasAny && (
          <ClearButton
            label="Limpar etiquetas selecionadas"
            onClick={() => onChange({ ...value, tagIds: [], excludeTagIds: [], tagMatch: 'any' })}
          />
        )
      }
    >
      <p className="px-1 pb-1.5 text-xs text-muted-foreground">Toque uma vez para incluir, de novo para excluir.</p>
      {value.tagIds.length >= 2 && (
        <div className="flex items-center gap-2 px-1 pb-1.5">
          <span id="inbox-filter-tag-match" className="text-xs text-muted-foreground">Ter</span>
          <PillGroup
            labelledBy="inbox-filter-tag-match"
            options={MATCH_OPTIONS}
            isActive={(m) => value.tagMatch === m}
            onSelect={(tagMatch) => onChange({ ...value, tagMatch })}
          />
        </div>
      )}
      <TagSearch value={query} onChange={setQuery} />
      <div className={scrollListCls}>
        {filtered.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">Nenhuma etiqueta encontrada</p>
        ) : (
          filtered.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              mode={tagFilterState(value, tag.id)}
              onClick={() => onChange(cycleTag(value, tag.id))}
            />
          ))
        )}
      </div>
    </FilterSection>
  );
}
