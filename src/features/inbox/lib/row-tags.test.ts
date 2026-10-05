import { describe, expect, test } from 'vitest';
import { rowTagsFor } from './row-tags';

const tag = (id: string, name: string, color = '#111111') => ({ tag: { id, name, color } });

describe('rowTagsFor', () => {
  test('lists conversation tags then contact tags while the lead has no attendant', () => {
    // Arrange
    const conv = {
      assignedTo: null,
      tags: [tag('t1', 'Anúncio Meta')],
      contact: { tags: [tag('t2', 'VIP')] },
    };

    // Act
    const rows = rowTagsFor(conv);

    // Assert
    expect(rows).toEqual([
      { tag: conv.tags[0].tag, onContact: false },
      { tag: conv.contact.tags[0].tag, onContact: true },
    ]);
  });

  test('keeps only the attendant tag once the lead is distributed', () => {
    const conv = {
      assignedTo: { id: 'u1', name: 'Marina Tavares' },
      tags: [tag('t1', 'Anúncio Meta'), tag('t9', 'Marina Tavares', '#ff0000')],
      contact: { tags: [tag('t2', 'VIP'), tag('t9', 'Marina Tavares', '#ff0000')] },
    };

    const rows = rowTagsFor(conv);

    expect(rows).toEqual([{ tag: conv.tags[1].tag, onContact: false }]);
  });

  test('matches the attendant tag ignoring case and surrounding spaces', () => {
    const conv = {
      assignedTo: { id: 'u1', name: ' Marina Tavares ' },
      tags: [],
      contact: { tags: [tag('t9', 'marina tavares')] },
    };

    const rows = rowTagsFor(conv);

    expect(rows).toEqual([{ tag: conv.contact.tags[0].tag, onContact: false }]);
  });

  test('falls back to a chip with the attendant name when the tag is missing', () => {
    const conv = {
      assignedTo: { id: 'u1', name: 'Marina Tavares' },
      tags: [tag('t1', 'Anúncio Meta')],
      contact: { tags: [] },
    };

    const rows = rowTagsFor(conv);

    expect(rows).toEqual([
      { tag: { id: 'attendant-u1', name: 'Marina Tavares', color: null }, onContact: false },
    ]);
  });

  test('shows no tag when the attendant has no name and no matching tag', () => {
    const conv = {
      assignedTo: { id: 'u1', name: '  ' },
      tags: [tag('t1', 'Anúncio Meta')],
      contact: { tags: [] },
    };

    expect(rowTagsFor(conv)).toEqual([]);
  });
});
