'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSocket } from '@/features/inbox/hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { getActiveConversationId } from '@/lib/socket-active';
import { useNotificationStore, prefFor, isWithinDnd } from '../stores/notification-store';
import { installSoundUnlock, playNotifySound } from '../lib/sound';
import { notificationsSettingsService } from '@/features/settings/services/notifications.service';

interface IncomingNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: { conversationId?: string };
}

const BASE_TITLE = 'Sendtur';
const PREFS_RETRY_MS = 5_000;

export function useNotificationListener() {
  const { on } = useSocket();
  const router = useRouter();
  const setPrefs = useNotificationStore((s) => s.setPrefs);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const prefsRef = useRef(useNotificationStore.getState().prefs);
  const activeOrgId = useAuthStore((s) => s.activeOrgId);

  useEffect(() => useNotificationStore.subscribe((st) => { prefsRef.current = st.prefs; }), []);

  useEffect(() => {
    installSoundUnlock();
  }, []);

  // Recarrega por org (as prefs são por org) e re-tenta uma vez se falhar —
  // até lá vale o cache local, nunca o "tudo ligado".
  useEffect(() => {
    if (!activeOrgId) return;
    useNotificationStore.getState().loadCachedPrefs();
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = (attempt: number) => {
      notificationsSettingsService.getPreferences()
        .then((p) => { if (!cancelled) setPrefs(p); })
        .catch((err) => {
          console.warn('[notifications] falha ao carregar preferências', err);
          if (!cancelled && attempt === 0) retry = setTimeout(() => load(1), PREFS_RETRY_MS);
        });
    };
    load(0);
    notificationsSettingsService.getUnreadCount().then(setUnreadCount).catch(() => {});
    return () => { cancelled = true; if (retry) clearTimeout(retry); };
  }, [activeOrgId, setPrefs, setUnreadCount]);

  useEffect(() => {
    const apply = () => {
      const bg = document.visibilityState === 'hidden';
      document.title = bg && unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
    };
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, [unreadCount]);

  useEffect(() => {
    const off = on('notification:new', (n: IncomingNotification) => {
      const pref = prefFor(prefsRef.current, n.type);
      const dnd = isWithinDnd(pref.dndStart, pref.dndEnd);
      incrementUnread();

      const convId = n.data?.conversationId;
      const tabFocused = document.visibilityState === 'visible';
      const convOpen = !!convId && getActiveConversationId() === convId;
      const suppress = tabFocused && convOpen;

      if (!suppress && !dnd) {
        if (pref.sound) playNotifySound();
        if (pref.inApp) {
          toast(n.title, {
            description: n.body,
            action: convId
              ? { label: 'Abrir', onClick: () => router.push(`/inbox?conversationId=${convId}`) }
              : undefined,
          });
        }
        if (pref.browserPush && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          // `silent` evita o "plim" do sistema operacional quando o som está desligado.
          const native = new Notification(n.title, { body: n.body, tag: convId, silent: !pref.sound });
          native.onclick = () => {
            window.focus();
            if (convId) router.push(`/inbox?conversationId=${convId}`);
          };
        }
      }
    });
    return off;
  }, [on, incrementUnread, router]);
}
