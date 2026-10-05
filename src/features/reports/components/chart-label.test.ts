import { describe, expect, it } from 'vitest';
import { CHART_LABEL_MAX_CHARS, shortenChartLabel } from './chart-label';

describe('shortenChartLabel', () => {
  it('keeps a label that fits the axis untouched', () => {
    expect(shortenChartLabel('Disney 4-Park')).toBe('Disney 4-Park');
  });

  it('keeps a label exactly at the limit untouched', () => {
    const label = 'a'.repeat(CHART_LABEL_MAX_CHARS);

    expect(shortenChartLabel(label)).toBe(label);
  });

  it('cuts a long label to the limit and ends it with an ellipsis', () => {
    const result = shortenChartLabel('Universal 3-Park Explorer Ticket com Volcano Bay');

    expect(result).toHaveLength(CHART_LABEL_MAX_CHARS);
    expect(result.endsWith('…')).toBe(true);
    expect(result.startsWith('Universal 3-Park')).toBe(true);
  });

  it('does not leave a space before the ellipsis', () => {
    const label = `${'a'.repeat(CHART_LABEL_MAX_CHARS - 2)} bcdef`;

    expect(shortenChartLabel(label)).toBe(`${'a'.repeat(CHART_LABEL_MAX_CHARS - 2)}…`);
  });

  it('returns an empty string for a missing value', () => {
    expect(shortenChartLabel(null)).toBe('');
    expect(shortenChartLabel(undefined)).toBe('');
  });

  it('turns a non-string value into text', () => {
    expect(shortenChartLabel(2026)).toBe('2026');
  });
});
