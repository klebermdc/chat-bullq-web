import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  firstName,
  formatDateTimeShort,
  formatQuoteNumber,
  formatDayLong,
  formatDayShort,
  formatDayCompact,
  formatQuoteMoney,
  formatValidUntil,
  formatDateBR,
  formatPeople,
} from './quote-format';

// Intl usa espaço sem quebra entre "R$" e o número.
const plain = (s: string | null) => s?.replace(/ /g, ' ') ?? null;

describe('formatQuoteMoney', () => {
  it('formata reais com centavos', () => {
    expect(plain(formatQuoteMoney(17971.62, 'BRL'))).toBe('R$ 17.971,62');
  });

  it('mantém os centavos zerados', () => {
    expect(plain(formatQuoteMoney(100, 'BRL'))).toBe('R$ 100,00');
  });

  it('formata dólar no padrão brasileiro', () => {
    expect(plain(formatQuoteMoney(1234.5, 'USD'))).toBe('US$ 1.234,50');
  });

  it('moeda inválida cai em reais', () => {
    expect(plain(formatQuoteMoney(10, 'XX'))).toBe('R$ 10,00');
  });

  it('valor ausente devolve null', () => {
    expect(formatQuoteMoney(null, 'BRL')).toBeNull();
  });
});

describe('formatDayShort', () => {
  it('um dia só: dia da semana, dia e mês', () => {
    expect(formatDayShort('2027-01-01', '2027-01-01')).toBe('Sex, 1 jan');
  });

  it('fim nulo conta como um dia', () => {
    expect(formatDayShort('2027-01-01', null)).toBe('Sex, 1 jan');
  });

  it('dois dias seguidos no mesmo mês', () => {
    expect(formatDayShort('2027-01-05', '2027-01-06')).toBe('Ter e qua, 5 e 6 jan');
  });

  it('intervalo no mesmo mês', () => {
    expect(formatDayShort('2027-01-02', '2027-01-04')).toBe('Sáb a seg, 2 a 4 jan');
  });

  it('intervalo que vira o mês', () => {
    expect(formatDayShort('2026-12-30', '2027-01-02')).toBe('30 dez a 2 jan');
  });

  it('sem data devolve null', () => {
    expect(formatDayShort(null, null)).toBeNull();
  });
});

describe('formatDayLong', () => {
  it('um dia', () => {
    expect(formatDayLong('2027-01-01', '2027-01-01')).toBe('Sex, 1 de janeiro de 2027');
  });

  it('dois dias seguidos', () => {
    expect(formatDayLong('2027-01-05', '2027-01-06')).toBe('Ter e qua, 5 e 6 de janeiro de 2027');
  });

  it('intervalo no mesmo mês', () => {
    expect(formatDayLong('2027-01-02', '2027-01-04')).toBe('2 a 4 de janeiro de 2027');
  });

  it('intervalo que vira o ano', () => {
    expect(formatDayLong('2026-12-30', '2027-01-02')).toBe(
      '30 de dezembro de 2026 a 2 de janeiro de 2027',
    );
  });

  it('intervalo que vira o mês no mesmo ano', () => {
    expect(formatDayLong('2027-03-30', '2027-04-02')).toBe('30 de março a 2 de abril de 2027');
  });
});

describe('formatValidUntil (horário de Brasília)', () => {
  it('hora cheia: "28/10, às 18h"', () => {
    expect(formatValidUntil('2026-10-28T21:00:00.000Z')).toBe('28/10, às 18h');
  });

  it('com minutos: "28/10, às 18h30"', () => {
    expect(formatValidUntil('2026-10-28T21:30:00.000Z')).toBe('28/10, às 18h30');
  });

  it('com ano quando pedido', () => {
    expect(formatValidUntil('2026-10-28T21:00:00.000Z', { withYear: true })).toBe(
      '28/10/2026, às 18h',
    );
  });

  it('data inválida devolve null', () => {
    expect(formatValidUntil('ontem')).toBeNull();
  });
});

describe('formatDateTimeShort', () => {
  it('dd/mm HH:mm em Brasília', () => {
    expect(formatDateTimeShort('2026-10-28T17:32:00.000Z')).toBe('28/10 14:32');
  });
});

describe('formatDateBR', () => {
  it('instante em Brasília vira dd/mm/aaaa', () => {
    // 01h UTC do dia 27 ainda é dia 26 no Brasil.
    expect(formatDateBR('2026-10-27T01:00:00.000Z')).toBe('26/10/2026');
  });
});

describe('daysUntil', () => {
  const now = new Date('2026-10-26T15:00:00.000Z'); // 26/10, meio-dia em Brasília

  it('conta dias de calendário até a data', () => {
    expect(daysUntil('2027-01-01', now)).toBe(67);
  });

  it('amanhã é 1', () => {
    expect(daysUntil('2026-10-27', now)).toBe(1);
  });

  it('hoje é 0 e o passado é negativo', () => {
    expect(daysUntil('2026-10-26', now)).toBe(0);
    expect(daysUntil('2026-10-20', now)).toBe(-6);
  });

  it('usa o dia de Brasília, não o UTC', () => {
    // 02h UTC do dia 27 = 23h do dia 26 em Brasília.
    expect(daysUntil('2026-10-27', new Date('2026-10-27T02:00:00.000Z'))).toBe(1);
  });

  it('data inválida devolve null', () => {
    expect(daysUntil('logo', now)).toBeNull();
  });
});

describe('firstName', () => {
  it('pega o primeiro nome', () => {
    expect(firstName('  maria   da silva ')).toBe('Maria');
  });

  it('vazio ou nulo devolve null', () => {
    expect(firstName('   ')).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe('formatPeople', () => {
  it('adultos e crianças', () => {
    expect(formatPeople(3, 1)).toBe('3 adultos e 1 criança');
  });

  it('só adultos', () => {
    expect(formatPeople(1, 0)).toBe('1 adulto');
  });

  it('só crianças', () => {
    expect(formatPeople(0, 2)).toBe('2 crianças');
  });

  it('ninguém devolve null', () => {
    expect(formatPeople(0, 0)).toBeNull();
  });
});

describe('formatDayCompact', () => {
  it('tira o dia da semana', () => {
    expect(formatDayCompact('2027-01-01', '2027-01-06')).toBe('1 a 6 jan');
    expect(formatDayCompact('2027-01-01', null)).toBe('1 jan');
    expect(formatDayCompact('2026-12-30', '2027-01-02')).toBe('30 dez a 2 jan');
  });
});

describe('formatQuoteNumber', () => {
  it('4 dígitos, mais quando passar de 9999', () => {
    expect(formatQuoteNumber(7)).toBe('0007');
    expect(formatQuoteNumber(12345)).toBe('12345');
  });
});
