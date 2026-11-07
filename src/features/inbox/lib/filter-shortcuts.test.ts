import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, type InboxFilterState } from './inbox-filters';
import {
  MAX_SHORTCUTS,
  SHORTCUT_NAME_MAX,
  addShortcut,
  findMatchingShortcut,
  moveShortcut,
  removeShortcut,
  renameShortcut,
  sanitizeShortcuts,
  updateShortcutFilters,
  type FilterShortcut,
} from './filter-shortcuts';

const CREATED_AT = '2026-11-07T12:00:00.000Z';
const UNREAD: InboxFilterState = { ...DEFAULT_FILTERS, unreadOnly: true };

function shortcut(id: string, name: string, filters = DEFAULT_FILTERS): FilterShortcut {
  return { id, name, filters, createdAt: CREATED_AT };
}

function addOk(list: FilterShortcut[], name: string, id: string, filters = UNREAD) {
  const result = addShortcut(list, { id, name, filters, createdAt: CREATED_AT });
  if (!result.ok) throw new Error(result.error);
  return result.shortcuts;
}

describe('addShortcut', () => {
  it('adiciona no fim com o nome aparado', () => {
    // Arrange
    const list = [shortcut('a', 'Primeiro')];

    // Act
    const result = addShortcut(list, { id: 'b', name: '  Não lidas  ', filters: UNREAD, createdAt: CREATED_AT });

    // Assert
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.shortcuts.map((s) => s.name)).toEqual(['Primeiro', 'Não lidas']);
      expect(result.shortcuts[1].filters).toEqual(UNREAD);
    }
    expect(list).toHaveLength(1);
  });

  it('recusa nome vazio', () => {
    const result = addShortcut([], { id: 'a', name: '   ', filters: UNREAD, createdAt: CREATED_AT });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('nome') });
  });

  it('recusa nome longo demais', () => {
    const name = 'x'.repeat(SHORTCUT_NAME_MAX + 1);
    const result = addShortcut([], { id: 'a', name, filters: UNREAD, createdAt: CREATED_AT });
    expect(result.ok).toBe(false);
  });

  it('recusa nome repetido, ignorando maiúsculas', () => {
    const result = addShortcut([shortcut('a', 'VIP')], {
      id: 'b',
      name: 'vip',
      filters: UNREAD,
      createdAt: CREATED_AT,
    });
    expect(result).toEqual({ ok: false, error: expect.stringContaining('Já existe') });
  });

  it('recusa passar do limite', () => {
    // Arrange
    const full = Array.from({ length: MAX_SHORTCUTS }, (_, i) => shortcut(`s${i}`, `Atalho ${i}`));

    // Act
    const result = addShortcut(full, { id: 'x', name: 'Mais um', filters: UNREAD, createdAt: CREATED_AT });

    // Assert
    expect(result).toEqual({ ok: false, error: expect.stringContaining(String(MAX_SHORTCUTS)) });
  });
});

describe('renameShortcut', () => {
  it('troca o nome sem mexer no resto', () => {
    const list = [shortcut('a', 'Velho'), shortcut('b', 'Outro')];
    const result = renameShortcut(list, 'a', 'Novo');
    expect(result.ok && result.shortcuts.map((s) => s.name)).toEqual(['Novo', 'Outro']);
    expect(list[0].name).toBe('Velho');
  });

  it('aceita manter o próprio nome', () => {
    expect(renameShortcut([shortcut('a', 'VIP')], 'a', 'VIP').ok).toBe(true);
  });

  it('recusa nome de outro atalho', () => {
    const list = [shortcut('a', 'VIP'), shortcut('b', 'Outro')];
    expect(renameShortcut(list, 'b', 'VIP').ok).toBe(false);
  });
});

describe('removeShortcut, moveShortcut e updateShortcutFilters', () => {
  const list = [shortcut('a', 'A'), shortcut('b', 'B'), shortcut('c', 'C')];

  it('remove pelo id', () => {
    expect(removeShortcut(list, 'b').map((s) => s.id)).toEqual(['a', 'c']);
    expect(list).toHaveLength(3);
  });

  it('move para a esquerda e para a direita', () => {
    expect(moveShortcut(list, 'b', -1).map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(moveShortcut(list, 'b', 1).map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('não move além das pontas', () => {
    expect(moveShortcut(list, 'a', -1)).toEqual(list);
    expect(moveShortcut(list, 'c', 1)).toEqual(list);
  });

  it('atualiza os filtros de um atalho', () => {
    const next = updateShortcutFilters(list, 'c', UNREAD);
    expect(next[2].filters).toEqual(UNREAD);
    expect(list[2].filters).toEqual(DEFAULT_FILTERS);
  });
});

describe('sanitizeShortcuts', () => {
  it('devolve lista vazia para lixo', () => {
    expect(sanitizeShortcuts(null)).toEqual([]);
    expect(sanitizeShortcuts('x')).toEqual([]);
    expect(sanitizeShortcuts({})).toEqual([]);
  });

  it('descarta itens inválidos, ids e nomes repetidos e corta no limite', () => {
    // Arrange
    const raw = [
      { id: 'a', name: 'VIP', filters: { unreadOnly: true }, createdAt: CREATED_AT },
      { id: 'a', name: 'Duplicado', filters: {} },
      { id: 'b', name: 'vip', filters: {} },
      { id: 'c', name: '', filters: {} },
      { id: 5, name: 'Sem id' },
      'texto',
      ...Array.from({ length: MAX_SHORTCUTS + 3 }, (_, i) => ({ id: `n${i}`, name: `N${i}`, filters: {} })),
    ];

    // Act
    const list = sanitizeShortcuts(raw);

    // Assert
    expect(list[0]).toEqual({
      id: 'a',
      name: 'VIP',
      filters: { ...DEFAULT_FILTERS, unreadOnly: true },
      createdAt: CREATED_AT,
    });
    expect(list.map((s) => s.id)).not.toContain('b');
    expect(list).toHaveLength(MAX_SHORTCUTS);
  });
});

describe('findMatchingShortcut', () => {
  it('acha o atalho com os mesmos filtros', () => {
    // Arrange
    const list = addOk([], 'Não lidas', 'a');

    // Act
    const match = findMatchingShortcut(list, { ...DEFAULT_FILTERS, unreadOnly: true });

    // Assert
    expect(match?.id).toBe('a');
  });

  it('não acha nada quando os filtros diferem', () => {
    const list = addOk([], 'Não lidas', 'a');
    expect(findMatchingShortcut(list, DEFAULT_FILTERS)).toBeUndefined();
  });
});
