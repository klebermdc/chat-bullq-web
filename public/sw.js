// Service worker artesanal — precache do app-shell + runtime + Web Push.
//
// Parte de push adaptada de DeskcommCRM (https://github.com/melgarafael/DeskcommCRM),
// MIT License, Copyright (c) 2026 Rafael Melgaço. Origem: public/notify-sw.js.
const CACHE = 'bullq-shell-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Nunca cachear API (respostas autenticadas) nem cross-origin.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Navegações: network-first com fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
    );
    return;
  }

  // Estáticos same-origin: cache-first, atualizando em background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});

// ─── Web Push ────────────────────────────────────────────────────────────
// O servidor só manda push com o vendedor offline (Sendtur fechado). Payload:
// { title: nome do cliente, body: frase fixa, tag: 'conv:<id>', href }.
// Nunca leva o texto do cliente.
const PUSH_DEFAULT = { title: 'Sendtur', body: 'Novo aviso', tag: 'sendtur', href: '/inbox' };
const PUSH_ICON = '/icon-192.png';

function readPushData(event) {
  try {
    const data = event.data ? event.data.json() : {};
    return {
      title: (typeof data.title === 'string' && data.title) || PUSH_DEFAULT.title,
      body: typeof data.body === 'string' ? data.body : PUSH_DEFAULT.body,
      // Tag vazia com `renotify` lança — e aí nenhuma notificação aparece.
      tag: (typeof data.tag === 'string' && data.tag) || PUSH_DEFAULT.tag,
      href: (typeof data.href === 'string' && data.href) || PUSH_DEFAULT.href,
    };
  } catch {
    return PUSH_DEFAULT;
  }
}

async function isAppVisible() {
  try {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    return windows.some((c) => c.visibilityState === 'visible');
  } catch {
    return false;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const data = readPushData(event);
      // 2ª conferência: o servidor achou o vendedor offline, mas o app pode
      // estar à vista (socket caiu há pouco). Aí vale o som do próprio app.
      const visible = await isAppVisible();
      // Safari/iPhone revoga a inscrição de push que não vira notificação:
      // mostra sempre e, com o app à vista, fecha em seguida, calada.
      try {
        await self.registration.showNotification(data.title, {
          body: data.body,
          tag: data.tag,
          icon: PUSH_ICON,
          badge: PUSH_ICON,
          silent: visible,
          renotify: !visible,
          data: { href: data.href },
        });
      } catch {
        await self.registration.showNotification(data.title, { body: data.body });
      }
      if (!visible) return;
      try {
        const shown = await self.registration.getNotifications({ tag: data.tag });
        shown.forEach((n) => n.close());
      } catch {
        // sem getNotifications, o aviso calado fica na bandeja
      }
    })(),
  );
});

/** Só navega para o próprio site; qualquer outra coisa vira a caixa de entrada. */
function safeTarget(href) {
  const origin = self.location.origin;
  try {
    const target = new URL(href || PUSH_DEFAULT.href, origin);
    return target.origin === origin ? target.href : origin + PUSH_DEFAULT.href;
  } catch {
    return origin + PUSH_DEFAULT.href;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safeTarget(event.notification.data && event.notification.data.href);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target =
        windows.find((c) => c.focused) ||
        windows.find((c) => c.visibilityState === 'visible') ||
        windows[0];
      if (!target) return self.clients.openWindow(url);
      try {
        await target.focus();
      } catch {
        // foco recusado: ainda dá para navegar
      }
      try {
        await target.navigate(url);
      } catch {
        // janela não controlada por este SW: abre uma nova no destino
        await self.clients.openWindow(url);
      }
      return undefined;
    })(),
  );
});
