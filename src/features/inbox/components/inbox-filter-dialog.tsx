'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import type { Segment } from '@/features/segments/services/segments.service';
import type { Tag } from '@/features/settings/services/tags.service';
import type { Channel } from '@/features/channels/services/channels.service';
import type { Member } from '@/features/settings/services/members.service';
import type { Pipeline } from '@/features/pipelines/services/pipelines.service';
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  type InboxFilterState,
} from '../lib/inbox-filters';
import { findMatchingShortcut, type FilterShortcut } from '../lib/filter-shortcuts';
import { InboxFilterPanel } from './inbox-filter-panel';
import { FilterPanelFooter } from './filters/filter-panel-footer';

interface InboxFilterDialogProps {
  open: boolean;
  onClose: () => void;
  /** Filtros que estão valendo agora — ponto de partida do rascunho. */
  value: InboxFilterState;
  onApply: (next: InboxFilterState) => void;
  shortcuts: readonly FilterShortcut[];
  /** Salva `filters` como atalho; devolve true quando deu certo. */
  onSaveShortcut: (name: string, filters: InboxFilterState) => boolean;
  /** Dentro de uma visão salva: sem Setor/Canal e sem atalhos. */
  inView: boolean;
  disableAtendente: boolean;
  segments: readonly Segment[];
  tags: readonly Tag[];
  channels: readonly Channel[];
  members: readonly Member[];
  pipelines: readonly Pipeline[];
}

/**
 * Filtros num modal: a pessoa monta tudo num rascunho e só ao clicar em
 * Aplicar a lista muda. Fechar (X, Esc, clique fora, Cancelar) descarta.
 */
export function InboxFilterDialog(props: InboxFilterDialogProps) {
  const { open, onClose } = props;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Filtros"
      description="Monte o filtro e clique em Aplicar."
      size="xl"
      bodyClassName="flex flex-col p-0"
    >
      {/* O Dialog desmonta o conteúdo ao fechar: cada abertura começa um
          rascunho novo a partir dos filtros que estão valendo. */}
      <FilterDialogBody {...props} />
    </Dialog>
  );
}

function saveHintFor(inView: boolean, draft: InboxFilterState, matching?: FilterShortcut) {
  if (inView) return 'Atalhos ficam na inbox principal';
  if (matching) return `Já salvo como "${matching.name}"`;
  if (countActiveFilters(draft) === 0) return 'Escolha um filtro antes de salvar';
  return undefined;
}

function FilterDialogBody({
  value,
  onApply,
  onClose,
  shortcuts,
  onSaveShortcut,
  inView,
  disableAtendente,
  ...sources
}: InboxFilterDialogProps) {
  const [draft, setDraft] = useState<InboxFilterState>(value);
  const activeCount = countActiveFilters(draft);
  const matching = findMatchingShortcut(shortcuts, draft);
  const saveHint = saveHintFor(inView, draft, matching);

  const apply = () => {
    onApply(draft);
    onClose();
  };
  const saveShortcut = (name: string) => {
    if (!onSaveShortcut(name, draft)) return false;
    // Salvou: aplica o mesmo filtro, assim o atalho já aparece marcado.
    apply();
    return true;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        <InboxFilterPanel
          value={draft}
          onChange={setDraft}
          hideChannelSegment={inView}
          disableAtendente={disableAtendente}
          {...sources}
        />
      </div>
      <FilterPanelFooter
        onClear={() => setDraft(DEFAULT_FILTERS)}
        canSaveShortcut={!saveHint}
        saveHint={saveHint}
        onSaveShortcut={saveShortcut}
        onCancel={onClose}
        onApply={apply}
        activeCount={activeCount}
      />
    </div>
  );
}
