import { describe, expect, it } from 'vitest';
import {
  avgOnlinePerDay,
  flattenPresenceDays,
  formatClock,
  formatDayLabel,
  formatIdleTotal,
  idleNowLabel,
  formatLastReply,
  formatMinutes,
  presenceExit,
  scheduleLabel,
  statusMeta,
} from './team-presence';
import type { PresenceDay } from '../services/dashboard.service';

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

describe('ponto dia a dia', () => {
  const day = (over: Partial<PresenceDay> = {}): PresenceDay => ({
    day: '2026-11-19',
    firstSeenAt: '2026-11-19T11:02:00Z',
    lastActiveAt: '2026-11-19T21:10:00Z',
    lastSeenAt: '2026-11-19T21:25:00Z',
    onlineMinutes: 600,
    activeMinutes: 480,
    ...over,
  });

  it('saída é o último uso real', () => {
    expect(presenceExit(day())).toEqual({ iso: '2026-11-19T21:10:00Z', isEstimated: false });
  });

  it('sem último uso registrado, cai no último minuto com o Chat aberto e marca como estimada', () => {
    expect(presenceExit(day({ lastActiveAt: null }))).toEqual({
      iso: '2026-11-19T21:25:00Z',
      isEstimated: true,
    });
  });

  it('rótulo do dia com semana', () => {
    expect(formatDayLabel('2026-11-19')).toBe('qui 19/11');
    expect(formatDayLabel('inválido')).toBe('—');
  });

  it('achata as linhas: dia mais recente primeiro, depois nome', () => {
    const rows = [
      { userId: 'p', name: 'Pedro', period: { days: [day({ day: '2026-11-18' }), day()] } },
      { userId: 'a', name: 'Ana', period: { days: [day()] } },
    ];
    expect(flattenPresenceDays(rows).map((r) => `${r.day} ${r.name}`)).toEqual([
      '2026-11-19 Ana',
      '2026-11-19 Pedro',
      '2026-11-18 Pedro',
    ]);
  });

  it('API sem o ponto (deploy fora de ordem) não quebra', () => {
    expect(flattenPresenceDays([{ userId: 'a', name: 'Ana', period: {} }])).toEqual([]);
  });
});

describe('tempo inativo', () => {
  it('pausa em andamento vira "Sem usar há"', () => {
    expect(idleNowLabel({ sinceAt: '2026-11-23T14:00:00Z', minutes: 32 })).toBe('Sem usar há 32min');
    expect(idleNowLabel(null)).toBeNull();
    expect(idleNowLabel(undefined)).toBeNull();
  });

  it('total do dia com pausas e a maior, "—" sem inatividade', () => {
    expect(formatIdleTotal({ idleMinutes: 95, idlePauses: 3, longestIdleMinutes: 50 })).toEqual({
      label: '1h 35min',
      detail: '3 pausas · maior 50min',
    });
    expect(formatIdleTotal({ idleMinutes: 20, idlePauses: 1, longestIdleMinutes: 20 }).detail).toBe('1 pausa');
    expect(formatIdleTotal({ idleMinutes: 0, idlePauses: 0, longestIdleMinutes: 0 })).toEqual({ label: '—', detail: null });
    // API antiga, sem os campos.
    expect(formatIdleTotal({})).toEqual({ label: '—', detail: null });
  });
});
