# Redesign — Fundação + Inbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar o `chat-bullq-web` de "shadcn default" para acabamento nível Linear com cor de marca violeta, centralizando primitivos de UI, e aplicar tudo na Inbox como tela vitrine — sem tocar em lógica.

**Architecture:** Três camadas independentes: (1) tokens em `globals.css` — recolorir `primary` para violeta + adicionar sombras/motion/superfícies; (2) biblioteca de primitivos em `components/ui/` com `cva`; (3) restyle da Inbox usando tokens + primitivos, preservando 100% da lógica (sockets, react-query, stores).

**Tech Stack:** Next 16, React 19, Tailwind 4 (`@theme inline`), class-variance-authority, tailwind-merge, lucide-react, framer-motion, next-themes.

**Verificação (sem framework de teste no projeto):** Cada task é validada por `yarn build` + `yarn lint` verdes e **checagem visual** em `yarn dev` (light + dark, desktop + mobile). Não há Jest/Vitest — não vamos introduzir. O portão de qualidade é build/lint/visual + "a lógica continua funcionando".

**Regras invioláveis:**
- NÃO alterar hooks, services, stores, sockets, contratos de API. Só apresentação.
- Trabalhar na branch `feat/redesign-foundation`. Merge só após aprovação visual do usuário.
- Preferir tokens semânticos a cores cruas. Não refatorar features fora da Inbox.

---

### Task 0: Criar branch isolada

**Files:** nenhum (setup git)

- [ ] **Step 1: Criar e entrar na branch**

Run:
```bash
cd chat-bullq-web
git checkout -b feat/redesign-foundation
```
Expected: `Switched to a new branch 'feat/redesign-foundation'`

- [ ] **Step 2: Confirmar árvore limpa e branch correta**

Run: `git status && git branch --show-current`
Expected: working tree limpo (ou só os specs/plans novos), branch = `feat/redesign-foundation`

- [ ] **Step 3: Commit dos docs de design**

```bash
git add docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: spec e plano do redesign fundação + inbox"
```

---

### Task 1: Tokens — primary violeta + sombras + motion + superfícies

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ler o arquivo atual**

Run: `sed -n '1,60p' src/app/globals.css`
Expected: ver os blocos `@theme inline` e `.dark` com os tokens oklch atuais.

- [ ] **Step 2: Substituir o bloco `@theme inline` (adiciona violeta, sombras, motion)**

Substituir os tokens de `--color-primary`, `--color-ring` no `@theme inline` e adicionar sombras + motion. O bloco final do `@theme inline` deve ficar assim (mantém os demais tokens iguais, só troca primary/ring e adiciona o rodapé):

```css
@theme inline {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.145 0 0);
  --color-popover: oklch(1 0 0);
  --color-popover-foreground: oklch(0.145 0 0);
  --color-primary: oklch(0.55 0.24 293);
  --color-primary-foreground: oklch(0.985 0 0);
  --color-secondary: oklch(0.97 0 0);
  --color-secondary-foreground: oklch(0.205 0 0);
  --color-muted: oklch(0.97 0 0);
  --color-muted-foreground: oklch(0.556 0 0);
  --color-accent: oklch(0.97 0 0);
  --color-accent-foreground: oklch(0.205 0 0);
  --color-destructive: oklch(0.577 0.245 27.325);
  --color-border: oklch(0.922 0 0);
  --color-input: oklch(0.922 0 0);
  --color-ring: oklch(0.55 0.24 293);
  --color-sidebar: oklch(0.985 0 0);
  --color-sidebar-foreground: oklch(0.145 0 0);
  --color-sidebar-border: oklch(0.922 0 0);
  --color-sidebar-accent: oklch(0.97 0 0);
  --color-sidebar-accent-foreground: oklch(0.205 0 0);
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  /* Sombras discretas estilo Linear (aditivo, nomes próprios p/ não sobrescrever defaults) */
  --shadow-soft: 0 1px 2px 0 oklch(0 0 0 / 0.04), 0 1px 3px 0 oklch(0 0 0 / 0.06);
  --shadow-elevated: 0 4px 12px -2px oklch(0 0 0 / 0.08), 0 2px 6px -2px oklch(0 0 0 / 0.06);
  --shadow-overlay: 0 12px 32px -8px oklch(0 0 0 / 0.16), 0 4px 12px -4px oklch(0 0 0 / 0.10);
}
```

