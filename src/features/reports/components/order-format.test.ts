import { describe, expect, it } from 'vitest';
import { formatOrderDate, orderStatusMeta } from './order-format';

describe('formatOrderDate', () => {
  it('formats a plain ISO day as dd/mm/aaaa', () => {
    expect(formatOrderDate('2026-09-06')).toBe('06/09/2026');
  });

  it('keeps the written day of a full ISO timestamp, without timezone shift', () => {
    expect(formatOrderDate('2026-09-06T00:30:00.000Z')).toBe('06/09/2026');
  });

  it('returns the original text when it is not an ISO date', () => {
    expect(formatOrderDate('06/09/2026')).toBe('06/09/2026');
  });

  it('returns a dash for empty or non-string values', () => {
    expect(formatOrderDate('')).toBe('—');
    expect(formatOrderDate(null)).toBe('—');
    expect(formatOrderDate(undefined)).toBe('—');
  });
});

describe('orderStatusMeta', () => {
  it('translates a known English status regardless of case', () => {
    expect(orderStatusMeta('PAID')).toEqual({ label: 'Pago', variant: 'success' });
  });

  it('matches Portuguese statuses with accents', () => {
    expect(orderStatusMeta('Concluído')).toEqual({ label: 'Concluído', variant: 'success' });
  });

  it('shows an unknown status as it came, in the neutral tone', () => {
    expect(orderStatusMeta('Aguardando voucher')).toEqual({ label: 'Aguardando voucher', variant: 'neutral' });
  });

  it('returns null when there is no status', () => {
    expect(orderStatusMeta('')).toBeNull();
    expect(orderStatusMeta(null)).toBeNull();
  });
});
