import { describe, expect, test } from 'vitest';
import { applyOtherEdits, linesFromText, reviewIssue } from './proposal-review';
import type { ReviewedOtherProposal, ReviewedParksProposal } from '../types';

const car: ReviewedOtherProposal = {
  kind: 'OTHER',
  title: 'TOYOTA COROLLA OU SIMILAR',
  lines: ['Alamo · Intermediário', '16 diárias · Tarifa sem proteção'],
  totalValue: 5081.52,
  currency: 'BRL',
};

const parks: ReviewedParksProposal = {
  kind: 'PARKS',
  adults: 2,
  children: 1,
  startDate: '2026-07-29',
  endDate: '2026-08-01',
  parks: [{ nome: 'DISNEY 4 PARKS', dias: 4, data: '2026-07-29' }],
  totalValue: 0,
  currency: 'BRL',
};

describe('linesFromText', () => {
  test('one line per row, trimmed, without blank rows', () => {
    expect(linesFromText('  Alamo  \n\n16 diárias\r\n   \nKm livre')).toEqual([
      'Alamo',
      '16 diárias',
      'Km livre',
    ]);
  });
});

describe('applyOtherEdits', () => {
  test('returns a new proposal with the edited title and lines, keeping value and currency', () => {
    // Act
    const edited = applyOtherEdits(car, { title: '  Corolla  ', linesText: 'Alamo\n16 diárias' });

    // Assert
    expect(edited).toEqual({ ...car, title: 'Corolla', lines: ['Alamo', '16 diárias'] });
    expect(car.title).toBe('TOYOTA COROLLA OU SIMILAR');
  });
});

describe('reviewIssue', () => {
  test('accepts a valid car quote and any parks proposal', () => {
    expect(reviewIssue(car)).toBeNull();
    expect(reviewIssue(parks)).toBeNull();
  });

  test('asks for the product name when the title is blank', () => {
    expect(reviewIssue({ ...car, title: ' ' })).toMatch(/nome do produto/);
  });

  test('asks for at least one condition', () => {
    expect(reviewIssue({ ...car, lines: [] })).toMatch(/pelo menos uma/);
  });

  test('limits the number of lines to 12', () => {
    const lines = Array.from({ length: 13 }, (_, i) => `linha ${i}`);
    expect(reviewIssue({ ...car, lines })).toMatch(/12 linhas/);
  });

  test('limits each line to 160 characters and the title to 120', () => {
    expect(reviewIssue({ ...car, lines: ['x'.repeat(161)] })).toMatch(/160/);
    expect(reviewIssue({ ...car, title: 'x'.repeat(121) })).toMatch(/120/);
  });
});
