# Redesign — Fundação de Design System + Inbox (vitrine)

**Data:** 2026-07-06
**Status:** Aprovado para planejamento
**Autor:** Kleber + Claude

## Contexto

O OFP Workspace (`chat-bullq-web`) já é um produto vivo em produção com clientes
reais: Next 16 / React 19 / Tailwind 4 / framer-motion / next-themes, ~112
componentes em arquitetura feature-based. Os módulos que o documento de visão
("OFP Workspace — Frontend Vision") trata como futuro **já existem**: inbox,
contatos, pipelines, projects, ai-agents, automations, dashboard, segments,
channels.

O design system atual é o **shadcn/ui default** — tokens semânticos em oklch já
presentes em `src/app/globals.css` (background/foreground/card/primary/muted…),
escala de radius e dark mode funcionando via `next-themes`. É uma base sólida
porém genérica, e só existem **7 primitivos** em `src/components/ui/`, então
muito estilo hoje vive inline dentro das features — fonte da inconsistência
visual.

## Objetivo

Elevar o app de "shadcn default" para um acabamento **nível Linear/Stripe**, com
**assinatura de marca violeta**, e **centralizar** o estilo hoje espalhado —
começando com uma tela vitrine (Inbox) para validar a direção com risco baixo,
sem tocar na lógica que já dá dinheiro.

**Não-objetivo:** redesenhar Pipeline, Contatos, Dashboard, etc. agora. Eles
herdam a nova cor/tokens automaticamente; o redesenho dedicado vem depois de a
Inbox estar validada em produção. Também não é objetivo mexer em backend,
sockets, react-query, stores ou integrações de canal.

## Decisões (validadas com o usuário)

| Decisão | Escolha |
|---|---|
| Escopo | Fundação de tokens + biblioteca de primitivos + Inbox vitrine |
| Identidade | Linear-like segura, com cor de marca **violeta** |
| Tema padrão | **Claro** por padrão, com toggle (dark/light/sistema disponíveis) |
| Entrega | **Branch isolada** (`feat/redesign-foundation`), merge só após aprovação local |
| Direção visual | Validada via mockup (`.superpowers/brainstorm/`) — layout 3 colunas + Painel Inteligente |

## Arquitetura da mudança

Três camadas, da base pro topo. Cada uma é independente e testável.

### Camada 1 — Tokens (fundação, aditiva)

Arquivo: `src/app/globals.css` (`@theme inline` + `.dark`).

- **Primary → violeta.** Substituir os valores de `--color-primary` /
  `--color-ring` (light e dark) por violeta em oklch. Valor-alvo aproximado a
  afinar na implementação:
  - light: `--color-primary: oklch(0.55 0.22 292)`
  - dark: `--color-primary: oklch(0.68 0.19 292)`
  - `--color-ring` acompanha o primary.
  Como todo o app referencia `--color-primary`, a recoloração propaga sozinha.
- **Sombras.** Adicionar escala de sombras discretas (Linear-style), ex.
  `--shadow-sm/md/lg` com opacidades baixas, diferentes em light e dark.
- **Motion.** Tokens de duração `--motion-fast: 120ms`, `--motion-base: 180ms`,
  `--motion-slow: 240ms`, `--motion-slower: 320ms` + easing padrão.
- **Superfícies.** Refinar cinzas de superfície no dark (surface / surface-2)
  para dar mais profundidade e hierarquia; garantir contraste AA no light.
- **Tipografia.** Adotar **Inter** via `next/font/local` ou `next/font/google`
  self-hosted (sem request externo em runtime), aplicada no `<body>`. Ajustar
  `letter-spacing` levemente negativo em títulos (pegada Linear).

### Camada 2 — Primitivos (`src/components/ui/`)

Padronizar com `class-variance-authority` (já instalado) e `tailwind-merge`.
Cada primitivo com todos os estados: **normal / hover / focus / active /
disabled / loading**. Priorizar skeleton sobre spinner.

- **Button** — variantes: primary, secondary, ghost, destructive, outline;
  tamanhos sm/md/lg; estado loading com spinner interno.
- **Input** — com estados de foco (ring violeta), erro, disabled; suporte a
  ícone à esquerda.
- **Card** — surface + border + sombra token; densidades.
- **Badge / Pill** — variantes de contexto (hot/new/won/neutral) usadas na lista
  de conversas.
- **Avatar** — já existe; alinhar com o novo sistema (gradientes, badge de canal).

Diretriz: onde a Inbox hoje tem estilo inline que um primitivo cobre, trocar
pelo primitivo. Não refatorar features fora da Inbox nesta etapa.

### Camada 3 — Inbox (tela vitrine)

Pasta: `src/features/inbox/` + `src/app/(dashboard)/inbox/`.

Aplicar tokens + primitivos ao layout, **preservando toda a lógica** (hooks,
services, sockets, stores, react-query). Só camada de apresentação.

Elementos do mockup aprovado:
- **Sidebar de ícones** enxuta com indicador de ativo à esquerda.
- **Lista de conversas** com abas existentes (Entrada/Esperando/Meus/
  Finalizados), badge de canal (WhatsApp) no avatar, e **pills de contexto**
  (🔥 Lead quente, Novo, ✓ Venda fechada).
- **Chat central** com bolhas limpas, separadores de dia, e ação **"Gerar
  resposta com IA"** no composer.
- **Painel Inteligente (direita)**: Resumo IA do cliente, Sentimento, Próximos
  passos sugeridos, dados do negócio (valor estimado, etapa do pipeline,
  responsável, origem). Recolhível.

> Nota: os blocos de IA do painel podem entrar como **estrutura visual + estado
> vazio/placeholder** nesta etapa se o endpoint ainda não existir, para não
> acoplar o redesign a backend novo. A fiação com IA real é incremento posterior.

## Fluxo de dados

Sem mudança. A camada de apresentação continua consumindo os mesmos hooks/stores/
sockets. Nenhum contrato de API é alterado. O redesign é puramente visual +
reorganização de componentes de UI.

## Responsividade

Manter o comportamento mobile-first já existente (mobile-tab-bar, bottom-sheet).
No mobile a Inbox continua colapsando para lista → chat → bottom sheet para
detalhes/IA, conforme o padrão atual. Não regredir o que já está em produção
mobile/PWA.

## Riscos e mitigação

- **Quebrar fluxo que dá dinheiro** → branch isolada, sem tocar em lógica, review
  rodando localmente antes do merge.
- **Recoloração global inesperada** → mudar o primary afeta o app todo; validar
  visualmente as outras telas (que herdam o token) antes do merge, mesmo sem
  redesenhá-las.
- **Contraste/acessibilidade** → conferir AA em light e dark após novos cinzas.
- **Regressão mobile/PWA** → testar a Inbox no viewport mobile antes do merge.

## Testes / validação

- Rodar `next build` + `next lint` verdes na branch.
- Validação visual local (dev) em light e dark, desktop e mobile.
- Conferir que os fluxos da Inbox continuam funcionando (enviar mensagem, trocar
  aba, abrir conversa) — sem regressão de comportamento.

## Critério de sucesso

A Inbox nova, em `feat/redesign-foundation`, rodando localmente com:
- cor de marca violeta aplicada e propagada por tokens;
- primitivos base padronizados com todos os estados;
- layout 3 colunas + Painel Inteligente conforme mockup;
- lógica intacta, build/lint verdes, sem regressão mobile;
- aprovação visual do usuário antes do merge.
