'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '../stores/notification-store';
import { notificationsSettingsService, type Notification } from '@/features/settings/services/notifications.service';

export function NotificationBell() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const reset = useNotificationStore((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!open) return;
    notificationsSettingsService.list(1, 15).then((r) => {
      setItems(r.notifications);
      setUnreadCount(r.unreadCount);
    }).catch(() => {});
  }, [open, setUnreadCount]);

  const openItem = async (n: Notification) => {
    if (!n.isRead) { await notificationsSettingsService.markRead(n.id).catch(() => {}); }
    setUnreadCount(Math.max(0, unreadCount - (n.isRead ? 0 : 1)));
    const convId = (n.data as any)?.conversationId;
    setOpen(false);
    if (convId) router.push(`/inbox?conversationId=${convId}`);
  };

  const markAll = async () => {
    await notificationsSettingsService.markAllRead().catch(() => {});
    reset();
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
              <span className="text-sm font-semibold">Notificações</span>
              <button onClick={markAll} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-zinc-400">Nenhuma notificação</p>
              ) : items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-zinc-50 px-4 py-3 text-left hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50 ${!n.isRead ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{n.title}</span>
                  <span className="line-clamp-2 text-xs text-zinc-500">{n.body}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
