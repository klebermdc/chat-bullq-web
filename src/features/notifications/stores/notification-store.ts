import { create } from 'zustand';
import type { NotificationPreference } from '@/features/settings/services/notifications.service';

interface NotificationState {
  unreadCount: number;
  prefs: NotificationPreference[];
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
  reset: () => void;
  setPrefs: (p: NotificationPreference[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  prefs: [],
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  reset: () => set({ unreadCount: 0 }),
  setPrefs: (p) => set({ prefs: p }),
}));

/** Lê a pref de um tipo; default tudo-ligado quando ausente. */
export function prefFor(prefs: NotificationPreference[], type: string) {
  return prefs.find((p) => p.type === type) ?? {
    type, inApp: true, browserPush: true, sound: true, dndStart: null, dndEnd: null,
  };
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
