# Versão Mobile (PWA) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o Chat BullQ ótimo no celular (Inbox, Contatos, Dashboard) com navegação por bottom tab bar e transformá-lo num PWA instalável (manifest + service worker com offline shell), sem push.

**Architecture:** Adaptação puramente de apresentação sobre o app Next.js 16 / React 19 / Tailwind 4 existente. O breakpoint `lg` (1024px) é a fronteira desktop/mobile — tudo novo é gated em `< lg` (`lg:hidden` / `hidden lg:*`), garantindo zero regressão no desktop. Um estado global leve (zustand) coordena esconder a tab bar quando um chat está aberto. O inbox continua trocando lista↔chat por estado (`activeConversation`), sem novas rotas. O PWA é greenfield: `public/manifest.webmanifest` + `public/sw.js` registrado client-side.

**Tech Stack:** Next.js 16 (App Router, `output: standalone`), React 19, Tailwind CSS 4, Headless UI (`Dialog`), lucide-react, zustand, react-query, recharts. Service worker artesanal (sem `next-pwa`). `sharp` (devDependency) só para rasterizar ícones.

> **Nota sobre verificação (importante):** o projeto **não tem** runner de testes (sem jest/vitest no `package.json`) e o trabalho é majoritariamente CSS responsivo/layout. Conforme a spec aprovada, a verificação é: `npm run build` verde + `npm run lint` + inspeção manual por viewport (DevTools responsive) + checagem do PWA em DevTools → Application. Não fabricamos testes unitários vazios; onde há lógica isolável (registro do SW, aba ativa da tab bar), a verificação é comportamental no browser. Isto respeita a realidade do repo.

> **Convenção de commit:** cada task termina com um commit. Mensagens em pt-BR seguindo o padrão do repo (`feat(mobile): ...`, `feat(pwa): ...`). Trabalhar na branch `feat/mobile-pwa` (já criada, contém a spec).

> **Como rodar/verificar em cada task:**
> - Dev server: `npm run dev` (Turbopack) e abrir `http://localhost:3000`. Para inspecionar mobile: DevTools → toggle device toolbar (Cmd+Shift+M) → iPhone 12/13 (390×844).
> - Build de produção (SW só registra em prod): `npm run build && npm run start`.
> - Lint: `npm run lint`.

---

## File Structure

**Novos arquivos:**
- `public/icon.svg` — ícone base (quadrado, com padding maskable).
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — ícones rasterizados.
- `public/manifest.webmanifest` — manifest do PWA.
- `public/sw.js` — service worker (precache app-shell + runtime fetch).
- `scripts/gen-icons.mjs` — script one-shot que rasteriza os PNGs a partir do SVG (usa `sharp`).
- `src/components/pwa/service-worker-register.tsx` — client component que registra `/sw.js`.
- `src/components/ui/bottom-sheet.tsx` — sheet mobile reutilizável (sobre Headless UI `Dialog`).
- `src/stores/mobile-chrome-store.ts` — zustand store: flag `hideTabBar` (esconder tab bar dentro do chat).
- `src/components/layout/mobile-tab-bar.tsx` — bottom tab bar (Inbox/Contatos/Painel/Mais).
- `src/components/layout/mobile-more-sheet.tsx` — sheet do botão "Mais" (reusa navegação + org/logout).

**Modificados:**
- `src/app/layout.tsx` — metadata PWA (viewport, theme-color, manifest, apple tags) + montar `ServiceWorkerRegister`.
- `src/app/(dashboard)/layout.tsx` — montar `MobileTabBar`.
- `src/app/(dashboard)/inbox/page.tsx` — troca lista↔chat single-panel no mobile + setar `hideTabBar`.
- `src/features/inbox/components/conversation-list.tsx` — `w-full lg:w-80`; faixa de filtros/abas rolável.
- `src/features/inbox/components/chat-panel.tsx` — passar `onBack` p/ header.
- `src/features/inbox/components/conversation-header.tsx` — botão voltar (mobile) + colapsar ações num bottom sheet no mobile.
- `src/features/inbox/components/chat-input.tsx` — alvos de toque ≥ 44px + safe-area.
- `src/features/inbox/components/agent-runs-sidebar.tsx` e `project-panel.tsx` — overlay full-screen no mobile.
- `src/app/(dashboard)/settings/contacts/page.tsx` — tabela vira lista de cards no mobile.
- `src/app/(dashboard)/dashboard/page.tsx` — grid empilha + espaçamento p/ tab bar.

---

## FASE A — PWA shell (independente, seguro)

### Task 1: Ícones + manifest

**Files:**
- Create: `public/icon.svg`
- Create: `scripts/gen-icons.mjs`
- Create: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (gerados)
- Create: `public/manifest.webmanifest`
- Modify: `package.json` (devDependency `sharp` + script `gen:icons`)

- [ ] **Step 1: Criar o SVG base** — `public/icon.svg` (quadrado 512, fundo primário sólido pra maskable, com padding seguro ~12%):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1b2a4a"/>
  <path d="M160 176a24 24 0 0 1 24-24h144a24 24 0 0 1 24 24v96a24 24 0 0 1-24 24h-92l-52 44v-44h-0a24 24 0 0 1-24-24z" fill="#ffffff"/>
