# Design — Versão Mobile (PWA) do Chat BullQ

**Data:** 2026-07-05
**Status:** Aprovado (brainstorming)
**Escopo desta entrega:** Web responsivo mobile-first para Inbox, Contatos e Dashboard + navegação por tab bar + PWA instalável (manifest, install, service worker com offline shell). **Sem push** (fase 2).

## Contexto

`chat-bullq-web` é um app Next.js 16 (App Router, `output: standalone`) / React 19 / Tailwind CSS 4, com um inbox estilo WhatsApp para atendimento omnichannel. Hoje:

- O `SidebarLayout` já transforma a navegação principal num drawer (`Dialog` Headless UI) abaixo de `lg` (1024px). O `lg:` é o divisor desktop/mobile em todo o app.
- A `InboxPage` (`src/app/(dashboard)/inbox/page.tsx`) renderiza **lista + chat lado a lado por estado** (`activeConversation`), sem troca de rota. A `ConversationList` tem largura fixa `w-80`; painéis auxiliares (`AgentRunsSidebar`, `ProjectPanel`) são colunas laterais.
- **Não existe** `public/`, manifest nem service worker — o PWA é greenfield.
- Gravação de áudio já funciona sob HTTPS (produção serve por HTTPS).

O problema central: numa tela de ~375px, lista (`w-80` = 320px) + chat lado a lado não cabem. Precisamos de navegação **lista → chat** e de padrões mobile (tab bar, bottom sheet, telas cheias no lugar de colunas laterais).

## Princípios

1. **Não criar rotas nem telas novas** — adaptar as existentes com CSS responsivo (`lg:` como fronteira) e alguns componentes mobile reutilizáveis.
2. **Zero regressão no desktop** — tudo que é novo é gated em `< lg`; o comportamento `lg+` permanece idêntico.
3. **Touch-first** — alvos de toque ≥ 44px, respeitar `safe-area-inset` (notch/home indicator).
4. **Componentes isolados** — cada peça mobile (tab bar, bottom sheet) tem propósito único, interface clara e é testável isoladamente.

## Componentes e mudanças

### 1. Navegação — Bottom Tab Bar

- **Novo:** `src/components/layout/mobile-tab-bar.tsx` — barra fixa no rodapé, `fixed bottom-0 inset-x-0 lg:hidden`, com `padding-bottom: env(safe-area-inset-bottom)`.
- Abas: **Inbox** (com badge de conversas não-lidas), **Contatos**, **Painel**, **Mais**.
  - Item ativo destacado (cor primária); demais em cinza. Ícones `lucide-react` (MessageSquare, Users, BarChart3, MoreHorizontal).
  - Estado ativo derivado do pathname (`usePathname`).
- **Mais** abre um bottom sheet reutilizando o conteúdo do `AppSidebar` (Pipelines, Automações, Chatbot, Settings, troca de organização, logout). Não duplicar a lista de navegação — extrair/reusar.
- **Ocultar a tab bar dentro de um chat aberto:** quando há `activeConversation` no inbox (mobile), a tab bar some para dar tela cheia ao chat. Implementação via contexto leve (ex.: `MobileChromeContext`) que a `InboxPage` seta, ou classe no `body`. Escolher a mais simples na fase de plano.
- Montagem: renderizar `MobileTabBar` no `(dashboard)/layout.tsx`, dentro do `SidebarLayout` (ou logo abaixo), sem afetar o desktop.
- **Espaçamento:** o conteúdo das páginas mobile ganha `padding-bottom` suficiente pra não ficar atrás da tab bar (`pb-16` + safe area) nas telas raiz.

### 2. Inbox — lista ↔ chat

Arquivo-chave: `src/app/(dashboard)/inbox/page.tsx` e `src/features/inbox/components/conversation-list.tsx`.

- Manter o modelo por estado (`activeConversation`), **sem** introduzir rotas.
- **`< lg` — um painel por vez:**
  - Sem conversa selecionada → **lista 100% da largura** (remover/neutralizar `w-80` no mobile: `w-full lg:w-80`).
  - Com conversa → **chat 100%**, lista escondida (`hidden lg:flex` na lista quando há conversa ativa; o container do inbox controla isso).
  - O `‹` (voltar) no header do chat chama `setActiveConversation(null)` no mobile, retornando à lista.
- **Filtros e abas de atendimento** (Esperando / Entrada / Finalizados) e o seletor de view: no topo da lista, numa **faixa horizontal rolável** (`overflow-x-auto`, sem quebrar linha) no mobile. O painel de filtros (`inbox-filter-panel.tsx`) abre como **bottom sheet** em vez de popover/coluna.
- **Painéis auxiliares** (`AgentRunsSidebar`, `ProjectPanel`): no mobile abrem como **overlay tela cheia** (posicionamento `fixed inset-0 z-…` com header próprio + botão fechar) em vez de coluna lateral. No desktop continuam colunas.

### 3. Tela de chat + ações

Arquivos: `src/features/inbox/components/chat-panel.tsx`, `conversation-header.tsx`, `chat-input.tsx`.

- Chat em tela cheia no mobile. Header: `‹ voltar` · avatar + nome · status (IA ativa/pausada · aba atual) · `⋯`.
- **`⋯` abre um bottom sheet** com as ações secundárias hoje espalhadas na barra do desktop:
  - IA responde automática (toggle)
  - Atribuir atendente
  - Mover para… (Esperando / Entrada / Finalizados)
  - Pipeline / etapa
  - Projeto do grupo (só quando `isGroup`)
  - Logs do agente
  - Renomear conversa