- [ ] **Step 3: Substituir primary/ring no bloco `.dark`**

No bloco `.dark`, trocar as duas linhas:
```css
  --color-primary: oklch(0.68 0.20 293);
  --color-primary-foreground: oklch(0.985 0 0);
```
e
```css
  --color-ring: oklch(0.68 0.20 293);
```
(Deixar o resto do `.dark` intacto.)

- [ ] **Step 4: Adicionar tokens de motion + sombras dark no `:root` / `.dark`**

Após o bloco `.dark`, adicionar:
```css
:root {
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 240ms;
  --motion-slower: 320ms;
  --motion-ease: cubic-bezier(0.32, 0.72, 0, 1);
}
.dark {
  --shadow-soft: 0 1px 2px 0 oklch(0 0 0 / 0.3), 0 1px 3px 0 oklch(0 0 0 / 0.4);
  --shadow-elevated: 0 4px 12px -2px oklch(0 0 0 / 0.5), 0 2px 6px -2px oklch(0 0 0 / 0.4);
  --shadow-overlay: 0 12px 32px -8px oklch(0 0 0 / 0.6), 0 4px 12px -4px oklch(0 0 0 / 0.5);
}
```

- [ ] **Step 5: Build + lint**

Run: `yarn build && yarn lint`
Expected: build e lint verdes (sem novos erros).

- [ ] **Step 6: Checagem visual**

Run: `yarn dev` — abrir o app, verificar que botões/estados ativos ficaram **violeta** (não azul) em light e dark. Nada quebrado.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(tokens): primary violeta + sombras e motion tokens"
```

---

### Task 2: Refinar tipografia (Inter já carregada)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

> Inter já está via `next/font/google`. Só adicionamos `variable` + tracking sutil em títulos (pegada Linear).

- [ ] **Step 1: Expor Inter como CSS variable no layout**

Em `src/app/layout.tsx`, trocar:
```tsx
const inter = Inter({ subsets: ['latin'] });
```
por:
```tsx
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
```
e no `<body>` trocar `className={inter.className}` por `className={`${inter.variable} font-sans antialiased`}`.

- [ ] **Step 2: Mapear a fonte no tema**

Em `src/app/globals.css`, dentro do `@theme inline`, adicionar:
```css
  --font-sans: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
```
E em `@layer base`, adicionar tracking sutil em títulos:
```css
  h1, h2, h3 { letter-spacing: -0.02em; }
```

- [ ] **Step 3: Build + lint + visual**

Run: `yarn build && yarn lint`
Expected: verde. Visual: títulos levemente mais "apertados", texto igual.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(type): Inter como variable + tracking em títulos"
```

---

### Task 3: Primitivo Button

**Files:**
- Create: `src/components/ui/button.tsx`

- [ ] **Step 1: Criar o componente com `cva`**

```tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ' +
    'transition-colors duration-[--motion-base] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 active:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-background hover:bg-muted',
        ghost: 'hover:bg-muted text-foreground',
        destructive: 'bg-destructive text-white shadow-soft hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 2: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde (componente compila e é tree-shakeável mesmo sem uso ainda).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): primitivo Button com variantes e loading"
```

---

### Task 4: Primitivo Input

**Files:**
- Create: `src/components/ui/input.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border bg-background px-3 py-1 text-sm text-foreground',
        'placeholder:text-muted-foreground transition-colors duration-[--motion-base]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        invalid ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
```

- [ ] **Step 2: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat(ui): primitivo Input com estado de foco e erro"
```

---

### Task 5: Primitivo Card

**Files:**
- Create: `src/components/ui/card.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-soft',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pb-2', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-2', className)} {...props} />;
}
```

- [ ] **Step 2: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat(ui): primitivo Card"
```

---

