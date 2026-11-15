/**
 * Leitura defensiva das respostas da API de modelos. O tipo é uma promessa
 * nossa, não uma garantia: as duas pontas sobem juntas, mas um deploy pela
 * metade não pode derrubar a tela.
 */

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
