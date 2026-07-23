'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSocket } from '@/features/inbox/hooks/use-socket';
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

const BASE_TITLE = 'OFP Chat';

export function useNotificationListener() {
  const { on } = useSocket();
  const router = useRouter();
  const setPrefs = useNotificationStore((s) => s.setPrefs);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const prefsRef = useRef(useNotificationStore.getState().prefs);

  useEffect(() => useNotificationStore.subscribe((st) => { prefsRef.current = st.prefs; }), []);

  useEffect(() => {
    installSoundUnlock();
    notificationsSettingsService.getPreferences().then(setPrefs).catch(() => {});
    notificationsSettingsService.getUnreadCount().then(setUnreadCount).catch(() => {});
  }, [setPrefs, setUnreadCount]);

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
          const native = new Notification(n.title, { body: n.body, tag: convId });
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
