import type { Score, VisitLine, VisitListItem, VisitStatus } from './api';

export const STATUS_LABEL: Record<VisitStatus, string> = {
  OPEN: 'Em andamento',
  EVALUATING: 'Avaliando',
  DONE: 'Avaliada',
  FAILED: 'Falhou',
  DISCARDED: 'Descartada',
};

export const STATUS_BADGE: Record<VisitStatus, 'info' | 'brand' | 'success' | 'urgent' | 'neutral'> = {
  OPEN: 'info',
  EVALUATING: 'brand',
  DONE: 'success',
  FAILED: 'urgent',
  DISCARDED: 'neutral',
};

const HOUR_MS = 3_600_000;

export function closesInLabel(closesAt: string | null, now: Date = new Date()): string | null {
  if (!closesAt) return null;
  const hours = Math.ceil((Date.parse(closesAt) - now.getTime()) / HOUR_MS);
  return hours <= 0 ? 'fecha na próxima rodada' : `fecha em ${hours}h`;
}

export function scoreLabel(score: Score | null): string {
  if (score === null) return 'Não se aplica';
  return ['Não fez', 'Fez em parte', 'Fez bem'][score];
}

const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();

export function findLineForEvidence(lines: VisitLine[], evidence: string): string | null {
  const needle = normalize(evidence);
  if (!needle) return null;
  return lines.find((l) => l.role === 'VENDEDOR' && normalize(l.text).includes(needle))?.messageId ?? null;
}

/** Em andamento primeiro; dentro de cada grupo, a mais recente antes. */
export function sortVisits(visits: VisitListItem[]): VisitListItem[] {
  const rank = (v: VisitListItem) => (v.status === 'OPEN' ? 0 : 1);
  return [...visits].sort((a, b) => rank(a) - rank(b) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
