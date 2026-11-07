'use client';

import type { Segment } from '@/features/segments/services/segments.service';
import type { Tag } from '@/features/settings/services/tags.service';
import type { Channel } from '@/features/channels/services/channels.service';
import type { Member } from '@/features/settings/services/members.service';
import type { Pipeline } from '@/features/pipelines/services/pipelines.service';
import type { ReactNode } from 'react';
import type { InboxFilterState } from '../lib/inbox-filters';
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

}

/** Seções do filtro da inbox — controlado: recebe o estado e devolve um novo. */
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
}: InboxFilterPanelProps) {
  const onPatch: FilterPatch = (patch) => onChange({ ...value, ...patch });
  const section = { value, onPatch };

  return (
    // Duas colunas no computador (menos rolagem), uma no celular. Cada seção
    // inteira fica numa coluna só.
    <div className="sm:columns-2 sm:gap-6">
      {!hideChannelSegment && (
        <Keep><ChannelFilterSection {...section} segments={segments} channels={channels} /></Keep>
      )}
      <Keep><AssigneeFilterSection {...section} members={members} disabled={disableAtendente} /></Keep>
      <Keep><StatusFilterSection {...section} /></Keep>
      <Keep><StageFilterSection {...section} pipelines={pipelines} /></Keep>
      <Keep><TagFilterSection value={value} onChange={onChange} tags={tags} /></Keep>
      <Keep><LostFilterSection {...section} /></Keep>
      <Keep><OriginFilterSection {...section} /></Keep>
      <Keep><IdleFilterSection {...section} /></Keep>
      <Keep><DateFilterSection {...section} /></Keep>
      <Keep><ProjectFilterSection {...section} /></Keep>
      <Keep><KindToggleSection {...section} /></Keep>
    </div>
  );
}

/** Não deixa a seção quebrar entre as duas colunas. */
function Keep({ children }: { children: ReactNode }) {
  return <div className="break-inside-avoid">{children}</div>;
}
