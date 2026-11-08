import { describe, expect, test } from 'vitest';
import { sellerTagFor } from './seller-tag';

const seller = (id: string, name: string) => ({ id, name, avatarUrl: null });
const tag = (id: string, name: string, color: string | null = '#7c3aed', textColor: string | null = null) => ({
  tag: { id, name, color, textColor },
});

describe('sellerTagFor', () => {
  test('returns null when nobody owns the lead', () => {
    // Arrange
    const card = { assignedTo: null, conversation: { assignedTo: null, tags: [] } };

    // Act
    const result = sellerTagFor(card);

    // Assert
    expect(result).toBeNull();
  });

  test('uses the colored tag that carries the conversation attendant name', () => {
    // Arrange
    const card = {
      assignedTo: null,
      conversation: {
        assignedTo: seller('u1', 'Bárbara'),
        tags: [tag('t1', 'Site'), tag('t2', ' bárbara ', '#ec4899', '#ffffff')],
      },
    };

    // Act
    const result = sellerTagFor(card);

    // Assert
    expect(result).toEqual({ id: 't2', name: ' bárbara ', color: '#ec4899', textColor: '#ffffff' });
  });

  test('falls back to the attendant name without color when the tag does not exist yet', () => {
    // Arrange
    const card = {
      assignedTo: null,
      conversation: { assignedTo: seller('u1', 'Pedro '), tags: [tag('t1', 'Site')] },
    };

    // Act
    const result = sellerTagFor(card);

    // Assert
    expect(result).toEqual({ id: 'attendant-u1', name: 'Pedro', color: null, textColor: null });
  });

  test('prefers the conversation attendant over the card assignment', () => {
    // Arrange
    const card = {
      assignedTo: seller('u2', 'Admin OFP'),
      conversation: { assignedTo: seller('u1', 'Pedro'), tags: [] },
    };

    // Act
    const result = sellerTagFor(card);

    // Assert
    expect(result?.name).toBe('Pedro');
  });

  test('uses the card assignment when the card has no conversation', () => {
    // Arrange
    const card = { assignedTo: seller('u2', 'Lidiane'), conversation: null };

    // Act
    const result = sellerTagFor(card);

    // Assert
    expect(result).toEqual({ id: 'attendant-u2', name: 'Lidiane', color: null, textColor: null });
  });
});
