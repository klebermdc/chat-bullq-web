import { DEFAULT_FILTERS, sameFilters, type InboxFilterState } from './inbox-filters';
import { MAX_SHORTCUTS, SHORTCUT_NAME_MAX, type FilterShortcut } from './filter-shortcuts';

/**
 * Atalhos prontos para ADM/Owner (no estilo dos "Meus filtros" do Umbler):
 * Com a IA, Na fila e um "Atendimento <nome>" por atendente ativo. Viram
 * atalhos pessoais normais — dá para renomear, mover e excluir.
 */
interface PresetMember {
  id: string;
  name: string;
  isActive: boolean;
}

const normalize = (name: string) => name.trim().toLocaleLowerCase('pt-BR');

function candidates(members: readonly PresetMember[]): { name: string; filters: InboxFilterState }[] {
  const attendants = members
    .filter((m) => m.isActive && m.name.trim())
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((m) => ({
      name: `Atendimento ${m.name.trim()}`.slice(0, SHORTCUT_NAME_MAX),
      filters: { ...DEFAULT_FILTERS, assignees: [m.id] },
    }));
  return [
    { name: 'Com a IA', filters: { ...DEFAULT_FILTERS, leadPhases: ['sdr'] } },
    { name: 'Na fila', filters: { ...DEFAULT_FILTERS, leadPhases: ['queue'] } },
    ...attendants,
  ];
}

/** Atalhos a ACRESCENTAR à lista atual (sem repetir nome nem filtro). */
export function buildPresetShortcuts(
  existing: readonly FilterShortcut[],
  members: readonly PresetMember[],
  makeId: () => string,
  createdAt: string,
): FilterShortcut[] {
  return candidates(members).reduce<FilterShortcut[]>((acc, c) => {
    const all = [...existing, ...acc];
    if (all.length >= MAX_SHORTCUTS) return acc;
    const taken = all.some(
      (s) => normalize(s.name) === normalize(c.name) || sameFilters(s.filters, c.filters),
    );
    return taken ? acc : [...acc, { id: makeId(), name: c.name, filters: c.filters, createdAt }];
  }, []);
}