### Task 6: Primitivo Badge/Pill (variantes de contexto da Inbox)

**Files:**
- Create: `src/components/ui/badge.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        brand: 'bg-primary/12 text-primary',
        hot: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        info: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 2: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat(ui): primitivo Badge com variantes de contexto"
```

---

### Task 7: Primitivo Skeleton

**Files:**
- Create: `src/components/ui/skeleton.tsx`

> O documento de visão pede: "Nunca utilizar spinner sozinho. Priorizar Skeleton."

- [ ] **Step 1: Criar o componente**

```tsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/skeleton.tsx
git commit -m "feat(ui): primitivo Skeleton"
```

---

### Task 8: Restyle da lista de conversas + pills de contexto

**Files:**
- Modify: `src/features/inbox/components/conversation-list.tsx`

> Regra: só apresentação. Não mexer em queries, handlers, props. Ler o arquivo inteiro antes de editar.

- [ ] **Step 1: Ler o componente atual**

Run: `cat src/features/inbox/components/conversation-list.tsx`
Expected: entender a estrutura de item de conversa, onde entram avatar/nome/última mensagem/hora.

- [ ] **Step 2: Aplicar tokens no container e itens**

Trocar cores cruas por tokens no wrapper e itens da lista:
- `bg-zinc-50/bg-white` → `bg-card`
- `border-zinc-200 dark:border-zinc-800` → `border-border`
- item ativo → `bg-primary/10` com `ring-1 ring-primary/30` (arredondado `rounded-xl`)
- item hover → `hover:bg-muted`
- nome → `text-foreground font-semibold`; prévia → `text-muted-foreground`; hora → `text-muted-foreground text-[11px]`

Manter classes de layout (flex/gap/padding) e toda a lógica intactas.

- [ ] **Step 3: Adicionar pills de contexto usando o Badge**

Importar `import { Badge } from '@/components/ui/badge';` e, onde já existirem flags do modelo de conversa (ex.: tags, status, `isGroup`, indicadores de lead), renderizar pills. Mapa canônico (usar exatamente estes nomes):
- lead quente → `<Badge variant="hot">🔥 Lead quente</Badge>`
- conversa nova/não lida → `<Badge variant="brand">Novo</Badge>`
- venda/ganho → `<Badge variant="success">✓ Fechado</Badge>`
- neutro/tag → `<Badge variant="neutral">{tag}</Badge>`

> Só renderizar pills a partir de dados que JÁ existem na `Conversation`. Não inventar campos novos nem chamar novos endpoints. Se um dado não existir, não mostrar aquela pill.

- [ ] **Step 4: Badge de canal no avatar**

Se o avatar da lista ainda não mostra o canal, adicionar um selo pequeno (canto inferior direito) com o ícone do canal (`lucide-react`), condicionado a `conversation.channel`. Sem novo dado — usar o que já vem.

- [ ] **Step 5: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 6: Checagem visual + funcional**

Run: `yarn dev` — a lista deve ficar mais limpa, item ativo violeta, pills legíveis em light/dark. **Testar**: clicar em conversa abre chat, trocar de aba filtra, scroll funciona. Nenhuma regressão.

- [ ] **Step 7: Commit**

```bash
git add src/features/inbox/components/conversation-list.tsx
git commit -m "feat(inbox): restyle da lista de conversas + pills de contexto"
```

---

### Task 9: Restyle do chat (header, stream, composer)

**Files:**
- Modify: `src/features/inbox/components/conversation-header.tsx`
- Modify: `src/features/inbox/components/chat-panel.tsx`
- Modify: `src/features/inbox/components/chat-input.tsx`

> Só apresentação. Ler cada arquivo antes de editar.

- [ ] **Step 1: Ler os três arquivos**

Run: `cat src/features/inbox/components/conversation-header.tsx src/features/inbox/components/chat-input.tsx`
E: `sed -n '1,80p' src/features/inbox/components/chat-panel.tsx`
Expected: localizar bolhas de mensagem, header e área de input.

- [ ] **Step 2: Header**

