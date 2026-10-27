import type { TicketRule } from '../types';

/**
 * Sugere qual ingresso da base é o item lido do print, pelo fornecedor e pelo
 * nome do produto. É só uma sugestão: o atendente confirma ou troca no editor.
 */

/** Palavras que identificam o operador no texto do print. */
const OPERATOR_KEYWORDS: [string, RegExp][] = [
  ['disney', /\bdisney|magic kingdom|epcot|hollywood studios|animal kingdom|typhoon|blizzard|lightning lane/],
  ['universal', /\buniversal|epic universe|volcano bay|islands of adventure/],
  ['united_parks', /seaworld|sea world|busch gardens|aquatica|discovery cove|adventure island|united parks/],
  ['legoland', /legoland|peppa/],
  ['ksc', /kennedy|\bnasa\b|\bksc\b/],
  ['gatorland', /gatorland/],
  ['go_city', /go city/],
  ['merlin_icon_park', /madame tussauds|orlando eye|icon park/],
  ['fun_spot', /fun spot/],
  ['wonderworks', /wonderworks/],
  ['medieval_times', /medieval/],
];

/**
 * Palavras que separam produtos parecidos ("4 dias" × "4 Parques Mágico").
 * Se só um dos lados tem, a sugestão perde força; se os dois têm, ganha.
 */
const DISTINCTIVE = [
  /magic|magico/, /\bepic\b/, /volcano/, /express/, /lightning/, /hopper/, /plus\b/, /aquatic/,
  /discovery/, /nado|dolphin|golfinho/, /ultimate/, /refeicao|dining/, /peppa/, /multi.?park/,
  /quick queue/, /memory maker/, /halloween|horror|howl/, /christmas|natal/, /after hours/, /14 dias/,
];

const STOPWORDS = new Set(['ingresso', 'ingressos', 'dia', 'dias', 'day', 'days', 'para', 'com', 'sem', 'dos', 'das', 'the', 'and', 'por', 'parque', 'parques', 'park', 'parks', 'ticket', 'tickets']);
const MIN_SCORE = 3;

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/park.?to.?park/g, 'park to park');

const words = (s: string) => new Set(normalize(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w)));

export function operatorFromText(text: string): string | null {
  const t = normalize(text);
  return OPERATOR_KEYWORDS.find(([, re]) => re.test(t))?.[0] ?? null;
}

function daysFromText(text: string): number | null {
  const m = /\b(\d{1,2})\s*-?\s*(?:dias?|days?)\b/.exec(normalize(text));
  return m ? Number(m[1]) : null;
}

const hasHopping = (t: string) => /park to park|hopper|p2p/.test(t);

function score(rule: TicketRule, text: string, itemWords: Set<string>, days: number | null): number {
  const ruleText = normalize(`${rule.name} ${rule.nameEn}`);
  let total = 0;
  if (days !== null && rule.days !== null) total += days === rule.days ? 5 : -3;
  for (const w of words(ruleText)) if (itemWords.has(w)) total += 1;
  for (const re of DISTINCTIVE) {
    const inItem = re.test(text);
    const inRule = re.test(ruleText);
    if (inItem && inRule) total += 3;
    else if (inItem !== inRule) total -= 2;
  }
  if (hasHopping(text)) total += rule.parkHopping ? 3 : -2;
  else if (rule.parkHopping && rule.operatorId === 'universal') total -= 1;
  if (rule.status === 'ativo') total += 1;
  if (rule.status === 'encerrado') total -= 2;
  return total;
}

/** O ingresso mais provável para o item, ou null quando nada convence. */
export function matchTicketRule(rules: TicketRule[], item: { provider: string; title: string }): TicketRule | null {
  const raw = `${item.provider} ${item.title}`;
  const text = normalize(raw);
  const operator = operatorFromText(raw);
  if (!operator) return null;
  const itemWords = words(raw);
  const days = daysFromText(raw);
  const ranked = rules
    .filter((r) => r.operatorId === operator)
    .map((rule) => ({ rule, score: score(rule, text, itemWords, days) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  return best && best.score >= MIN_SCORE ? best.rule : null;
}
