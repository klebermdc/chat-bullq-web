import type { PlaceholderValues } from '../types';

/**
 * Um campo do modelo é qualquer texto entre colchetes numa linha só, ex.:
 * "[Nome do Cliente]". Sem colchete aninhado e com limite de tamanho para que
 * um "[" esquecido no meio do contrato não engula o parágrafo inteiro.
 *
 * Fonte única da regra: o editor de modelos (detecção ao vivo) e o formulário
 * de preenchimento usam esta mesma expressão.
 */
const PLACEHOLDER_SOURCE = String.raw`\[([^\[\]\n]{1,80})\]`;
const MAX_LABEL_LENGTH = 80;

export function placeholderRegex(): RegExp {
  // Nova instância a cada uso: a flag `g` guarda `lastIndex` entre chamadas.
  return new RegExp(PLACEHOLDER_SOURCE, 'g');
}

/** Placeholders do corpo, na ordem em que aparecem, sem repetição. */
export function extractPlaceholders(body: string): string[] {
  const found = Array.from(body.matchAll(placeholderRegex()), (m) => m[0]);
  return Array.from(new Set(found.filter((p) => p.slice(1, -1).trim().length > 0)));
}

/** "[Nome do Cliente]" → "Nome do Cliente". */
export function placeholderLabel(placeholder: string): string {
  const inner = placeholder.startsWith('[') && placeholder.endsWith(']')
    ? placeholder.slice(1, -1)
    : placeholder;
  return inner.trim();
}

/** "Nome do Cliente" ou "[Nome do Cliente]" → "[Nome do Cliente]". */
export function toPlaceholderKey(nameOrPlaceholder: string): string {
  const label = placeholderLabel(nameOrPlaceholder).slice(0, MAX_LABEL_LENGTH);
  return `[${label}]`;
}

/** Minúsculas e sem acento, para comparar rótulos e buscas. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const LONG_FIELD_HINTS = ['descri', 'observ', 'detalh', 'clausul', 'condic', 'endereco', 'roteiro'];

/** Campos de texto corrido (descrição, observações…) ganham área de texto. */
export function isLongPlaceholder(placeholder: string): boolean {
  const label = normalizeText(placeholderLabel(placeholder));
  return LONG_FIELD_HINTS.some((hint) => label.includes(hint));
}

/** Placeholders ainda sem valor (só espaço conta como vazio). */
export function missingPlaceholders(placeholders: readonly string[], values: PlaceholderValues): string[] {
  return placeholders.filter((p) => !(values[p] ?? '').trim());
}

/**
 * Normaliza o que veio do autopreenchimento: aceita chave com ou sem
 * colchetes e descarta valor vazio ou que não seja texto.
 */
export function normalizeValues(raw: Record<string, unknown> | null | undefined): PlaceholderValues {
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw).reduce<PlaceholderValues>((acc, [key, value]) => {
    if (typeof value !== 'string' || !value.trim()) return acc;
    return { ...acc, [toPlaceholderKey(key)]: value };
  }, {});
}

/**
 * Junta os valores que o atendente já tem com os sugeridos: o que ele digitou
 * nunca é sobrescrito pela sugestão.
 */
export function mergeValues(current: PlaceholderValues, suggested: PlaceholderValues): PlaceholderValues {
  const keptCurrent = Object.fromEntries(Object.entries(current).filter(([, v]) => v.trim()));
  return { ...suggested, ...keptCurrent };
}

/** Separa o texto em pedaços comuns e placeholders, para destacar na prévia. */
export interface TextSegment {
  text: string;
  isPlaceholder: boolean;
}

export function splitByPlaceholders(text: string, only?: readonly string[]): TextSegment[] {
  const wanted = only ? new Set(only) : null;
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(placeholderRegex())) {
    const start = match.index ?? 0;
    if (wanted && !wanted.has(match[0])) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), isPlaceholder: false });
    segments.push({ text: match[0], isPlaceholder: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), isPlaceholder: false });
  return segments;
}
