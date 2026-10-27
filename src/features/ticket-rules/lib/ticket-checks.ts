import type { TicketRule } from '../types';

/**
 * Confere as datas de um item da cotação contra a regra do ingresso. Datas
 * são de calendário ('YYYY-MM-DD'), comparadas como texto — nunca passam por fuso.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export interface TicketCheck {
  level: 'error' | 'warn';
  text: string;
}

const isDate = (v: string | null | undefined): v is string => !!v && DATE_ONLY.test(v);

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

const earliest = (...dates: (string | null)[]) => dates.filter(isDate).sort()[0] ?? null;

/** "2027-01-16" → "16/01/2027". */
export const toBR = (iso: string) => iso.split('-').reverse().join('/');

/** Limite absoluto do produto, quando conhecido. */
const productLimit = (rule: TicketRule) => rule.finalValidity ?? rule.useEnd;

/** Último dia em que o ingresso pode ser usado, começando em `start`. */
export function lastValidDay(rule: TicketRule, start: string): string | null {
  if (!isDate(start)) return null;
  if (rule.windowType === 'data_unica') return start;
  const fromWindow =
    (rule.windowType === 'desde_data_inicio' || rule.windowType === 'desde_primeiro_uso') && rule.windowDays
      ? addDays(start, rule.windowDays - 1)
      : null;
  return earliest(fromWindow, productLimit(rule));
}

function statusChecks(rule: TicketRule, today: string): TicketCheck[] {
  const out: TicketCheck[] = [];
  if (rule.status === 'encerrado') out.push({ level: 'warn', text: 'Venda encerrada: a regra vale só para ingresso já emitido.' });
  else if (isDate(rule.saleEnd) && today > rule.saleEnd) out.push({ level: 'warn', text: `Venda encerrada em ${toBR(rule.saleEnd)}.` });
  if (rule.status === 'verificar') out.push({ level: 'warn', text: 'Venda no Brasil não confirmada.' });
  if (rule.status === 'sazonal') out.push({ level: 'warn', text: 'Produto sazonal: confirmar se funciona nas datas.' });
  // Com confiança alta as pendências são só notas de fonte; ficam nas regras completas.
  if (rule.confidence !== 'alta') {
    out.push({ level: 'warn', text: 'Regra com pendências: confirmar com o fornecedor antes de fechar.' });
  }
  return out;
}

function dateChecks(rule: TicketRule, start: string, end: string): TicketCheck[] {
  if (!isDate(start)) return [];
  const out: TicketCheck[] = [];
  if (isDate(rule.useStart) && start < rule.useStart) out.push({ level: 'error', text: `Uso só a partir de ${toBR(rule.useStart)}.` });
  const limit = productLimit(rule);
  if (isDate(limit) && start > limit) out.push({ level: 'error', text: `Este ingresso só vale até ${toBR(limit)}.` });
  const last = lastValidDay(rule, start);
  if (isDate(end) && last && end > last) {
    out.push({ level: 'error', text: `A data final passa do último dia válido (${toBR(last)}).` });
  }
  const opensWindow = rule.windowType === 'desde_data_inicio' || rule.windowType === 'desde_primeiro_uso';
  if (opensWindow && rule.windowDays == null) {
    out.push({ level: 'warn', text: 'Janela de uso não confirmada: conferir o vencimento no voucher.' });
  }
  return out;
}

/** Erros (data fora da regra) primeiro, depois os avisos. */
export function checkTicketItem(rule: TicketRule, dates: { startDate: string; endDate: string }, today: string): TicketCheck[] {
  const all = [...dateChecks(rule, dates.startDate, dates.endDate), ...statusChecks(rule, today)];
  return [...all.filter((c) => c.level === 'error'), ...all.filter((c) => c.level === 'warn')];
}

const BAND_LABELS: Record<string, string> = { adulto: 'Adulto', crianca: 'Criança', bebe: 'Bebê', idoso: 'Idoso' };

/** "Adulto 10+ · Criança 3–9 · Bebê 0–2 grátis". */
export function formatAgeBands(rule: TicketRule): string | null {
  if (rule.ageBands.length === 0) return null;
  return rule.ageBands
    .map((b) => {
      const label = BAND_LABELS[b.band] ?? b.band.charAt(0).toUpperCase() + b.band.slice(1);
      const range = b.max == null ? `${b.min}+` : `${b.min}–${b.max}`;
      return `${label} ${range}${b.free ? ' grátis' : ''}`;
    })
    .join(' · ');
}
