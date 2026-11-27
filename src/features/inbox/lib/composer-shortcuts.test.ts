import { describe, expect, it } from 'vitest';
import {
  COMPOSER_SHORTCUT_LIMIT,
  SHORTCUT_LABEL_MAX,
  addComposerShortcut,
  removeComposerShortcut,
  sanitizeComposerShortcuts,
  updateComposerShortcut,
  validateShortcutDraft,
  type ComposerShortcut,
} from './composer-shortcuts';

const pix: ComposerShortcut = { id: 'a', label: 'Pix', icon: 'credit-card', text: 'Chave Pix: 123' };

describe('sanitizeComposerShortcuts', () => {
  it('returns empty list when preference is missing or not an array', () => {
    expect(sanitizeComposerShortcuts(undefined)).toEqual([]);
    expect(sanitizeComposerShortcuts({ id: 'a' })).toEqual([]);
  });

  it('drops malformed items and duplicated ids', () => {
    const raw = [pix, { ...pix }, { id: 'b', label: '', icon: 'star', text: 'x' }, 42, null];
    expect(sanitizeComposerShortcuts(raw)).toEqual([pix]);
  });

  it('falls back to the default icon when the saved one is unknown', () => {
    const [item] = sanitizeComposerShortcuts([{ ...pix, icon: 'rocket' }]);
    expect(item.icon).toBe('message');
  });

  it('caps the list at the limit', () => {
    const many = Array.from({ length: COMPOSER_SHORTCUT_LIMIT + 3 }, (_, i) => ({ ...pix, id: `id${i}` }));
    expect(sanitizeComposerShortcuts(many)).toHaveLength(COMPOSER_SHORTCUT_LIMIT);
  });
});

describe('validateShortcutDraft', () => {
  it('requires a name and a text', () => {
    expect(validateShortcutDraft({ label: ' ', icon: 'star', text: 'x' })).toMatch(/nome/i);
    expect(validateShortcutDraft({ label: 'Pix', icon: 'star', text: '  ' })).toMatch(/texto/i);
  });

  it('rejects names longer than the max', () => {
    const label = 'x'.repeat(SHORTCUT_LABEL_MAX + 1);
    expect(validateShortcutDraft({ label, icon: 'star', text: 'ok' })).toMatch(/nome/i);
  });

  it('accepts a valid draft', () => {
    expect(validateShortcutDraft({ label: 'Pix', icon: 'star', text: 'ok' })).toBeNull();
  });
});

describe('addComposerShortcut', () => {
  it('appends a trimmed shortcut without mutating the original list', () => {
    const list = [pix];
    const result = addComposerShortcut(list, { label: ' Hotel ', icon: 'hotel', text: ' Segue o hotel ' }, 'b');
    expect(result).toEqual({
      ok: true,
      shortcuts: [pix, { id: 'b', label: 'Hotel', icon: 'hotel', text: 'Segue o hotel' }],
    });
    expect(list).toEqual([pix]);
  });

  it('refuses when the limit is reached', () => {
    const full = Array.from({ length: COMPOSER_SHORTCUT_LIMIT }, (_, i) => ({ ...pix, id: `id${i}` }));
    const result = addComposerShortcut(full, { label: 'Novo', icon: 'star', text: 'x' }, 'z');
    expect(result.ok).toBe(false);
  });

  it('refuses an invalid draft', () => {
    const result = addComposerShortcut([], { label: '', icon: 'star', text: 'x' }, 'z');
    expect(result.ok).toBe(false);
  });
});

describe('updateComposerShortcut / removeComposerShortcut', () => {
  it('updates only the matching shortcut', () => {
    const other: ComposerShortcut = { ...pix, id: 'b', label: 'Outro' };
    const result = updateComposerShortcut([pix, other], 'a', { label: 'Pix novo', icon: 'gift', text: 'Nova chave' });
    expect(result).toEqual({
      ok: true,
      shortcuts: [{ id: 'a', label: 'Pix novo', icon: 'gift', text: 'Nova chave' }, other],
    });
  });

  it('removes by id', () => {
    expect(removeComposerShortcut([pix], 'a')).toEqual([]);
  });
});
