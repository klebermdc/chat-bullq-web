import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from './inbox-filters';
import { MAX_SHORTCUTS, type FilterShortcut } from './filter-shortcuts';
import { buildPresetShortcuts, repairPresetShortcuts } from './preset-shortcuts';

const NOW = '2026-11-08T12:00:00.000Z';
let seq = 0;
const makeId = () => `id-${++seq}`;
const members = [
  { id: 'u2', name: 'Renata', isActive: true },
  { id: 'u1', name: 'Bárbara', isActive: true },
  { id: 'u3', name: 'Antigo', isActive: false },
];

describe('buildPresetShortcuts', () => {
  it('monta Com a IA, Na fila e um atendimento por membro ativo, em ordem alfabética', () => {
    // Act
    const out = buildPresetShortcuts([], members, makeId, NOW);

    // Assert
    expect(out.map((s) => s.name)).toEqual([
      'Com a IA',
      'Na fila',
      'Atendimento Bárbara',
      'Atendimento Renata',
    ]);
    expect(out[0].filters).toEqual({ ...DEFAULT_FILTERS, leadPhases: ['sdr'] });
    expect(out[1].filters).toEqual({ ...DEFAULT_FILTERS, leadPhases: ['queue'] });
    expect(out[2].filters).toEqual({ ...DEFAULT_FILTERS, assignees: ['u1'] });
  });

  it('não repete atalho com o mesmo nome ou o mesmo filtro que a pessoa já tem', () => {
    // Arrange
    const existing: FilterShortcut[] = [
      { id: 'a', name: 'na fila', filters: DEFAULT_FILTERS, createdAt: NOW },
      { id: 'b', name: 'Renata', filters: { ...DEFAULT_FILTERS, assignees: ['u2'] }, createdAt: NOW },
    ];

    // Act
    const out = buildPresetShortcuts(existing, members, makeId, NOW);

    // Assert
    expect(out.map((s) => s.name)).toEqual(['Com a IA', 'Atendimento Bárbara']);
  });

  it('para no limite de atalhos', () => {
    // Arrange
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, name: `Pessoa ${i}`, isActive: true }));

    // Act
    const out = buildPresetShortcuts([], many, makeId, NOW);

    // Assert
    expect(out).toHaveLength(MAX_SHORTCUTS);
  });
});

describe('repairPresetShortcuts', () => {
  it('devolve o filtro a "Na fila" e "Com a IA" que ficaram vazios', () => {
    // Arrange
    const list: FilterShortcut[] = [
      { id: 'q', name: 'Na fila', filters: DEFAULT_FILTERS, createdAt: NOW },
      { id: 's', name: 'com a ia', filters: DEFAULT_FILTERS, createdAt: NOW },
      { id: 'r', name: 'Atendimento Renata', filters: DEFAULT_FILTERS, createdAt: NOW },
    ];

    // Act
    const out = repairPresetShortcuts(list, members);

    // Assert
    expect(out[0].filters.leadPhases).toEqual(['queue']);
    expect(out[1].filters.leadPhases).toEqual(['sdr']);
    expect(out[2].filters.assignees).toEqual(['u2']);
    expect(out.map((s) => s.id)).toEqual(['q', 's', 'r']);
  });

  it('devolve a MESMA lista quando nada precisa de conserto', () => {
    const list = buildPresetShortcuts([], members, makeId, NOW);
    expect(repairPresetShortcuts(list, members)).toBe(list);
  });

  it('não mexe em atalho vazio com nome que não é de preset', () => {
    const list: FilterShortcut[] = [{ id: 'x', name: 'Meu', filters: DEFAULT_FILTERS, createdAt: NOW }];
    expect(repairPresetShortcuts(list, members)).toBe(list);
  });
});