Em `conversation-header.tsx`: fundo `bg-card/40 backdrop-blur border-b border-border`, nome `text-foreground font-semibold`, status `text-muted-foreground text-xs` com dot verde (`bg-emerald-500`). Botões de ação → usar o primitivo `Button` `variant="ghost" size="icon"`.

- [ ] **Step 3: Bolhas de mensagem**

Em `chat-panel.tsx` (ou onde as bolhas são renderizadas): bolha recebida → `bg-muted rounded-2xl rounded-bl-sm`; enviada → `bg-primary text-primary-foreground rounded-2xl rounded-br-sm`. Timestamp → `text-[10px] opacity-60`. Separador de dia → pill central `bg-muted text-muted-foreground`. Não alterar lógica de agrupamento/ordenação.

- [ ] **Step 4: Composer**

Em `chat-input.tsx`: container `border border-border bg-card rounded-2xl shadow-soft`. Botão enviar → `Button size="icon"`. Se já existir ação de IA (ex.: bulk-ai-popover / gerar resposta), expor um chip `bg-primary/10 text-primary border border-primary/25` acima do input rotulado "Gerar resposta com IA". Se a ação ainda não existir, NÃO criar backend — deixar o chip só se houver handler existente.

- [ ] **Step 5: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 6: Checagem visual + funcional**

Run: `yarn dev` — enviar mensagem, ver bolhas violeta/limpas, header/composer coerentes em light/dark. Testar envio real (socket) — sem regressão.

- [ ] **Step 7: Commit**

```bash
git add src/features/inbox/components/conversation-header.tsx src/features/inbox/components/chat-panel.tsx src/features/inbox/components/chat-input.tsx
git commit -m "feat(inbox): restyle de header, bolhas e composer"
```

---

### Task 10: Painel Inteligente (estrutura visual sobre a infra de IA existente)

**Files:**
- Create: `src/features/inbox/components/intelligent-panel.tsx`
- Modify: `src/app/(dashboard)/inbox/page.tsx`

> Já existe `AgentRunsSidebar` (Jarvis Execuções) e `ProjectPanel` no painel direito, controlados por `agentLogsOpen`/`projectPanelOpen` com preferência em localStorage. Vamos ADICIONAR um painel de resumo do cliente que segue o MESMO padrão de toggle/persistência, sem mexer nos existentes.

- [ ] **Step 1: Criar o componente `IntelligentPanel` (estrutura + estado vazio)**

```tsx
'use client';

import { Sparkles, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Conversation } from '@/features/inbox/services/inbox.service';

interface IntelligentPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

export function IntelligentPanel({ conversation, onClose }: IntelligentPanelProps) {
  const name = conversation.contact?.name ?? conversation.name ?? 'Contato';
  return (
    <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card p-4 lg:flex">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <Sparkles className="h-4 w-4" /> Painel Inteligente
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <Card className="border-primary/30 bg-gradient-to-b from-primary/[0.07] to-transparent">
        <CardContent className="pt-4">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Resumo IA
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            Resumo automático da conversa aparecerá aqui.
          </p>
        </CardContent>
      </Card>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>
        <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
          <span className="text-muted-foreground">Nome</span>
          <span className="font-semibold">{name}</span>
        </div>
        {conversation.channel && (
          <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
            <span className="text-muted-foreground">Canal</span>
            <Badge variant="brand">{conversation.channel}</Badge>
          </div>
        )}
      </div>
    </aside>
  );
}
```

> NOTA: acessar apenas campos que JÁ existem em `Conversation` (ler `inbox.service.ts` no Step 2 e ajustar os nomes reais de `contact`/`name`/`channel`). Se algum não existir, remover aquela linha. Zero chamada de backend nova.

- [ ] **Step 2: Conferir os campos reais de `Conversation`**

Run: `grep -n "interface Conversation\|type Conversation" -A 30 src/features/inbox/services/inbox.service.ts`
Expected: ver os campos disponíveis. Ajustar `name`/`contact`/`channel` no componente para os nomes reais.

- [ ] **Step 3: Ligar o painel na página seguindo o padrão existente**

