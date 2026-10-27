import { describe, expect, it } from 'vitest';
import catalogJson from '../data/ticket-rules.json';
import type { TicketCatalog, TicketRule } from '../types';
import { checkTicketItem, formatAgeBands, lastValidDay } from './ticket-checks';

const catalog = catalogJson as TicketCatalog;
const rule = (id: string) => catalog.rules.find((r) => r.id === id) as TicketRule;
const TODAY = '2026-10-27';

describe('lastValidDay', () => {
  it('conta a janela a partir do dia inicial (Disney 4 dias = 7 dias corridos)', () => {
    expect(lastValidDay(rule('disney-base-4d'), '2027-01-10')).toBe('2027-01-16');
  });

  it('ingresso de data única vale só no dia', () => {
    expect(lastValidDay(rule('up-discovery-cove-day-resort'), '2027-02-01')).toBe('2027-02-01');
  });

  it('não calcula sem data', () => {
    expect(lastValidDay(rule('disney-base-4d'), '')).toBeNull();
  });
});

describe('checkTicketItem', () => {
  it('acusa data final depois do último dia válido', () => {
    const checks = checkTicketItem(rule('disney-base-4d'), { startDate: '2027-01-10', endDate: '2027-01-18' }, TODAY);
    expect(checks[0]).toEqual({ level: 'error', text: 'A data final passa do último dia válido (16/01/2027).' });
  });

  it('não acusa erro com as datas dentro da janela', () => {
    const checks = checkTicketItem(rule('disney-base-4d'), { startDate: '2027-01-10', endDate: '2027-01-14' }, TODAY);
    expect(checks.filter((c) => c.level === 'error')).toEqual([]);
  });

  it('avisa quando a venda está encerrada', () => {
    const checks = checkTicketItem(rule('disney-4park-magic-latam-2026'), { startDate: '', endDate: '' }, TODAY);
    expect(checks.map((c) => c.text)).toContain('Venda encerrada: a regra vale só para ingresso já emitido.');
  });

  it('avisa quando a regra tem pendências com o fornecedor', () => {
    const checks = checkTicketItem(rule('universal-2d-p2p'), { startDate: '', endDate: '' }, TODAY);
    expect(checks.map((c) => c.text)).toContain('Regra com pendências: confirmar com o fornecedor antes de fechar.');
  });
});

describe('formatAgeBands', () => {
  it('resume as faixas da Disney', () => {
    expect(formatAgeBands(rule('disney-base-1d'))).toBe('Adulto 10+ · Criança 3–9 · Bebê 0–2 grátis');
  });
});
