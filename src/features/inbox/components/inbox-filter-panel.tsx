'use client';

import type { Segment } from '@/features/segments/services/segments.service';
import type { Tag } from '@/features/settings/services/tags.service';
import type { Channel } from '@/features/channels/services/channels.service';
import type { Member } from '@/features/settings/services/members.service';
import type { Pipeline } from '@/features/pipelines/services/pipelines.service';
import { DEFAULT_FILTERS, type InboxFilterState } from '../lib/inbox-filters';
import { ChannelFilterSection } from './filters/channel-filter-section';
import { AssigneeFilterSection } from './filters/assignee-filter-section';
import {
  IdleFilterSection,
  LostFilterSection,
  OriginFilterSection,
  StatusFilterSection,
} from './filters/quick-filter-sections';
import { StageFilterSection } from './filters/stage-filter-section';
import { TagFilterSection } from './filters/tag-filter-section';
import {
  DateFilterSection,
  KindToggleSection,
  ProjectFilterSection,
} from './filters/date-project-sections';
import { FilterPanelFooter } from './filters/filter-panel-footer';
import type { FilterPatch } from './filters/filter-ui';

interface InboxFilterPanelProps {
  value: InboxFilterState;
  onChange: (next: InboxFilterState) => void;

  /** When true, hide Setor/Canal selectors (a saved view already pins them). */
  hideChannelSegment?: boolean;
  /** When true, disable the Atendente rows (AGENT role — server enforces RN-05). */
  disableAtendente?: boolean;

  // Data sources
  segments: readonly Segment[];
  tags: readonly Tag[];
  channels: readonly Channel[];
  members: readonly Member[];
  pipelines: readonly Pipeline[];

  /** Há filtro ativo e ele ainda não é um atalho salvo. */
  canSaveShortcut: boolean;
  saveShortcutHint?: string;
  /** Devolve true quando salvou (fecha o campo de nome). */
  onSaveShortcut: (name: string) => boolean;
}

/** Painel de filtros da inbox — controlado: recebe o estado e devolve um novo. */
export function InboxFilterPanel({
  value,
  onChange,
  hideChannelSegment,
  disableAtendente,
  segments,
  tags,
  channels,
  members,
  pipelines,
  canSaveShortcut,
  saveShortcutHint,
  onSaveShortcut,
}: InboxFilterPanelProps) {
  const onPatch: FilterPatch = (patch) => onChange({ ...value, ...patch });
  const section = { value, onPatch };

  return (
    <div className="max-h-[min(75vh,36rem)] overflow-y-auto scrollbar-thin">
      {!hideChannelSegment && (
        <ChannelFilterSection {...section} segments={segments} channels={channels} />
      )}
      <AssigneeFilterSection {...section} members={members} disabled={disableAtendente} />
      <StatusFilterSection {...section} />
      <StageFilterSection {...section} pipelines={pipelines} />
      <TagFilterSection value={value} onChange={onChange} tags={tags} />
      <LostFilterSection {...section} />
      <OriginFilterSection {...section} />
      <IdleFilterSection {...section} />
      <DateFilterSection {...section} />
      <ProjectFilterSection {...section} />
      <KindToggleSection {...section} />
      <FilterPanelFooter
        onClear={() => onChange(DEFAULT_FILTERS)}
        canSaveShortcut={canSaveShortcut}
        saveHint={saveShortcutHint}
        onSaveShortcut={onSaveShortcut}
      />
    </div>
  );
}
