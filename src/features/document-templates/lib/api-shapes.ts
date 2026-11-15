/**
 * Leitura defensiva das respostas da API de modelos. O tipo é uma promessa
 * nossa, não uma garantia: as duas pontas sobem juntas, mas um deploy pela
 * metade não pode derrubar a tela.
 */

import type {
  AiFillResult,
  AutofillResult,
  DataRequestResult,
  FieldDefaults,
  FieldGroups,
  FieldSource,
} from '../types';
import { readSendResult } from './contract-delivery';
import { normalizeValues, toPlaceholderKey } from './placeholders';

/** Tira o envelope `{ data, meta }` sem confundir payload nulo com envelope. */
export function unwrapEnvelope<T>(body: unknown): T {
  return body && typeof body === 'object' && 'data' in body
    ? ((body as { data: T }).data)
    : (body as T);
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const list = value.filter((v): v is string => typeof v === 'string');
  return list.length ? list : null;
}

/**
 * Lista `missing` de uma resposta 422. O filtro global de erros da API só
 * repassa `message`, então o campo pode vir no topo, dentro de `message`
 * (objeto) ou dentro de `data`. Devolve null quando não achar.
 */
export function readMissingFromBody(body: unknown): string[] | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const candidates = [record.missing, (record.message as Record<string, unknown> | undefined)?.missing,
    (record.data as Record<string, unknown> | undefined)?.missing];
  for (const candidate of candidates) {
    const list = asStringList(candidate);
    if (list) return list;
  }
  return null;
}

/** Mensagem legível de uma resposta de erro (`message` texto ou lista). */
export function readMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const message = (body as Record<string, unknown>).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  if (message && typeof message === 'object') {
    const inner = (message as Record<string, unknown>).message;
    if (typeof inner === 'string') return inner;
  }
  return null;
}

const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]+/g;
const MAX_FILENAME_LENGTH = 120;

/** "Contrato: Orlando/2026" → "Contrato- Orlando-2026.pdf". */
export function pdfFileName(title: string): string {
  const base = title.replace(UNSAFE_FILENAME_CHARS, '-').replace(/\s+/g, ' ').trim().slice(0, MAX_FILENAME_LENGTH);
  return `${base || 'documento'}.pdf`;
}

// --- Preenchimento: autopreenchimento, pedido ao cliente, IA e padrões ---

const FIELD_SOURCES: readonly FieldSource[] = ['default', 'agency', 'contact', 'saved', 'date'];
const GROUP_NAMES: readonly (keyof FieldGroups)[] = ['client', 'seller', 'agency', 'auto'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asKeyList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const keys = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(toPlaceholderKey);
  return Array.from(new Set(keys));
}

function readSources(raw: unknown): Record<string, FieldSource> {
  const record = asRecord(raw);
  if (!record) return {};
  return Object.entries(record).reduce<Record<string, FieldSource>>((acc, [key, value]) => {
    const source = FIELD_SOURCES.find((s) => s === value);
    return source ? { ...acc, [toPlaceholderKey(key)]: source } : acc;
  }, {});
}

/** Grupos só valem se ao menos um vier como lista; senão a tela usa lista única. */
function readGroups(raw: unknown): FieldGroups | null {
  const record = asRecord(raw);
  if (!record || !GROUP_NAMES.some((name) => Array.isArray(record[name]))) return null;
  return {
    client: asKeyList(record.client),
    seller: asKeyList(record.seller),
    agency: asKeyList(record.agency),
    auto: asKeyList(record.auto),
  };
}

/** `GET /document-templates/:id/autofill`, já sem o envelope. */
export function parseAutofill(payload: unknown): AutofillResult {
  const record = asRecord(payload);
  return {
    values: normalizeValues(asRecord(record?.values)),
    sources: readSources(record?.sources),
    groups: readGroups(record?.groups),
  };
}

/** `POST /conversations/:id/contracts/data-request`, já sem o envelope. */
export function parseDataRequest(payload: unknown): DataRequestResult {
  const record = asRecord(payload);
  return {
    text: typeof record?.text === 'string' ? record.text : '',
    fields: asKeyList(record?.fields),
    send: readSendResult(record?.send),
  };
}

/** `POST /document-templates/:id/ai-fill`, já sem o envelope. */
export function parseAiFill(payload: unknown): AiFillResult {
  const record = asRecord(payload);
  const values = normalizeValues(asRecord(record?.values));
  const filled = asKeyList(record?.filled);
  return { values, filled: filled.length ? filled : Object.keys(values) };
}

/** `GET|PUT /document-templates/field-defaults`, já sem o envelope. */
export function parseFieldDefaults(payload: unknown): FieldDefaults {
  const record = asRecord(payload);
  const rawValues = asRecord(record?.values) ?? {};
  const values = Object.entries(rawValues).reduce<Record<string, string>>(
    (acc, [key, value]) => (typeof value === 'string' && key.trim() ? { ...acc, [key]: value } : acc),
    {},
  );
  const suggested = Array.isArray(record?.suggestedFields)
    ? record.suggestedFields.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];
  return { values, suggestedFields: Array.from(new Set(suggested)) };
}
