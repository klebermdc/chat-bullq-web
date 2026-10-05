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

  // Esc fecha o painel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const markAll = async () => {
    await notificationsSettingsService.markAllRead().catch(() => {});
    reset();
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
        title="Notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-semibold tabular-nums text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Notificações"
            className="absolute left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-elevated"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">Notificações</span>
              <button type="button" onClick={markAll} className="rounded text-xs font-medium text-primary hover:underline">Marcar todas como lidas</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui</p>
              ) : items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted ${!n.isRead ? 'bg-primary/5' : ''}`}
                >
                  <span className="flex w-full items-start gap-2 text-sm font-medium text-foreground">
                    <span className="min-w-0 flex-1">{n.title}</span>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">Não lida</span>
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