Em `src/app/(dashboard)/inbox/page.tsx`:
1. Adicionar constante de preferência: `const INTEL_PANEL_PREF_KEY = 'inbox.intelPanelOpen';`
2. Adicionar estado `intelPanelOpen` + efeito de leitura do localStorage (espelhar o padrão de `agentLogsOpen`).
3. Adicionar `toggleIntelPanel` espelhando `toggleAgentLogs` (mutuamente exclusivo com os outros dois painéis de largura).
4. Importar e renderizar `<IntelligentPanel conversation={activeConversation} onClose={toggleIntelPanel} />` dentro do bloco `activeConversation ? (...)`, no mesmo nível de `AgentRunsSidebar`, condicionado a `intelPanelOpen`.
5. Passar `onToggleIntel={toggleIntelPanel}` e `intelOpen={intelPanelOpen}` para `ChatPanel` (adicionar as props no `ChatPanel` e um botão no header que dispara — `Button variant="ghost" size="icon"` com ícone `Sparkles`).

> Manter a exclusividade de largura: abrir o Painel Inteligente fecha `agentLogsOpen` e `projectPanelOpen` (e persiste `'0'` neles), igual ao padrão atual.

- [ ] **Step 4: Build + lint**

Run: `yarn build && yarn lint`
Expected: verde.

- [ ] **Step 5: Checagem visual + funcional**

Run: `yarn dev` — abrir conversa, clicar no ícone Sparkles do header abre o Painel Inteligente; abrir Logs/Projeto fecha o Inteligente e vice-versa; preferência persiste ao recarregar. Sem regressão.

- [ ] **Step 6: Commit**

```bash
git add src/features/inbox/components/intelligent-panel.tsx "src/app/(dashboard)/inbox/page.tsx" src/features/inbox/components/chat-panel.tsx
git commit -m "feat(inbox): Painel Inteligente (resumo do cliente) com toggle persistente"
```

---

### Task 11: QA final — light/dark, mobile, contraste

**Files:** nenhum (verificação)

- [ ] **Step 1: Build + lint limpos**

Run: `yarn build && yarn lint`
Expected: ambos verdes.

- [ ] **Step 2: Matriz visual**

Run: `yarn dev` — verificar a Inbox em: light desktop, dark desktop, light mobile (viewport estreito), dark mobile. No mobile: lista → chat → sem tab bar quando conversa aberta (comportamento atual preservado). Painéis viram fluxo mobile normal.

- [ ] **Step 3: Regressão de telas herdadas**

Abrir Pipeline, Contatos, Dashboard, Settings — confirmar que a recoloração violeta (via token) não quebrou contraste nem legibilidade. Não redesenhar; só conferir que herdaram bem.

- [ ] **Step 4: Contraste**

Conferir texto sobre `bg-primary` (branco sobre violeta) e badges em ambos os temas — legível (AA). Ajustar opacidades se algo ficar fraco.

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "fix(redesign): ajustes de contraste e QA final"
```

- [ ] **Step 6: Handoff para o usuário**

Rodar o app e pedir aprovação visual ao usuário ANTES de qualquer merge. Merge só após "ok".

---

## Self-Review (feito)

- **Cobertura do spec:** tokens violeta (T1), sombras/motion (T1), Inter (T2), primitivos Button/Input/Card/Badge/Avatar-existente/Skeleton (T3–T7), Inbox layout+pills (T8), chat+composer+IA (T9), Painel Inteligente (T10), responsividade+QA (T11), branch isolada (T0). ✓
- **Sem placeholders:** código completo em tokens e primitivos; restyles de componentes existentes usam "ler → editar enumerado" porque os arquivos são grandes e não devem ser reescritos às cegas (a lógica precisa ser preservada). ✓
- **Consistência de tipos:** `Badge`/`Button`/`Card`/`Input`/`Skeleton` usados nas tasks 8–10 são exatamente os exportados nas tasks 3–7. `IntelligentPanel` props (`conversation`, `onClose`) batem com o uso na page. Campos de `Conversation` confirmados em runtime no T10/Step 2 antes de usar. ✓