- Composer touch-friendly: botões de anexo e áudio com alvo ≥ 44px; input não deve ser encoberto pelo teclado (usar `interactive-widget=resizes-content` no viewport e testar).
- **Novo:** `src/components/ui/bottom-sheet.tsx` — wrapper sobre `Dialog`/`DialogPanel` (Headless UI, já é dependência) com animação de subida, `grab handle`, scrim, fechar por swipe/scrim/Esc, e `padding-bottom: env(safe-area-inset-bottom)`. Reutilizado no "Mais", no menu de ações e no painel de filtros.

### 4. Contatos & Dashboard

- **Contatos** (`src/app/(dashboard)/contacts` + `features/contacts`): a tabela vira **lista de cards** abaixo de `lg` (cada card = avatar, nome, canal, tags, ação no toque). Modais de cadastro/edição viram bottom sheet ou tela cheia no mobile. Manter a tabela no desktop.
- **Dashboard** (`src/app/(dashboard)/dashboard` + `features/dashboard`): grid de cards empilha em 1 coluna (`grid-cols-1 lg:grid-cols-…`). Gráficos `recharts` usam `ResponsiveContainer` com altura reduzida no mobile; garantir que legendas/eixos não estourem a largura (`overflow-x-auto` onde necessário).

### 5. PWA (sem push)

- **`public/manifest.webmanifest`:** `name`, `short_name`, `description`, `start_url: /inbox`, `display: standalone`, `background_color`, `theme_color` (alinhado ao `--color-primary`), `orientation: portrait`, ícones **192×192 e 512×512** + um `512` `purpose: maskable`.
- **Ícones:** gerar e colocar em `public/` (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`). Derivar do ícone/marca atual (`app/icon.svg` / `components/brand`).
- **Root layout** (`src/app/layout.tsx`): adicionar via metadata do Next e/ou `<head>`:
  - `viewport`: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`.
  - `theme-color` (claro/escuro se aplicável).
  - `manifest` link.
  - `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, `apple-touch-icon`.
- **Service worker próprio:** `public/sw.js` — precache do app-shell + estratégia de runtime (network-first pra navegação com fallback offline; cache-first pra estáticos). **Sem `next-pwa`** (evitar incompatibilidade com Next 16/Turbopack). Não cachear respostas de API autenticadas.
- **Registro:** `src/components/pwa/service-worker-register.tsx` (client component) montado no root layout; registra `/sw.js` em produção, com update flow básico (skipWaiting/clientsClaim ou prompt de atualização — decidir no plano).
- **Safe areas:** `env(safe-area-inset-*)` na tab bar e no composer; `<meta viewport ... viewport-fit=cover>`.
- O SW já fica estruturado para receber `push`/`notificationclick` na **fase 2**, mas nenhum código de push/subscription entra agora.

### 6. Fora de escopo (agora)

- Push notifications e subscription de dispositivos → **fase 2** (spec própria).
- Editor de fluxo (`@xyflow`) em Pipelines/Automações e telas profundas de Settings → permanecem apenas **usáveis** (não quebram, mas sem tratamento mobile-first).

## Fluxo de dados

Sem mudança de contrato com o backend. Toda a adaptação é de camada de apresentação:

- Estado do inbox continua em `InboxPage` (`activeConversation`, toggles de painéis). O mobile apenas muda **o que é exibido** conforme `activeConversation` e o breakpoint.
- A tab bar lê pathname + contagem de não-lidas (já disponível nas queries do inbox / `react-query`).
- O SW opera fora do fluxo React (precache + fetch handler); não toca no estado da app.

## Tratamento de erros

- **SW indisponível / navegador sem suporte:** registro é best-effort; falha silenciosa, app funciona normal (progressive enhancement).
- **Offline:** navegação sem rede cai no fallback offline do SW; chamadas de API falhando seguem o tratamento de erro existente (toasts `sonner`).
- **Sem regressão desktop:** todo componente mobile é `lg:hidden` / gated por breakpoint; o caminho desktop não muda.

## Testes / verificação

Não há suíte E2E hoje. Verificação por viewport (DevTools responsive / device real) cobrindo os fluxos críticos:

1. Abrir uma conversa e voltar para a lista (mobile).
2. Enviar áudio e mídia pelo composer mobile.
3. Trocar de seção pela tab bar e entre abas (Esperando/Entrada/Finalizados).
4. Contatos como cards e Dashboard empilhado sem overflow horizontal.
5. `next build` verde (sem erros de tipo/lint).
6. PWA: DevTools → Application → Manifest válido; install prompt aparece; SW registrado; carregamento offline do shell.
7. Conferir ausência de regressão no desktop (`lg+`) nas mesmas telas.

## Arquivos afetados (resumo)

**Novos:**
- `src/components/layout/mobile-tab-bar.tsx`
- `src/components/ui/bottom-sheet.tsx`
- `src/components/pwa/service-worker-register.tsx`
- `public/manifest.webmanifest`, `public/sw.js`, ícones em `public/`

**Modificados:**
- `src/app/layout.tsx` (metadata/head PWA + registro do SW)
- `src/app/(dashboard)/layout.tsx` (montar tab bar)
- `src/app/(dashboard)/inbox/page.tsx` (lista↔chat mobile)
- `src/features/inbox/components/conversation-list.tsx` (`w-full lg:w-80`, faixa de filtros/abas rolável)
- `src/features/inbox/components/chat-panel.tsx` / `conversation-header.tsx` / `chat-input.tsx` (header com voltar, menu de ações em bottom sheet, composer touch)
- `src/features/inbox/components/agent-runs-sidebar.tsx` / `project-panel.tsx` (overlay full-screen no mobile)
- `inbox-filter-panel.tsx` (bottom sheet no mobile)
- Contatos e Dashboard (cards / grid empilhado / gráficos responsivos)
