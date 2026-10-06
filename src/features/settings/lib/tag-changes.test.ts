import { describe, expect, test } from 'vitest';
import { tagChanges } from './tag-changes';

const tag = { id: 't1', organizationId: 'o1', name: 'BÁRBARA', color: '#ef4444', textColor: null };

describe('tagChanges', () => {
  test('sends only the colors when the name was not touched', () => {
    // Arrange
    const draft = { name: 'BÁRBARA', color: '#10b981', textColor: '#ffffff' };

    // Act
    const changes = tagChanges(tag, draft);

    // Assert
    expect(changes).toEqual({ color: '#10b981', textColor: '#ffffff' });
  });

  test('ignores surrounding spaces when comparing the name', () => {
    expect(tagChanges(tag, { name: ' BÁRBARA ', color: '#ef4444', textColor: null })).toEqual({});
  });

  test('sends the trimmed name when it changed', () => {
    expect(tagChanges(tag, { name: ' Bárbara Lima ', color: '#ef4444', textColor: null })).toEqual({
      name: 'Bárbara Lima',
    });
  });

  test('sends null to bring the text color back to automatic', () => {
    const withText = { ...tag, textColor: '#ffffff' };

    expect(tagChanges(withText, { name: 'BÁRBARA', color: '#ef4444', textColor: null })).toEqual({
      textColor: null,
    });
  });

  test('treats a tag without text color as automatic', () => {
    const legacy = { id: 't1', organizationId: 'o1', name: 'BÁRBARA', color: '#ef4444' };

    expect(tagChanges(legacy, { name: 'BÁRBARA', color: '#ef4444', textColor: null })).toEqual({});
  });
});
