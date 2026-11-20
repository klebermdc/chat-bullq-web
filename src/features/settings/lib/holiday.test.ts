import { describe, expect, it } from 'vitest';
import { holidayState, localDateKey, MAX_HOLIDAY_DAYS } from './holiday';

const TZ = 'America/Sao_Paulo';
// Sexta 20/11/2026 10h em São Paulo.
const NOW = new Date('2026-11-20T13:00:00Z');

describe('localDateKey', () => {
  it('usa o dia do fuso da agência, não o UTC', () => {
    // 22h em São Paulo já é dia 21 em UTC.
    expect(localDateKey(new Date('2026-11-21T01:00:00Z'), TZ)).toBe('2026-11-20');
  });
});

describe('holidayState', () => {
  it('sem data: desligado, hoje como padrão', () => {
    const state = holidayState(null, TZ, NOW);

    expect(state.isActive).toBe(false);
    expect(state.today).toBe('2026-11-20');
    expect(state.maxDate).toBe('2026-12-05');
    expect(MAX_HOLIDAY_DAYS).toBe(15);
  });

  it('ativo: último dia é o anterior à meia-noite de fim', () => {
    const state = holidayState('2026-11-22T03:00:00.000Z', TZ, NOW);

    expect(state.isActive).toBe(true);
    expect(state.lastDay).toBe('2026-11-21');
    expect(state.lastDayLabel).toBe('21/11');
  });

  it('vencido conta como desligado', () => {
    expect(holidayState('2026-11-20T03:00:00.000Z', TZ, NOW).isActive).toBe(false);
  });
});
