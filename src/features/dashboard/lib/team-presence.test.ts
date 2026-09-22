import { describe, expect, it } from 'vitest';
import {
  avgOnlinePerDay,
  formatClock,
  formatLastReply,
  formatMinutes,
  scheduleLabel,
  statusMeta,
} from './team-presence';

describe('formatMinutes', () => {
  it('formata horas e minutos', () => {
    expect(formatMinutes(320)).toBe('5h 20min');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(45)).toBe('45min');
  });

  it('trata zero, negativo e inválido como 0min', () => {
    expect(formatMinutes(0)).toBe('0min');
    expect(formatMinutes(-5)).toBe('0min');
    expect(formatMinutes(Number.NaN)).toBe('0min');
  });

  it('arredonda minutos fracionados', () => {
    expect(formatMinutes(59.6)).toBe('1h');
  });
});

describe('statusMeta', () => {
  it('traduz cada status', () => {
    expect(statusMeta('online').label).toBe('Online');
    expect(statusMeta('away').label).toBe('Ausente');
    expect(statusMeta('offline').label).toBe('Offline');
  });

  it('cai em Offline para status desconhecido', () => {
    expect(statusMeta('zzz' as never).label).toBe('Offline');
  });
});

describe('scheduleLabel', () => {
  const base = { configured: true, withinHours: true, returnsAt: null, onCall: false };

  it('no horário', () => {
    expect(scheduleLabel(base)).toEqual({ label: 'No horário', tone: 'success' });
  });

  it('fora do horário mostra quando volta', () => {
    expect(scheduleLabel({ ...base, withinHours: false, returnsAt: 'amanhã às 9h' }).label)
      .toBe('Fora · volta amanhã às 9h');
    expect(scheduleLabel({ ...base, withinHours: false }).label).toBe('Fora do horário');
  });

  it('sem horário configurado', () => {
    expect(scheduleLabel({ ...base, configured: false, withinHours: null }).label).toBe('Sem horário');
  });
});

describe('formatLastReply', () => {
  const now = new Date(2026, 8, 22, 15, 0);

  it('traço quando não há resposta', () => {
    expect(formatLastReply(null, now)).toBe('—');
    expect(formatLastReply('lixo', now)).toBe('—');
  });

  it('relativo dentro do dia', () => {
    expect(formatLastReply(new Date(2026, 8, 22, 14, 59, 30).toISOString(), now)).toBe('agora');
    expect(formatLastReply(new Date(2026, 8, 22, 14, 56).toISOString(), now)).toBe('há 4 min');
    expect(formatLastReply(new Date(2026, 8, 22, 12, 0).toISOString(), now)).toBe('há 3 h');
  });

  it('ontem e dias anteriores com horário', () => {
    expect(formatLastReply(new Date(2026, 8, 21, 19, 52).toISOString(), now)).toBe('ontem 19:52');
    expect(formatLastReply(new Date(2026, 8, 18, 10, 5).toISOString(), now)).toBe('18/09 10:05');
  });
});

describe('formatClock', () => {
  it('HH:mm ou traço', () => {
    expect(formatClock(new Date(2026, 8, 22, 8, 3).toISOString())).toBe('08:03');
    expect(formatClock(null)).toBe('—');
  });
});

describe('avgOnlinePerDay', () => {
  it('divide pelo número de dias online', () => {
    expect(avgOnlinePerDay({ onlineMinutes: 900, activeMinutes: 600, daysOnline: 3 })).toBe(300);
  });

  it('null sem dias online', () => {
    expect(avgOnlinePerDay({ onlineMinutes: 0, activeMinutes: 0, daysOnline: 0 })).toBeNull();
  });
});
