import { describe, expect, it } from 'vitest';
import catalogJson from './ticket-rules.json';
import type { TicketCatalog } from '../types';

const catalog = catalogJson as TicketCatalog;

describe('base de regras de ingressos', () => {
  it('não traz nenhum valor em dinheiro — só regras', () => {
    const text = JSON.stringify(catalog);
    expect(text).not.toMatch(/(?:US|R)\$\s*\d|\$\s*\d/);
    expect(text).not.toMatch(/preco|price/i);
  });

  it('todo ingresso aponta para um operador conhecido e tem id único', () => {
    const operators = new Set(catalog.operators.map((o) => o.id));
    const ids = catalog.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalog.rules.every((r) => operators.has(r.operatorId))).toBe(true);
  });
});
