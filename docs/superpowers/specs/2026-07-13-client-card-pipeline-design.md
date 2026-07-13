# Card do Cliente no Pipeline — Design

Data: 2026-07-13
Branch base: `feat/conversation-tabs`
Escopo: **somente frontend** (`chat-bullq-web`). Sem migração, sem endpoint novo.

## Problema

No board do pipeline (Kanban), clicar num card abre direto o **chat** da conversa
(`kanban-board.tsx` → `setViewingConvId`). O atendente quer, ao clicar, ver um
**Card do Cliente** com o panorama completo do lead antes de entrar na conversa:

- Dados do contato + atendente responsável
- Proposta enviada mais recente (atualizada), com detalhamento
- Recomendação da IA (próxima ação / resumo / objeção / respostas sugeridas)

O chat vira ação secundária dentro desse card.

## Decisões (confirmadas com o usuário)

1. **Clique no card abre o Card do Cliente**, não o chat. O chat é acessível por um
   botão "Abrir conversa" dentro do card.
2. **Recomendação da IA reusa** o endpoint existente
   `GET /conversations/:id/ai-summary` (o mesmo do Painel Inteligente). Zero backend novo.
3. **Proposta mostrada por completo**: última proposta com adultos/crianças/datas/
   parques/valor total + link do checkout + quando foi enviada.
4. **Recomendação da IA é gerada automaticamente ao abrir** o card. O endpoint
   `ai-summary` já "gera+cacheia", então reabrir o mesmo card não recusta a chamada LLM.
   Um botão "Regenerar" chama `?refresh=1` sob demanda.

## Endpoints reusados (já existem na API)

- `GET /proposals/conversation/:conversationId` → `Proposal[]` (ordenado desc).
  Fallback quando o card não tem conversa: `GET /proposals/contact/:contactId`.
  Campos: `adults, children, startDate, endDate, parks (Json[]), totalValue,
  currency, checkoutUrl, createdAt`.
- `GET /conversations/:conversationId/ai-summary` (opcional `?refresh=1`)
  → `{ summary, sentiment, objection, replies[] }`.

Nenhum dos dois é consumido no web hoje — este card é o primeiro consumidor.

## Componentes

### Novo: `ClientCardDialog`
`src/features/pipelines/components/client-card-dialog.tsx`

Props: `{ open, pipelineId, card: CardSummary | null, onClose, onOpenConversation, onEdit }`.

Orquestra as queries e monta o layout. Read-first. Reaproveita padrões visuais do
`CardDialog`/`ConversationDialog` (modal fixo, overlay `bg-black/50`, dark-mode).

### Alterado: `kanban-board.tsx`
- Novo estado `viewingCard: CardSummary | null` (substitui o papel de `viewingConvId`
  no clique primário).
- `onCardClick(c)` → `setViewingCard(c)` (sempre, independente de ter conversa).
- Renderiza `<ClientCardDialog>` com callbacks:
  - `onOpenConversation` → `setViewingConvId(card.conversationId)` (abre o
    `ConversationDialog` existente).
  - `onEdit` → `setEditingCard(card)` (abre o `CardDialog` existente).
- `ConversationDialog` e `CardDialog` permanecem, agora acionados a partir do
  Card do Cliente.

### Reusados sem mudança
- `CardDialog` (edição do card).
- `ConversationDialog` (chat popup).

## Layout do diálogo (topo → base)

1. **Header**: nome do contato (ou telefone), telefone, valor do card, selos de
   status (ganho/perdido/quente conforme `card.status`). Botão fechar (X).
2. **Atendente**: avatar + `card.assignedTo.name`, ou "Sem atendente".
3. **Proposta enviada**: valor total em destaque + "enviada há X" (data relativa),
   adultos/crianças, período (start–end), parques (chips), link "Abrir checkout →".
   Vazio → "Nenhuma proposta enviada ainda".
4. **Recomendação da IA**: próxima ação sugerida em destaque (extraída do `summary`/
   `replies`), resumo, objeção detectada (se houver), respostas sugeridas (chips/lista).
   Botão "Regenerar". Vazio/sem conversa → hint.
5. **Rodapé (ações)**: `Abrir conversa` (primário; oculto se não houver
   `conversationId`), `Editar card`, `Fechar`.

## Fluxo de dados e estados

- `useQuery(['proposals', convId|contactId])`: escolhe o endpoint por
  `card.conversationId ?? card.contactId`. Usa `data[0]` como proposta atual.
- `useQuery(['ai-summary', convId])`: `enabled: !!card.conversationId`. Loading
  próprio (IA demora alguns segundos) — não bloqueia as demais seções.
- Cada seção tem **loading / vazio / erro independentes**. Erro numa seção não
  derruba o diálogo (renderiza fallback local).
- Card sem `conversationId`: proposta vem por contato; recomendação mostra hint
  "vincule uma conversa"; "Abrir conversa" fica oculto.
- Fecha com Esc / clique no overlay / botão Fechar.

## Serviço

Adicionar em `pipelines.service.ts` (ou um pequeno client dedicado) tipos e chamadas:
- `getLatestProposal(card): Promise<Proposal | null>`
- `getAiSummary(conversationId, refresh?): Promise<AiSummary>`

Reaproveitar a instância `api` de `@/lib/api`. Tipos `Proposal` e `AiSummary`
declarados no serviço (espelhando os campos da API acima).

## Fora de escopo (YAGNI)

- Nenhuma edição inline no Card do Cliente (edição continua no `CardDialog`).
- Nenhum endpoint/prompt novo de recomendação específica de pipeline.
- Sem histórico de propostas (só a mais recente).

## Testes

- Frontend-only; validação manual E2E no board:
  1. Clicar num card com conversa → abre Card do Cliente (não o chat).
  2. Ver proposta detalhada + recomendação IA carregando e populando.
  3. "Abrir conversa" abre o chat; "Editar card" abre o editor.
  4. Card sem conversa → seções em estado vazio, sem "Abrir conversa".
- Se houver setup de testes de componente no repo, cobrir a lógica de seleção de
  endpoint (conversa vs contato) e os estados vazio/erro.