</svg>
```

> Cor `#1b2a4a` aproxima o `--color-primary` (`oklch(0.205 0.08 265)`). Ajuste fino do desenho é livre; o importante é ser quadrado, legível em 192px e com margem pra máscara.

- [ ] **Step 2: Adicionar `sharp` e script no `package.json`**

```bash
npm install --save-dev sharp
```

Depois, em `package.json` → `"scripts"`, adicionar:

```json
"gen:icons": "node scripts/gen-icons.mjs"
```

- [ ] **Step 3: Criar `scripts/gen-icons.mjs`**

```js
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url));

const targets = [
  { out: 'public/icon-192.png', size: 192 },
  { out: 'public/icon-512.png', size: 512 },
  { out: 'public/apple-touch-icon.png', size: 180 },
];

for (const { out, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log('wrote', out);
}
```

- [ ] **Step 4: Gerar os PNGs**

Run: `npm run gen:icons`
Expected (stdout):
```
wrote public/icon-192.png
wrote public/icon-512.png
wrote public/apple-touch-icon.png
```

- [ ] **Step 5: Criar `public/manifest.webmanifest`**

```json
{
  "name": "Chat BullQ",
  "short_name": "BullQ",
  "description": "Atendimento omnichannel",
  "start_url": "/inbox",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#1b2a4a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 6: Verificar** — Run: `npm run dev`, abrir `http://localhost:3000/manifest.webmanifest` no browser.
Expected: o JSON é servido corretamente. Abrir `/icon-192.png` mostra o ícone.

- [ ] **Step 7: Commit**

```bash
git add public/icon.svg public/icon-192.png public/icon-512.png public/apple-touch-icon.png public/manifest.webmanifest scripts/gen-icons.mjs package.json package-lock.json
git commit -m "feat(pwa): ícones e manifest do app"
```

---

### Task 2: Metadata PWA no root layout + registro do SW

**Files:**
- Create: `src/components/pwa/service-worker-register.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Criar `src/components/pwa/service-worker-register.tsx`**

```tsx
'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker em produção (best-effort). Falha silenciosa em
 * navegadores sem suporte — o app funciona normal (progressive enhancement).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registro falhou — sem PWA, mas o app segue funcionando.
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
```

- [ ] **Step 2: Atualizar `src/app/layout.tsx`** — adicionar `viewport`, `themeColor`, `manifest`, apple tags e montar o registrador. Substituir o conteúdo por:

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chat BullQ',
  description: 'Omnichannel customer service platform',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Chat BullQ',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1b2a4a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className="bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950"
    >
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
```

> Nota: Next 16 não suporta `interactive-widget` no objeto `Viewport` tipado; se necessário, ele pode ser adicionado depois via `<meta>` cru. `viewportFit: 'cover'` já habilita as safe-areas.

- [ ] **Step 3: Verificar build/typecheck** — Run: `npm run build`
Expected: build conclui sem erros de tipo. (O SW ainda não existe, mas só é buscado em runtime prod — build não quebra.)

