import { describe, expect, test } from 'vitest';
import { REVIEW_TEXT_MAX, reviewTextIssue } from './proposal-review';

describe('reviewTextIssue', () => {
  test('accepts the message as read or edited', () => {
    expect(reviewTextIssue('Olá! Segue sua proposta:\n\nDISNEY 4 PARKS')).toBeNull();
  });

  test('asks for the message when it is blank', () => {
    expect(reviewTextIssue('  \n ')).toMatch(/Escreva a mensagem/);
  });

  test('limits the message to the WhatsApp text size', () => {
    expect(reviewTextIssue('x'.repeat(REVIEW_TEXT_MAX))).toBeNull();
    expect(reviewTextIssue('x'.repeat(REVIEW_TEXT_MAX + 1))).toMatch(/4096/);
  });
});
