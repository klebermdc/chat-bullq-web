import { create } from 'zustand';
import type { NotificationPreference } from '@/features/settings/services/notifications.service';

interface NotificationState {
  unreadCount: number;
  prefs: NotificationPreference[];
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
  reset: () => void;
  setPrefs: (p: NotificationPreference[]) => void;
  /** Troca de org: assume na hora o cache da org ativa (a rede vem depois). */
  loadCachedPrefs: () => void;
}

const PREFS_CACHE_PREFIX = 'notif_prefs_v1:';

function activeOrgId(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('active_org_id') : null;
  } catch {
    return null;
  }
}

/**
 * Última preferência que o servidor devolveu, guardada por org. Sem isso, um
 * GET que falha (rede, org ainda não resolvida no 1º load) deixava a lista
 * vazia e o `prefFor` voltava pro "tudo ligado" — o som "voltava sozinho".
 */
function readCachedPrefs(): NotificationPreference[] {
  const orgId = activeOrgId();
  if (!orgId) return [];
  try {
    const raw = localStorage.getItem(PREFS_CACHE_PREFIX + orgId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedPrefs(prefs: NotificationPreference[]) {
  const orgId = activeOrgId();
  if (!orgId) return;
  try {
    localStorage.setItem(PREFS_CACHE_PREFIX + orgId, JSON.stringify(prefs));
  } catch {
    /* storage bloqueado (aba anônima etc.) — segue só em memória */
  }
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  prefs: readCachedPrefs(),
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  reset: () => set({ unreadCount: 0 }),
  setPrefs: (p) => {
    writeCachedPrefs(p);
    set({ prefs: p });
  },
  loadCachedPrefs: () => set({ prefs: readCachedPrefs() }),
}));

/** true quando o usuário já salvou preferências e TODAS estão sem som. */
export function isAllSoundMuted(prefs: NotificationPreference[]): boolean {
  return prefs.length > 0 && prefs.every((p) => !p.sound);
}

/**
 * Lê a pref de um tipo. Tipo nunca salvo: segue o "silenciar tudo" do usuário
 * se ele silenciou todos os que salvou; senão, default tudo-ligado.
 */
export function prefFor(prefs: NotificationPreference[], type: string): NotificationPreference {
  const saved = prefs.find((p) => p.type === type);
  if (saved) return saved;
  return {
    type, inApp: true, browserPush: true, sound: !isAllSoundMuted(prefs), dndStart: null, dndEnd: null,
  };
}

/** Nova lista com `sound` aplicado a todos os tipos (cria os que faltam). */
export function withSoundForAll(
  prefs: NotificationPreference[],
  types: string[],
  sound: boolean,
): NotificationPreference[] {
  return types.map((type) => ({ ...prefFor(prefs, type), sound }));
}

/** true se agora está dentro da janela Não-Perturbe (HH:MM, cruza meia-noite). */
export function isWithinDnd(start: string | null, end: string | null, now = new Date()): boolean {
  if (!start || !end) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
}