- [ ] **Step 4: Verificar metadata** — Run: `npm run dev`, abrir `http://localhost:3000`, ver no `<head>` (DevTools → Elements) as tags `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-capable">`.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/components/pwa/service-worker-register.tsx
git commit -m "feat(pwa): metadata (manifest/theme/apple) e registro do service worker"
```

---

### Task 3: Service worker (app-shell + offline)

**Files:**
- Create: `public/sw.js`

- [ ] **Step 1: Criar `public/sw.js`**

```js
// Service worker artesanal — precache do app-shell + runtime.
// SEM push nesta fase (fase 2 adiciona 'push'/'notificationclick' aqui).
const CACHE = 'bullq-shell-v1';
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
        .catch(() => cached);
      return cached || network;
    }),
  );
});
```

- [ ] **Step 2: Criar a página de fallback offline** — `public/offline.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sem conexão — Chat BullQ</title>
    <style>
      body { font-family: system-ui, sans-serif; display: flex; min-height: 100vh; margin: 0;
             align-items: center; justify-content: center; background: #f4f4f5; color: #3f3f46; }
      .box { text-align: center; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { font-size: 14px; color: #71717a; margin: 0; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Você está offline</h1>
      <p>Reconecte para continuar o atendimento.</p>
    </div>
  </body>
</html>
```

- [ ] **Step 3: Adicionar `offline.html` ao PRECACHE** — já está incluído no array `PRECACHE` do Step 1. Confirmar.

- [ ] **Step 4: Verificar** — Run: `npm run build && npm run start`, abrir `http://localhost:3000` em produção. DevTools → Application → Service Workers: deve mostrar `sw.js` **activated and running**. Application → Cache Storage: `bullq-shell-v1` com os 3 itens do precache.
Depois, DevTools → Network → marcar "Offline" → navegar para uma rota nova: deve exibir a página `offline.html`.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js public/offline.html
git commit -m "feat(pwa): service worker com app-shell e fallback offline"
```

---

## FASE B — Primitivos mobile compartilhados

### Task 4: Componente `BottomSheet`

**Files:**
- Create: `src/components/ui/bottom-sheet.tsx`

- [ ] **Step 1: Criar `src/components/ui/bottom-sheet.tsx`** — wrapper sobre Headless UI `Dialog` (já é dependência), com scrim, grab handle, subida animada, fecha por scrim/Esc, respeita safe-area:

```tsx
'use client';

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Folha inferior mobile. Usada no menu de ações do chat, no "Mais" da tab bar
 * e no painel de filtros. Só faz sentido em telas pequenas, mas não se
 * auto-limita — quem chama decide quando abrir (tipicamente < lg).
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      />
      <div className="fixed inset-x-0 bottom-0 flex justify-center">
        <DialogPanel
          transition
          className="w-full max-w-lg rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl transition duration-200 ease-out data-[closed]:translate-y-full dark:bg-zinc-900"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          {title && (
            <div className="px-4 pb-2 pt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </div>
          )}
          <div className="max-h-[75vh] overflow-y-auto pb-2">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar typecheck** — Run: `npm run build`
Expected: sem erros. (Componente ainda não usado — só compila.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx
git commit -m "feat(mobile): componente BottomSheet reutilizável"
```

---

### Task 5: Store para esconder a tab bar dentro do chat

**Files:**
- Create: `src/stores/mobile-chrome-store.ts`

- [ ] **Step 1: Criar `src/stores/mobile-chrome-store.ts`**

```ts
import { create } from 'zustand';

/**
 * Coordena o "chrome" mobile entre telas irmãs sob o dashboard layout.
 * Hoje: esconder a bottom tab bar quando um chat ocupa a tela inteira.
 * A InboxPage seta hideTabBar=true ao abrir uma conversa (mobile) e volta
 * a false ao voltar pra lista / desmontar.
 */
interface MobileChromeState {
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
}

export const useMobileChrome = create<MobileChromeState>((set) => ({
  hideTabBar: false,
  setHideTabBar: (hide) => set({ hideTabBar: hide }),
}));
```

- [ ] **Step 2: Verificar typecheck** — Run: `npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/stores/mobile-chrome-store.ts
git commit -m "feat(mobile): store para controlar visibilidade da tab bar"
```

---

### Task 6: Bottom tab bar + sheet "Mais" + montagem

**Files:**
- Create: `src/components/layout/mobile-more-sheet.tsx`
- Create: `src/components/layout/mobile-tab-bar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Criar `src/components/layout/mobile-more-sheet.tsx`** — reusa navegação secundária + org/logout dentro do `BottomSheet`:

```tsx
'use client';

import Link from 'next/link';
import { LayoutDashboard, FolderKanban, Zap, Bot, GitBranch, Settings, LogOut, Building2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useAuthStore } from '@/stores/auth-store';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { href: '/ai-agents', label: 'Jarvis (IA)', icon: Bot },
  { href: '/projects', label: 'Projetos', icon: FolderKanban },
  { href: '/automations', label: 'Automações', icon: Zap },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function MobileMoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, organizations, activeOrgId, setActiveOrg, logout } = useAuthStore();
  const activeOrg = organizations.find((o) => o.id === activeOrgId);

  const rowCls =
    'flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800';

  return (
    <BottomSheet open={open} onClose={onClose} title="Menu">
      {organizations.length > 1 && (
        <div className="border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <div className="px-4 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Organização
          </div>
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                setActiveOrg(org.id);
                window.location.reload();
              }}
              className={`${rowCls} w-full text-left ${org.id === activeOrgId ? 'font-semibold text-primary' : ''}`}
            >
              <Building2 className="size-5" />
              {org.name}
            </button>
          ))}
        </div>
      )}

      {links.map((l) => (
        <Link key={l.href} href={l.href} onClick={onClose} className={rowCls}>
          <l.icon className="size-5" />
          {l.label}
        </Link>
      ))}

      <button onClick={() => { onClose(); logout(); }} className={`${rowCls} w-full text-left text-red-600 dark:text-red-400`}>
        <LogOut className="size-5" />
        Sair {user?.email ? `(${user.email})` : ''}
      </button>
      <div className="px-4 pb-2 pt-1 text-[11px] text-zinc-400">{activeOrg?.name}</div>
    </BottomSheet>
  );
}
```

> Confira os `href` contra as rotas reais em `src/app/(dashboard)/` (dashboard, pipelines, ai-agents, projects, automations, settings). Ajuste labels/ícones se necessário — a fonte de verdade é a navegação do `AppSidebar`.

- [ ] **Step 2: Criar `src/components/layout/mobile-tab-bar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, BarChart3, MoreHorizontal } from 'lucide-react';
import { useMobileChrome } from '@/stores/mobile-chrome-store';
import { MobileMoreSheet } from './mobile-more-sheet';

const tabs = [
  { href: '/inbox', label: 'Inbox', icon: MessageSquare, match: (p: string) => p.startsWith('/inbox') },
  { href: '/settings/contacts', label: 'Contatos', icon: Users, match: (p: string) => p.startsWith('/settings/contacts') },
  { href: '/dashboard', label: 'Painel', icon: BarChart3, match: (p: string) => p.startsWith('/dashboard') },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const hideTabBar = useMobileChrome((s) => s.hideTabBar);
  const [moreOpen, setMoreOpen] = useState(false);

  if (hideTabBar) return null;

  const itemCls = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${
      active ? 'text-primary' : 'text-zinc-400 dark:text-zinc-500'
    }`;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link key={t.href} href={t.href} className={itemCls(active)}>
              <t.icon className="size-5" />
              {t.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={itemCls(false)}>
          <MoreHorizontal className="size-5" />
          Mais
        </button>
      </nav>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
```

> Badge de não-lidas no ícone do Inbox: adiar para depois da Task 8 (fonte de contagem vem das queries do inbox). Deixe sem badge nesta task — é aditivo.

- [ ] **Step 3: Montar no dashboard layout** — em `src/app/(dashboard)/layout.tsx`, importar e renderizar a tab bar dentro do `SidebarLayout`. Adicionar o import no topo:

```tsx
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
```

E, no `return`, envolver o conteúdo para incluir a tab bar (substituir o bloco `<div className="flex h-full flex-col">...`):

```tsx
      <div className="flex h-full flex-col">
        <ToolFailureBanner />
        <div className="flex-1 min-h-0 pb-14 lg:pb-0">{children}</div>
      </div>
      <MobileTabBar />
```

> `pb-14` reserva espaço pro conteúdo não ficar atrás da tab bar no mobile; `lg:pb-0` remove no desktop. O `MobileTabBar` fica fora do fluxo (fixed), então pode ser irmão do `<div>`.

- [ ] **Step 4: Verificar** — Run: `npm run dev`, abrir `http://localhost:3000/inbox` em viewport mobile (390px).
Expected: tab bar fixa no rodapé com Inbox/Contatos/Painel/Mais; aba ativa em cor primária; tocar "Mais" abre o bottom sheet com navegação/org/logout; tocar "Contatos" navega para `/settings/contacts`. Em viewport desktop (`≥ lg`): tab bar **não aparece**.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/mobile-tab-bar.tsx src/components/layout/mobile-more-sheet.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "feat(mobile): bottom tab bar de navegação e sheet Mais"
```

---

## FASE C — Inbox mobile

### Task 7: Lista de conversas full-width no mobile

**Files:**
- Modify: `src/features/inbox/components/conversation-list.tsx`

- [ ] **Step 1: Tornar a largura responsiva** — na raiz do componente (linha ~1013) trocar `w-80` por `w-full lg:w-80`:

```tsx
<div className="flex h-full w-full lg:w-80 flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
```

- [ ] **Step 2: Tornar a faixa de filtros/abas rolável no mobile** — localizar o contêiner dos chips de filtro/abas (por volta da linha ~1205, `<div className="flex flex-wrap gap-1.5 px-3 pb-2">`) e trocar `flex-wrap` por rolagem horizontal sem quebra no mobile:

```tsx
<div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible">
```

> Objetivo: no mobile os chips de aba (Esperando/Entrada/Finalizados) e filtros rolam na horizontal em vez de empilhar e comer altura. No desktop mantém `flex-wrap`. Se houver mais de um contêiner de chips, aplicar o mesmo padrão a cada um. Garanta que cada chip tenha `shrink-0` (adicionar se faltar) para não espremer.

- [ ] **Step 3: Verificar** — Run: `npm run dev`, viewport mobile em `/inbox`.
Expected: a lista ocupa 100% da largura; a faixa de abas/filtros rola horizontalmente. Viewport desktop: lista com 320px (`w-80`) e chips em `flex-wrap`, idêntico ao anterior.

- [ ] **Step 4: Commit**

```bash
git add src/features/inbox/components/conversation-list.tsx
git commit -m "feat(mobile): lista de conversas full-width e faixa de filtros rolável"
```

---

### Task 8: InboxPage — troca lista↔chat single-panel

**Files:**
- Modify: `src/app/(dashboard)/inbox/page.tsx`

- [ ] **Step 1: Importar a store** — no topo de `inbox/page.tsx` adicionar:

```tsx
import { useMobileChrome } from '@/stores/mobile-chrome-store';
```

- [ ] **Step 2: Esconder a tab bar quando há conversa aberta** — dentro do componente `InboxPage`, após os hooks de estado existentes, adicionar:

```tsx
  const setHideTabBar = useMobileChrome((s) => s.setHideTabBar);
  useEffect(() => {
    // No mobile, o chat ocupa a tela inteira — a tab bar sai de cena.
    // O gate visual é por CSS (lg:hidden na tab bar); aqui só controlamos
    // o estado. Ao voltar pra lista (activeConversation=null) ou desmontar,
    // a tab bar reaparece.
    setHideTabBar(!!activeConversation);
    return () => setHideTabBar(false);
  }, [activeConversation, setHideTabBar]);
```

- [ ] **Step 3: Mostrar um painel por vez no mobile** — alterar o JSX de retorno para que a lista e a área de chat/empty alternem por breakpoint conforme `activeConversation`. Substituir o `return (...)` final por:

```tsx
  return (
    <div className="flex h-full">
      {/* Lista: some no mobile quando há conversa aberta; sempre visível no desktop */}
      <div className={`${activeConversation ? 'hidden lg:flex' : 'flex'} h-full w-full lg:w-auto`}>
        <ConversationList
          activeId={activeConversation?.id || null}
          onSelect={setActiveConversation}
          viewId={viewId}
        />
      </div>

      {activeConversation ? (
        <>
          <ChatPanel
            key={activeConversation.id}
            conversation={activeConversation}
            onConversationUpdate={handleConversationUpdate}
            onToggleAgentLogs={toggleAgentLogs}
            agentLogsOpen={agentLogsOpen}
            onToggleProject={toggleProjectPanel}
            projectOpen={projectPanelOpen}
            onBack={() => setActiveConversation(null)}
          />
          {agentLogsOpen && (
            <AgentRunsSidebar
              key={`logs-${activeConversation.id}`}
              conversationId={activeConversation.id}
              onClose={toggleAgentLogs}
            />
          )}
          {projectPanelOpen && activeConversation.isGroup && (
            <ProjectPanel
              key={`project-${activeConversation.id}`}
              conversationId={activeConversation.id}
              onClose={toggleProjectPanel}
            />
          )}
        </>
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 lg:flex">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-zinc-700 dark:text-zinc-300">Chat BullQ</h2>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">Selecione uma conversa para começar</p>
        </div>
      )}
    </div>
  );
```

> Mudanças-chave: (1) a lista é envolvida num `<div>` que vira `hidden lg:flex` quando há conversa aberta (mobile mostra só o chat). (2) o estado-vazio ("Selecione uma conversa") vira `hidden ... lg:flex` — no mobile não faz sentido, pois sem conversa o usuário vê a lista em tela cheia. (3) `onBack` é passado ao `ChatPanel` (implementado na Task 9).

- [ ] **Step 4: Verificar** — Run: `npm run dev`, viewport mobile `/inbox`.
Expected: sem conversa → só a lista (tela cheia), tab bar visível. Tocar numa conversa → só o chat (tela cheia), tab bar some. Viewport desktop: lista + chat lado a lado como antes; sem conversa mostra o estado-vazio.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/inbox/page.tsx"
git commit -m "feat(mobile): inbox alterna lista e chat em painel único"
```

---

### Task 9: Header do chat — voltar + ações em bottom sheet no mobile

**Files:**
- Modify: `src/features/inbox/components/chat-panel.tsx`
- Modify: `src/features/inbox/components/conversation-header.tsx`

- [ ] **Step 1: Propagar `onBack` no ChatPanel** — em `chat-panel.tsx`, adicionar `onBack?: () => void` à interface de props do componente (junto de `onToggleAgentLogs` etc.) e repassá-lo ao `<ConversationHeader ... onBack={onBack} />` (render por volta da linha 674). Ex.: na desestruturação de props do `ChatPanel`, incluir `onBack`, e no JSX:

```tsx
      <ConversationHeader
        conversation={conversation}
        onUpdate={onConversationUpdate}
        onToggleAgentLogs={onToggleAgentLogs}
        agentLogsOpen={agentLogsOpen}
        onToggleProject={onToggleProject}
        projectOpen={projectOpen}
        onBack={onBack}
      />
```

- [ ] **Step 2: Adicionar `onBack` à interface do header** — em `conversation-header.tsx`, na `interface ConversationHeaderProps`, adicionar:

```tsx
  /** Mobile: volta para a lista de conversas. */
  onBack?: () => void;
```

E incluir `onBack` na desestruturação de props de `ConversationHeader`.

- [ ] **Step 3: Botão voltar (só mobile) + agrupar ações num "⋯" no mobile** — em `conversation-header.tsx`:

(a) Importar os ícones do menu e o `BottomSheet` e `useState` já disponível:

```tsx
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
```

(b) Adicionar estado do sheet dentro do componente:

```tsx
  const [actionsOpen, setActionsOpen] = useState(false);
```

(c) Antes do `<HeaderAvatar ... />`, dentro do primeiro `<div className="flex items-center gap-3">`, adicionar o botão voltar visível só no mobile:

```tsx
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="-ml-1 mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
```

(d) Envolver a barra de ações existente (o `<div className="flex items-center gap-1.5">...</div>`) para que só apareça a partir de `lg`, e adicionar um botão "⋯" só no mobile que abre o sheet. Trocar a abertura desse div por:

```tsx
      <div className="hidden items-center gap-1.5 lg:flex">
```

E, logo após o fechamento desse `</div>` de ações, adicionar o gatilho mobile + o sheet:

```tsx
      <button
        onClick={() => setActionsOpen(true)}
        aria-label="Ações"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      <BottomSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title="Ações da conversa">
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-zinc-700 dark:text-zinc-200">IA automática</span>
            <ConversationAiToggle
              conversation={conversation}
              disabled={isLoading}
              onChange={async (next) => {
                await handleAction(
                  () => inboxService.toggleAi(conversation.id, next),
                  next === null ? 'IA voltou pro padrão' : next ? 'IA forçada nesta conversa' : 'IA pausada',
                );
              }}
              onEngage={async () => {
                await handleAction(async () => {
                  const result = await inboxService.engageAi(conversation.id);
                  if (!result.engaged) throw new Error(result.reason ? `IA não engajou: ${result.reason}` : 'Falha ao engajar');
                  return result;
                }, 'IA engajada');
              }}
            />
          </div>
          {conversation.status !== 'CLOSED' && (
            <button
              onClick={() => { setActionsOpen(false); handleAction(() => inboxService.closeConversation(conversation.id), 'Conversa encerrada'); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <XCircle className="h-5 w-5" /> Encerrar conversa
            </button>
          )}
          {conversation.status === 'CLOSED' && (
            <button
              onClick={() => { setActionsOpen(false); handleAction(() => inboxService.reopenConversation(conversation.id), 'Conversa reaberta'); }}
              className="flex items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <RotateCcw className="h-5 w-5" /> Reabrir conversa
            </button>
          )}
          {onToggleProject && conversation.isGroup && (
            <button onClick={() => { setActionsOpen(false); onToggleProject(); }} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <FolderKanban className="h-5 w-5" /> Projeto do grupo
            </button>
          )}
          {onToggleAgentLogs && (
            <button onClick={() => { setActionsOpen(false); onToggleAgentLogs(); }} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <Activity className="h-5 w-5" /> Logs do agente
            </button>
          )}
          <button onClick={() => { setActionsOpen(false); handleSync(); }} className="flex items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <RefreshCw className="h-5 w-5" /> Sincronizar mensagens
          </button>
        </div>
      </BottomSheet>
```

> Escopo pragmático: no sheet mobile expomos as ações de alto valor que são simples botões (IA, encerrar/reabrir, projeto, logs, sincronizar). As ações que dependem de popovers ricos (`AssignmentPopover`, `PipelinePopover`, `AgentPinPopover`) permanecem **só no desktop** nesta primeira entrega — elas abrem popovers ancorados que não foram desenhados pra sheet. "Atribuir" e "Pipeline" via mobile ficam como follow-up (aditivo). Isto é uma decisão consciente de escopo, não um esquecimento: registre no PR.

- [ ] **Step 4: Verificar** — Run: `npm run dev`, viewport mobile, abrir uma conversa.
Expected: header mostra `‹ voltar` à esquerda e `⋯` à direita; a barra desktop de botões não aparece. Tocar `⋯` abre o sheet com IA/Encerrar/Projeto/Logs/Sincronizar. Tocar `‹` volta pra lista. Viewport desktop: header idêntico ao original (voltar e `⋯` escondidos, barra completa visível).

- [ ] **Step 5: Verificar build** — Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add src/features/inbox/components/chat-panel.tsx src/features/inbox/components/conversation-header.tsx
git commit -m "feat(mobile): header do chat com voltar e ações em bottom sheet"
```

---

### Task 10: Composer touch-friendly + safe-area

**Files:**
- Modify: `src/features/inbox/components/chat-input.tsx`

- [ ] **Step 1: Aumentar alvos de toque e respeitar safe-area** — no modo IDLE (o `return` final, contêiner por volta da linha 193), trocar o wrapper externo para incluir safe-area no rodapé, e aumentar os botões de anexo/mic/enviar para ≥ 44px no mobile.

(a) Contêiner externo — trocar:
```tsx
    <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
```
por:
```tsx
    <div className="border-t border-zinc-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-950">
```

(b) Botão de anexo — trocar `className="mb-1 rounded-lg p-2 ...` por alvo maior no mobile:
```tsx
          className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800 lg:mb-1 lg:h-auto lg:w-auto lg:p-2"
```

(c) Botão de mic — trocar `className="mb-1 rounded-lg bg-zinc-100 p-2.5 ...` por:
```tsx
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 lg:mb-1 lg:h-auto lg:w-auto lg:p-2.5"
```

(d) Botão de enviar — trocar `className="mb-1 rounded-lg bg-primary p-2.5 ...` por:
```tsx
            className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 lg:mb-1 lg:h-auto lg:w-auto lg:p-2.5"
```

> Os ícones internos (`h-5 w-5`) permanecem. No desktop (`lg:`) o padding original é restaurado, mantendo o visual atual.

- [ ] **Step 2: Verificar** — Run: `npm run dev`, viewport mobile numa conversa.
Expected: botões de anexo/mic/enviar com ~44px (fáceis de tocar); o composer respeita a safe-area inferior (não fica colado na borda em iPhone com home indicator). Desktop inalterado.

- [ ] **Step 3: Commit**

```bash
git add src/features/inbox/components/chat-input.tsx
git commit -m "feat(mobile): composer com alvos de toque maiores e safe-area"
```

---

### Task 11: Painéis auxiliares em overlay full-screen no mobile

**Files:**
- Modify: `src/features/inbox/components/agent-runs-sidebar.tsx`
- Modify: `src/features/inbox/components/project-panel.tsx`

- [ ] **Step 1: `agent-runs-sidebar.tsx` — overlay no mobile** — localizar a raiz do componente (o `<aside>`/`<div>` de largura fixa) e torná-lo full-screen sobreposto abaixo de `lg`, mantendo a coluna no desktop. Padrão a aplicar na classe raiz:

```tsx
className="fixed inset-0 z-50 flex w-full flex-col bg-white dark:bg-zinc-950 lg:static lg:inset-auto lg:z-auto lg:w-96 lg:border-l lg:border-zinc-200 dark:lg:border-zinc-800"
```

> Objetivo: no mobile o painel cobre a tela (com seu próprio header + botão fechar, que já existem via `onClose`); no desktop continua coluna lateral. Ajuste a largura `lg:w-96` para o valor atual do componente se for diferente (leia a classe existente e preserve o número).

- [ ] **Step 2: `project-panel.tsx` — overlay no mobile** — mesmo padrão na raiz do `ProjectPanel`:

```tsx
className="fixed inset-0 z-50 flex w-full flex-col bg-white dark:bg-zinc-950 lg:static lg:inset-auto lg:z-auto lg:w-96 lg:border-l lg:border-zinc-200 dark:lg:border-zinc-800"
```

> Preserve a largura `lg:` original do componente. Confirme que ambos têm um botão de fechar visível no header (usam `onClose`); se o header não aparecer no mobile, garanta que ele não esteja escondido por classe.

- [ ] **Step 3: Verificar** — Run: `npm run dev`, viewport mobile, abrir uma conversa → `⋯` → "Logs do agente".
Expected: o painel de logs cobre a tela inteira com botão de fechar; fechar volta ao chat. Idem para "Projeto do grupo" (em conversa de grupo). Desktop: ambos aparecem como coluna lateral, como antes.

- [ ] **Step 4: Commit**

```bash
git add src/features/inbox/components/agent-runs-sidebar.tsx src/features/inbox/components/project-panel.tsx
git commit -m "feat(mobile): painéis de logs e projeto em overlay full-screen"
```

---

## FASE D — Contatos + Dashboard

### Task 12: Contatos como cards no mobile

**Files:**
- Modify: `src/app/(dashboard)/settings/contacts/page.tsx`

- [ ] **Step 1: Reduzir o padding externo no mobile** — trocar o contêiner raiz `p-6`:
```tsx
    <div className="flex h-full flex-col min-h-0 min-w-0 p-6">
```
por:
```tsx
    <div className="flex h-full flex-col min-h-0 min-w-0 p-4 lg:p-6">
```

- [ ] **Step 2: Esconder a tabela no mobile** — na `<table>` do cabeçalho fixo e na `<table>` do corpo, e/ou no contêiner que as agrupa, adicionar `hidden lg:*`. O contêiner do cabeçalho fixo (`<table className="w-full table-fixed shrink-0">`) vira:
```tsx
        <table className="hidden w-full table-fixed shrink-0 lg:table">
```
E o `<div className="flex-1 overflow-y-auto min-h-0">` que contém a tabela do corpo — deixar a tabela interna oculta no mobile:
```tsx
          <table className="hidden w-full table-fixed lg:table">
```

- [ ] **Step 3: Adicionar a lista de cards (mobile)** — logo após o `<div className="flex-1 overflow-y-auto min-h-0">` de abertura (antes da `<table>` do corpo), inserir a lista de cards visível só no mobile:

```tsx
          {/* Cards no mobile */}
          <div className="flex flex-col gap-2 p-3 lg:hidden">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              ))
            ) : contacts.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-700" />
                <p className="mt-3 text-sm text-zinc-500">Nenhum contato encontrado</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {(contact.name || '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {contact.name || 'Sem nome'}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {contact.phone || contact.email || '—'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {contact._count?.conversations || 0} conv.
                    </span>
                  </div>
                  {(contact.channels.length > 0 || contact.tags.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {contact.channels.map((ch) => {
                        const Icon = channelIcons[ch.channel.type] || MessageSquare;
                        return (
                          <span key={ch.id} className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
                            <Icon className="h-3 w-3" />
                            <span className="max-w-24 truncate">{ch.channel.name}</span>
                          </span>
                        );
                      })}
                      {contact.tags.map((t) => (
                        <span key={t.tag.id} className="max-w-24 truncate rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: t.tag.color }}>
                          {t.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
```

> A lista de cards reusa as mesmas variáveis (`contacts`, `isLoading`, `channelIcons`, `MessageSquare`, `Users`) já importadas/definidas no arquivo. Nada novo a importar.

- [ ] **Step 4: Verificar** — Run: `npm run dev`, viewport mobile em `/settings/contacts`.
Expected: os contatos aparecem como cards empilhados (avatar, nome, telefone/email, contagem de conversas, canais/tags); a busca continua no topo; o botão "Novo contato" funciona. Desktop: tabela idêntica ao original.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/settings/contacts/page.tsx"
git commit -m "feat(mobile): contatos em lista de cards no mobile"
```

---

### Task 13: Dashboard empilhado + espaço p/ tab bar

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Empilhar os grids em 1 coluna no mobile** — localizar cada uso de `grid-cols-N` fixo (ex.: `grid-cols-2`, `grid-cols-3`, `grid-cols-4`) nos grids de KPIs/cards e prefixá-los com `grid-cols-1` + breakpoints. Padrão:
  - `grid grid-cols-4 gap-4` → `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`
  - `grid grid-cols-3 ...` → `grid grid-cols-1 ... sm:grid-cols-2 lg:grid-cols-3`
  - `grid grid-cols-2 ...` → `grid grid-cols-1 ... sm:grid-cols-2`

Aplicar em todos os grids de cards da página (rode `grep -n "grid-cols" src/app/(dashboard)/dashboard/page.tsx` para localizar cada um).

- [ ] **Step 2: Garantir scroll vertical e folga pra tab bar** — o contêiner raiz da página deve permitir rolagem e ter folga inferior no mobile. Se a raiz for algo como `<div className="... p-6">`, ajustar para `p-4 lg:p-6` e garantir `overflow-y-auto`. Se já houver um wrapper com scroll, apenas adicionar `pb-4 lg:pb-6`. (O `pb-14` global do dashboard layout já reserva o espaço da tab bar; aqui é só evitar corte de conteúdo.)

- [ ] **Step 3: Conferir os gráficos recharts** — os gráficos já usam `ResponsiveContainer` (confirmado no import). Garantir que cada `ResponsiveContainer` tenha `width="100%"` e uma `height` fixa (ex.: `height={220}`) — se algum depender de altura do pai, definir `height={200}` no mobile via prop condicional não é necessário; basta uma altura fixa razoável. Se algum bloco de gráfico transbordar horizontalmente, envolvê-lo em `<div className="overflow-x-auto">`.

- [ ] **Step 4: Verificar** — Run: `npm run dev`, viewport mobile `/dashboard`.
Expected: cards empilham em 1 coluna; gráficos cabem na largura sem overflow horizontal; a página rola verticalmente e o último card não fica atrás da tab bar. Desktop: layout multi-coluna idêntico ao original.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(mobile): dashboard empilhado e responsivo no mobile"
```

---

## FASE E — Verificação final

### Task 14: Build, lint e checklist de verificação manual

**Files:** nenhum (verificação)

- [ ] **Step 1: Lint** — Run: `npm run lint`
Expected: sem erros (warnings pré-existentes tolerados; não introduzir novos).

- [ ] **Step 2: Build de produção** — Run: `npm run build`
Expected: build conclui sem erros de tipo.

- [ ] **Step 3: Rodar em produção e checklist manual** — Run: `npm run start`, abrir `http://localhost:3000` (viewport mobile 390×844). Verificar cada item:
  - [ ] Tab bar aparece em Inbox/Contatos/Painel; some dentro de um chat aberto; reaparece ao voltar.
  - [ ] Inbox: lista full-width → tocar conversa → chat full-width → `‹` volta.
  - [ ] Enviar texto, áudio (gravar/enviar) e um arquivo pelo composer mobile.
  - [ ] `⋯` do chat abre o sheet de ações; IA toggle, Encerrar, Logs, Sincronizar funcionam; Logs/Projeto abrem full-screen.
  - [ ] Faixa de abas (Esperando/Entrada/Finalizados) rola horizontalmente.
  - [ ] Contatos como cards; busca e "Novo contato" ok.
  - [ ] Dashboard empilhado, sem overflow horizontal, rola até o fim sem corte pela tab bar.
  - [ ] "Mais" abre sheet com navegação/org/logout.
  - [ ] PWA: DevTools → Application → Manifest sem erros; "Install" disponível; Service Worker activated; navegação offline mostra `offline.html`.

- [ ] **Step 4: Checagem de não-regressão desktop** — repetir em viewport ≥ 1024px: Inbox lado a lado, header completo, tabela de contatos, dashboard multi-coluna, tab bar ausente. Tudo idêntico ao comportamento anterior.

- [ ] **Step 5: Commit final (se houver ajustes) e finalizar branch** — invocar a skill `superpowers:finishing-a-development-branch` para decidir merge/PR.

---

## Self-Review (checagem do plano vs. spec)

- **Navegação tab bar** → Task 6. ✅
- **Inbox lista↔chat single-panel** → Tasks 7, 8. ✅
- **Chat tela cheia + ações em bottom sheet** → Task 9. ✅ (Atribuir/Pipeline via mobile explicitamente adiados — decisão de escopo registrada.)
- **Composer touch/safe-area** → Task 10. ✅
- **Painéis (Logs/Projeto) full-screen no mobile** → Task 11. ✅
- **Filtros/abas rolável** → Task 7. ✅ (Painel de filtros como bottom sheet: a spec mencionava; o `inbox-filter-panel` já abre como painel próprio — os chips de aba ficam roláveis na Task 7; converter o painel de filtros inteiro para BottomSheet fica como follow-up aditivo se o atual não couber bem no mobile. Registrar no PR.)
- **Contatos cards** → Task 12. ✅ (Descoberta: UI real em `/settings/contacts`; tab bar aponta pra lá.)
- **Dashboard empilhado + charts responsivos** → Task 13. ✅
- **PWA: manifest, ícones, SW, offline, safe-area, apple/theme tags** → Tasks 1, 2, 3. ✅
- **Sem push** → nada de push/subscription em nenhuma task; SW deixa espaço p/ fase 2. ✅
- **Zero regressão desktop** → tudo gated em `lg:`; Task 14 Step 4 verifica. ✅
- **Verificação** → Task 14 (build/lint/manual), coerente com "sem suíte E2E" da spec. ✅

**Placeholders:** nenhum "TBD/TODO"; adiamentos são decisões de escopo explícitas, não lacunas. **Consistência de tipos:** `onBack` definido na Task 8 (uso), propagado em `ChatPanel` (Task 9 Step 1) e recebido em `ConversationHeader` (Task 9 Step 2); `useMobileChrome`/`setHideTabBar`/`hideTabBar` consistentes entre store (Task 5) e consumidores (Tasks 6, 8); `BottomSheet` props (`open`/`onClose`/`title`/`children`) idênticas em todos os usos.
