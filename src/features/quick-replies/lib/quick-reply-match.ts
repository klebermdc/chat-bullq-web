export interface QuickReplyLike {
  id: string;
  shortcut: string;
  title: string;
  content: string;
}

export interface SlashMatch {
  /** O que foi digitado depois da barra (minúsculo). */
  query: string;
  /** Posição da barra. */
  start: number;
  /** Posição do cursor (fim do trecho a trocar). */
  end: number;
}

const MAX_SUGGESTIONS = 8;
const SHORTCUT_CHARS = /^[a-z0-9_-]*$/;

/**
 * "/atalho" sendo digitado no cursor? A barra precisa abrir o texto ou vir
 * depois de espaço/quebra de linha — assim "e/ou" e links não abrem a lista.
 */
export function slashQueryAt(text: string, caret: number): SlashMatch | null {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const start = before.lastIndexOf('/');
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(before[start - 1])) return null;
  const query = before.slice(start + 1).toLowerCase();
  if (!SHORTCUT_CHARS.test(query)) return null;
  return { query, start, end: before.length };
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Atalhos que começam com a busca primeiro; depois os que a contêm (atalho ou título). */
export function filterQuickReplies<T extends QuickReplyLike>(list: T[], query: string): T[] {
  const q = fold(query);
  if (!q) return list.slice(0, MAX_SUGGESTIONS);
  const starts = list.filter((r) => fold(r.shortcut).startsWith(q));
  const contains = list.filter(
    (r) => !starts.includes(r) && (fold(r.shortcut).includes(q) || fold(r.title).includes(q)),
  );
  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

/**
 * Variáveis aceitas no texto da mensagem rápida: {{nome}} e {{primeiro_nome}}.
 * Sem nome do contato, a variável sai junto com o espaço/vírgula que sobraria.
 */
export function fillVariables(content: string, contactName: string | null | undefined): string {
  const full = (contactName ?? '').trim();
  const first = full.split(/\s+/)[0] ?? '';
  const values: Record<string, string> = { nome: full, primeiro_nome: first };
  return content.replace(/(\s?)\{\{\s*(nome|primeiro_nome)\s*\}\}/g, (_m, space: string, key: string) => {
    const value = values[key];
    return value ? `${space}${value}` : '';
  });
}

/** Troca o "/atalho" pelo texto da mensagem rápida. */
export function applyQuickReply(
  text: string,
  match: SlashMatch,
  content: string,
): { text: string; caret: number } {
  return {
    text: text.slice(0, match.start) + content + text.slice(match.end),
    caret: match.start + content.length,
  };
}
