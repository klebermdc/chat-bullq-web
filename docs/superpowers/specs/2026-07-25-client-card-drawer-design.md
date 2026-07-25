# Card do Cliente — Drawer lateral (Ficha completa no atendimento)

**Data:** 2026-07-25
**Autor:** Kleber + Claude
**Escopo:** Frontend apenas (`chat-bullq-web`). Nenhuma mudança de API.
**Branch base:** `fork/feat/conversation-tabs` (branch VIVA de deploy, tip = PR #105).
Criar branch própria a partir dela e subir via **PR** (nunca push direto).

---

## 1. Objetivo

Ao clicar no **nome** ou na **foto** do cliente no header da conversa, abrir um
**drawer lateral (desliza da direita)** que é a **ficha completa do cliente** no
meio do atendimento: identidade editável, tags do contato, o que o cliente está
pedindo (proposta + ficha do pedido + divergências + anotação manual) e o
negócio no funil.

O **Painel Inteligente** (botão ✨) é **enxugado** e passa a conter só o que é
apoio de atendimento por IA: Resumo IA, CallInsight e sugestões de
reengajamento. Sem duplicar dados de cliente/negócio/proposta entre os dois.

## 2. Decisões (fechadas no brainstorming)

| Tema | Decisão |
|---|---|
| Formato | Drawer slide-over pela **direita**, com backdrop. |
| Gatilho | Clique no avatar **ou** no nome do cliente no header. |
| Tags | **Só tags do contato** (`/tags/contact/...`), add/remove instantâneo. |
| Salvar identidade | **Autosave inline** (no blur), otimista, com toast e reversão no erro. |
| "O que está pedindo" | **Leitura** (última proposta + Ficha do Pedido + divergências) **+ campo de anotação manual** (autosave). |
| Painel Inteligente | **Enxugar**: fica só IA + sugestões. Cliente/Negócio/Proposta/Ficha **migram** pro drawer. |

## 3. Arquitetura

### 3.1 Componente novo — `client-card-drawer.tsx`
Local: `src/features/inbox/components/client-card-drawer.tsx`

```
interface ClientCardDrawerProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;   // reflete no header + lista (invalidate)
}
```

Estrutura visual (overlay `fixed inset-0 z-50`, backdrop `bg-black/40` que fecha
ao clicar; painel `w-full max-w-md ml-auto h-full` deslizando da direita com
transição; scroll interno; safe-area no mobile; dark mode):

1. **Topo** — avatar grande + nome + selo do canal + botão fechar (X).
2. **Identidade** (`ContactIdentityFields`) — Nome / Telefone / Email, cada um
   input com autosave no blur via `contactsService.update`.
3. **Tags do cliente** (`ContactTagsEditor`) — chips das tags do contato;
   toggle chama `tagsService.addToContact` / `removeFromContact` na hora;
   criar tag nova inline (reaproveita a UI de `TagMultiSelect`).
4. **O que está pedindo** (`ClientRequestSection`):
   - Última proposta (read-only): adultos/crianças, datas, parques `[dias]`,
     valor, "Abrir carrinho".
   - Ficha do Pedido (read-only): itens `qtd× produto (tipo)`, viagem,
     pedido em, e **bloco de divergências** (⚠️ N divergência(s), lista âmbar).
   - **Anotação do pedido** — textarea livre, autosave em
     `contact.metadata.requestNotes` (merge client-side do metadata).
5. **Negócio** (read-only) — Status / Pipeline / Etapa, do card por conversa.

### 3.2 Sub-componentes (arquivos focados)
- `contact-identity-fields.tsx` — 3 campos com autosave inline + hook de save.
- `contact-tags-editor.tsx` — tags do contato com add/remove imediato.
- `client-request-section.tsx` — proposta + ficha + divergência + anotação.

(Manter cada arquivo pequeno e testável isoladamente.)

### 3.3 Dados (services já existentes)
- Identidade: `contactsService.update(id, { name?, phone?, email?, metadata? })`
  — `PATCH /contacts/:id`. **metadata é substituído inteiro no backend**, então
  o save de `requestNotes` envia `{ ...contact.metadata, requestNotes }`.
- Tags: `tagsService.list / create / addToContact / removeFromContact`.
- Proposta: `proposalsService.listForContact(contactId)` → `[0]`.
- Ficha: `orderFichaService.getForConversation(conversation.id)`.
- Negócio: `pipelinesService.listByConversation(conversation.id)`.

Queries via `useQuery` (mesmas keys do painel, pra reuso de cache). Após
mutações, `invalidateQueries` das keys tocadas + `onUpdate()`.

## 4. Mudanças em arquivos existentes

### 4.1 `conversation-header.tsx`
- Estado `clientCardOpen`.
- Envolver **avatar + nome** num `<button>` (ou div clicável) com
  `cursor-pointer`, hover sutil e `title="Ver ficha do cliente"`, que faz
  `setClientCardOpen(true)`. Não quebrar o truncate/layout atual.
- Renderizar `<ClientCardDrawer ... onUpdate={onUpdate} />`.

### 4.2 `intelligent-panel.tsx` (enxugar)
- **Remover** as seções: Cliente, Negócio, Última proposta, Ficha do Pedido.
- **Manter**: Resumo IA (`SummaryCard`), `CallInsightBlock`,
  `ReengageSuggestionCard`, `ConversationSchedulesSection`.
- **Etapa** (badge de uma linha no topo): manter como glance rápido ao lado do
  Resumo IA (não é duplicação do bloco Negócio completo). — *ponto de ajuste
  fácil se preferir remover.*
- Remover imports que ficarem órfãos (proposals/orderFicha/pipelines conforme o
  que sair). CallInsight fica no painel (é resumo por IA de ligação).

## 5. Comportamento de save (autosave inline)
- Cada campo guarda valor local; no **blur**, se mudou vs. servidor: dispara
  `update` otimista, `toast.success`; em erro, `toast.error` + reverte pro
  último valor bom.
- Telefone é a identidade de roteamento do WhatsApp — editável (decisão do
  usuário), mas mantém o valor anterior em caso de erro.
- Anotação do pedido: mesmo padrão (blur/autosave), merge de metadata.

## 6. Estética
Fase de implementação usa a skill de web design: header do drawer com gradiente
sutil da marca (ametista/violeta→rosa), chips de tag coloridos, tipografia
limpa, densidade agradável, dark mode paritário, animação de entrada da direita.

## 7. Fora de escopo (YAGNI)
- Editar tags **de conversa** (origem/atendente) — decisão foi só tags de contato.
- Editar avatar/foto.
- Histórico de propostas (só a última).
- Qualquer mudança de backend.

## 8. Riscos / pegadinhas
- **Branch errada**: construir SÓ sobre `fork/feat/conversation-tabs` (ref local
  `feat/conversation-tabs` está velho; exige `git fetch fork`). A Ficha e o
  layout mobile-fullscreen do painel só existem na viva.
- **metadata substituído**: sempre mesclar antes de salvar `requestNotes`.
- Não regredir o mobile (painel vira fullscreen no mobile hoje; o drawer também
  precisa funcionar em telas pequenas — usa `w-full max-w-md`).

## 9. Critérios de aceite
1. Clicar no nome/foto abre o drawer da direita; backdrop/X/Esc fecham.
2. Editar Nome/Telefone/Email salva no blur, com toast, e persiste ao reabrir.
3. Adicionar/remover tag do contato reflete no drawer e nos selos do card.
4. Seção "O que está pedindo" mostra proposta + ficha + divergências reais; a
   anotação manual persiste.
5. Negócio mostra Status/Pipeline/Etapa reais.
6. Painel Inteligente não mostra mais Cliente/Negócio/Proposta/Ficha (sem
   duplicação); Resumo IA + CallInsight + sugestões + agendamentos intactos.
7. Dark mode e mobile OK; sem regressão no header.
