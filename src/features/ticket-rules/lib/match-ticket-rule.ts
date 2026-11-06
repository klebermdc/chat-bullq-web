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
  /quick queue/, /memory maker/, /halloween|horror|howl/, /christmas|natal/, /after hours/, /14 day/,
  /park adventure/,
];

const STOPWORDS = new Set(['ingresso', 'ingressos', 'dia', 'dias', 'day', 'days', 'para', 'com', 'sem', 'dos', 'das', 'the', 'and', 'por', 'parque', 'parques', 'park', 'parks', 'ticket', 'tickets']);
const MIN_SCORE = 3;

/**
 * Números por extenso (PT e EN) antes de "dia(s)/day(s)/parque(s)/park(s)",
 * para "três parques" e "Three Park" virarem "3 park" dos dois lados.
 */
const NUMBER_WORDS: Record<string, string> = {
  um: '1', uma: '1', one: '1',
  dois: '2', duas: '2', two: '2',
  tres: '3', three: '3',
  quatro: '4', four: '4',
  cinco: '5', five: '5',
  seis: '6', six: '6',
  sete: '7', seven: '7',
  oito: '8', eight: '8',
  nove: '9', nine: '9',
  dez: '10', ten: '10',
  catorze: '14', quatorze: '14', fourteen: '14',
};
const NUMBER_WORD_RE = new RegExp(
  `\\b(${Object.keys(NUMBER_WORDS).join('|')})(?=[\\s-]*(?:dias?|days?|parques?|parks?)\\b)`,
  'g',
);

/** Minúsculas, sem acento e com o vocabulário do print e da base no mesmo idioma. */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(NUMBER_WORD_RE, (w) => NUMBER_WORDS[w])
    .replace(/\b(?:parques?|parks?)\b/g, 'park')
    .replace(/\b(?:dias?|days?)\b/g, 'day')
    .replace(/park.?to.?park/g, 'park to park');

const words = (s: string) => new Set(normalize(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w)));

export function operatorFromText(text: string): string | null {
  const t = normalize(text);
  return OPERATOR_KEYWORDS.find(([, re]) => re.test(t))?.[0] ?? null;
}

function daysFromText(text: string): number | null {
  const m = /\b(\d{1,2})\s*-?\s*day\b/.exec(normalize(text));
  return m ? Number(m[1]) : null;
}

/** Quantos parques o texto (já normalizado) diz: "3 park", "(4 park)". */
function parksFromText(normalized: string): number | null {
  const m = /\b(\d{1,2})\s*-?\s*park\b(?! to park)/.exec(normalized);
  return m ? Number(m[1]) : null;
}

const hasHopping = (t: string) => /park to park|hopper|p2p/.test(t);

function score(rule: TicketRule, text: string, itemWords: Set<string>, days: number | null): number {
  const ruleText = normalize(`${rule.name} ${rule.nameEn}`);
  let total = 0;
  if (days !== null && rule.days !== null) total += days === rule.days ? 5 : -3;
  const itemParks = parksFromText(text);
  const ruleParks = parksFromText(ruleText);
  if (itemParks !== null && ruleParks !== null) total += itemParks === ruleParks ? 3 : -2;
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
