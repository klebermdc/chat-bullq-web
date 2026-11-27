/**
 * Atalhos pessoais da barra do compositor (ADM/Owner). Cada um é um botão que
 * põe um texto pronto no campo — não envia. Ficam em
 * `preferences.inbox.composerShortcuts`, que a API guarda por usuário e por
 * empresa: o atalho do Rafael só aparece para o Rafael.
 */

export const COMPOSER_SHORTCUT_LIMIT = 8;
export const SHORTCUT_LABEL_MAX = 40;
export const SHORTCUT_TEXT_MAX = 4096;

/** Ícones que o gestor pode escolher. O desenho de cada um fica no componente. */
export const SHORTCUT_ICONS = [
  'message',
  'star',
  'heart',
  'gift',
  'ticket',
  'hotel',
  'car',
  'map',
  'calendar',
  'credit-card',
  'info',
  'link',
] as const;

export type ShortcutIcon = (typeof SHORTCUT_ICONS)[number];

const DEFAULT_ICON: ShortcutIcon = 'message';

export interface ShortcutDraft {
  label: string;
  icon: ShortcutIcon;
  text: string;
}

export interface ComposerShortcut extends ShortcutDraft {
  id: string;
}

export type ShortcutResult =
  | { ok: true; shortcuts: ComposerShortcut[] }
  | { ok: false; error: string };

function isShortcutIcon(value: unknown): value is ShortcutIcon {
  return typeof value === 'string' && (SHORTCUT_ICONS as readonly string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Lê a preferência salva com segurança: descarta o que estiver torto. */
export function sanitizeComposerShortcuts(raw: unknown): ComposerShortcut[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const valid: ComposerShortcut[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { id, label, icon, text } = item as Record<string, unknown>;
    if (!isNonEmptyString(id) || seen.has(id)) continue;
    if (!isNonEmptyString(label) || !isNonEmptyString(text)) continue;
    seen.add(id);
    valid.push({ id, label, text, icon: isShortcutIcon(icon) ? icon : DEFAULT_ICON });
  }
  return valid.slice(0, COMPOSER_SHORTCUT_LIMIT);
}

/** Mensagem de erro para mostrar no formulário, ou null se está tudo certo. */
export function validateShortcutDraft(draft: ShortcutDraft): string | null {
  const label = draft.label.trim();
  if (!label) return 'Dê um nome ao atalho.';
  if (label.length > SHORTCUT_LABEL_MAX) return `O nome pode ter até ${SHORTCUT_LABEL_MAX} letras.`;
  const text = draft.text.trim();
  if (!text) return 'Escreva o texto que o atalho vai colocar no campo.';
  if (text.length > SHORTCUT_TEXT_MAX) return `O texto pode ter até ${SHORTCUT_TEXT_MAX} caracteres.`;
  return null;
}

function normalize(draft: ShortcutDraft): ShortcutDraft {
  return {
    label: draft.label.trim(),
    icon: isShortcutIcon(draft.icon) ? draft.icon : DEFAULT_ICON,
    text: draft.text.trim(),
  };
}

export function addComposerShortcut(
  list: readonly ComposerShortcut[],
  draft: ShortcutDraft,
  id: string,
): ShortcutResult {
  if (list.length >= COMPOSER_SHORTCUT_LIMIT) {
    return { ok: false, error: `Cabem até ${COMPOSER_SHORTCUT_LIMIT} atalhos. Exclua um para criar outro.` };
  }
  const error = validateShortcutDraft(draft);
  if (error) return { ok: false, error };
  return { ok: true, shortcuts: [...list, { id, ...normalize(draft) }] };
}

export function updateComposerShortcut(
  list: readonly ComposerShortcut[],
  id: string,
  draft: ShortcutDraft,
): ShortcutResult {
  const error = validateShortcutDraft(draft);
  if (error) return { ok: false, error };
  return {
    ok: true,
    shortcuts: list.map((s) => (s.id === id ? { id, ...normalize(draft) } : s)),
  };
}

export function removeComposerShortcut(list: readonly ComposerShortcut[], id: string): ComposerShortcut[] {
  return list.filter((s) => s.id !== id);
}
