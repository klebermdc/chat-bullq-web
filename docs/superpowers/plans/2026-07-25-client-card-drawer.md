# Card do Cliente — Drawer lateral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao clicar no nome/foto do cliente no header, abrir um drawer lateral (direita) com a ficha completa do cliente — identidade editável, tags, o que está pedindo (proposta + ficha + divergências + anotação) e negócio — e enxugar o Painel Inteligente para só IA + sugestões.

**Architecture:** Frontend puro em `chat-bullq-web`. Um `ClientCardDrawer` (Headless UI `Dialog` deslizando da direita) busca o contato completo via `contactsService.getById` e compõe 3 sub-componentes focados + a seção Negócio. O header vira gatilho. O `IntelligentPanel` perde as seções migradas. Zero mudança de API.

**Tech Stack:** Next.js (App Router) + React, TanStack Query v5, `@headlessui/react` v2 (`Dialog`/`Transition`), Tailwind, `lucide-react`, `sonner` (toasts).

**Testing note (adaptação honesta):** o web **não tem** infra de teste unitário (sem vitest/jest/testing-library, zero `.test/.spec`). Seguindo o padrão real do projeto, cada task valida por **typecheck** (`npx tsc --noEmit`) e a milestone final por **`npm run lint` + `npm run build`** + smoke manual no app. Não vamos introduzir um test runner (YAGNI, e fora do escopo aprovado).

**Base branch:** `fork/feat/conversation-tabs` (branch VIVA de deploy; ref local `feat/conversation-tabs` está velho — exige `git fetch fork`).

---

### Task 1: Setup do worktree/branch

**Files:** nenhum de código; cria worktree isolado (convenção `.wt-*` do projeto).

- [ ] **Step 1: Fetch do fork e criar worktree a partir da branch viva**

REQUIRED SUB-SKILL: `superpowers:using-git-worktrees`.

Run (a partir de `chat-bullq-web`):
```bash
git fetch fork
git worktree add -b feat/client-card-drawer ../.wt-client-card-web fork/feat/conversation-tabs
```
Expected: worktree criado em `../.wt-client-card-web` na branch nova `feat/client-card-drawer` baseada na viva.

- [ ] **Step 2: Instalar deps no worktree**

Run: `cd ../.wt-client-card-web && npm install`
Expected: instala sem erro (mesmo lockfile da viva).

- [ ] **Step 3: Copiar o spec pra dentro do worktree e commitar**

Copie `docs/superpowers/specs/2026-07-25-client-card-drawer-design.md` e este plano para o worktree (se não vieram na branch base) e:
```bash
git add docs/superpowers/
git commit -m "docs: spec + plano do card do cliente (drawer lateral)"
```
Expected: commit criado. **Todo o restante do plano roda dentro de `../.wt-client-card-web`.**

---

### Task 2: `ContactIdentityFields` — Nome/Telefone/Email com autosave inline

**Files:**
- Create: `src/features/inbox/components/contact-identity-fields.tsx`

- [ ] **Step 1: Criar o componente**

`src/features/inbox/components/contact-identity-fields.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';

interface ContactIdentityFieldsProps {
  contact: Contact;
  onSaved: () => void;
}

type Field = 'name' | 'phone' | 'email';

const rowCls = 'grid grid-cols-[84px_1fr] items-center gap-2 border-b border-border/60 py-1.5';
const labelCls = 'text-[13px] text-muted-foreground';
const inputCls =
  'w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm font-medium text-foreground outline-none transition-colors hover:border-border focus:border-primary focus:bg-background focus:text-left disabled:opacity-60';

export function ContactIdentityFields({ contact, onSaved }: ContactIdentityFieldsProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    name: contact.name ?? '',
    phone: contact.phone ?? '',
    email: contact.email ?? '',
  });

  // Ressincroniza se o contato for atualizado por fora (realtime/refetch).
  useEffect(() => {
    setValues({ name: contact.name ?? '', phone: contact.phone ?? '', email: contact.email ?? '' });
  }, [contact.id, contact.name, contact.phone, contact.email]);

  const save = useMutation({
    mutationFn: (patch: Partial<Contact>) => contactsService.update(contact.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', contact.id] });
      onSaved();
    },
  });

  const commit = (field: Field) => {
    const next = values[field].trim();
    const prev = (contact[field] ?? '') as string;
    if (next === prev.trim()) return;
    // Telefone é a identidade de roteamento — não deixa apagar; reverte.
    if (field === 'phone' && !next) {
      setValues((v) => ({ ...v, phone: prev }));
      return;
    }
    save.mutate({ [field]: next || null } as Partial<Contact>, {
      onSuccess: () => toast.success('Contato atualizado'),
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
        setValues((v) => ({ ...v, [field]: prev }));
      },
    });
  };

  const fields: Array<{ key: Field; label: string; type: string; placeholder: string }> = [
    { key: 'name', label: 'Nome', type: 'text', placeholder: 'Sem nome' },
    { key: 'phone', label: 'Telefone', type: 'text', placeholder: '—' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'Adicionar email' },
  ];

  return (
    <div>
      {fields.map((f) => (
        <div key={f.key} className={rowCls}>
          <label className={labelCls}>{f.label}</label>
          <input
            type={f.type}
            value={values[f.key]}
            placeholder={f.placeholder}
            disabled={save.isPending}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            onBlur={() => commit(f.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setValues((v) => ({ ...v, [f.key]: (contact[f.key] ?? '') as string }));
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={inputCls}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (0 erros). O componente ainda não é usado; só precisa tipar.

- [ ] **Step 3: Commit**

```bash
git add src/features/inbox/components/contact-identity-fields.tsx
git commit -m "feat(client-card): campos de identidade com autosave inline"
```

---

### Task 3: `ContactTagsEditor` — tags do contato com add/remove imediato

**Files:**
- Create: `src/features/inbox/components/contact-tags-editor.tsx`

- [ ] **Step 1: Criar o componente** (reaproveita a UI de chips do `TagMultiSelect`, mas chama os endpoints de tag de contato na hora)

`src/features/inbox/components/contact-tags-editor.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Plus, Loader2, Tag as TagIcon, X } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';

interface ContactTagsEditorProps {
  contactId: string;
  /** ids das tags que o contato já tem. */
  selectedIds: string[];
  onChanged: () => void;
}

const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

export function ContactTagsEditor({ contactId, selectedIds, onChanged }: ContactTagsEditorProps) {
  const queryClient = useQueryClient();
  const { data: tags = [], isLoading } = useQuery({ queryKey: ['tags'], queryFn: () => tagsService.list() });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[4]);
  const [creating, setCreating] = useState(false);

  const selected = new Set(selectedIds);

  const toggle = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      if (selected.has(id)) await tagsService.removeFromContact(contactId, id);
      else await tagsService.addToContact(contactId, id);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar tag');
    } finally {
      setBusyId(null);
    }
  };

  const resetAdd = () => { setAdding(false); setNewName(''); setNewColor(PALETTE[4]); };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await tagsService.create({ name, color: newColor });
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      await tagsService.addToContact(contactId, tag.id); // já aplica no contato
      onChanged();
      resetAdd();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tag');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando tags…</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && !adding && (
          <span className="text-xs text-muted-foreground">Nenhuma tag ainda —</span>
        )}
        {tags.map((tag) => {
          const isSel = selected.has(tag.id);
          const isBusy = busyId === tag.id;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              disabled={!!busyId}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                isSel
                  ? 'border-transparent text-white'
                  : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
              style={isSel ? { backgroundColor: tag.color || '#6366f1' } : undefined}
            >
              {isBusy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isSel ? (
                <Check className="h-3 w-3" />
              ) : (
                <TagIcon className="h-3 w-3" style={{ color: tag.color || undefined }} />
              )}
              {tag.name}
            </button>
          );
        })}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={!!busyId}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400"
          >
            <Plus className="h-3 w-3" /> Nova tag
          </button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <input
            autoFocus
            type="text"
            placeholder="Nome da tag"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
              else if (e.key === 'Escape') resetAdd();
            }}
            className="h-8 flex-1 min-w-[120px] rounded-md border border-zinc-300 bg-white px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex items-center gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                title={c}
                className={`h-5 w-5 rounded-full transition-transform ${newColor === c ? 'scale-110 ring-2 ring-offset-1 ring-zinc-400 dark:ring-offset-zinc-800' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Criar
          </button>
          <button type="button" onClick={resetAdd} className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/features/inbox/components/contact-tags-editor.tsx
git commit -m "feat(client-card): editor de tags do contato (add/remove imediato)"
```

---

### Task 4: `ClientRequestSection` — proposta + ficha + divergências + anotação

**Files:**
- Create: `src/features/inbox/components/client-request-section.tsx`

**Contexto de tipos (já existentes na branch base):**
- `Proposal`: `adults:number`, `children:number`, `startDate:string`, `endDate:string`, `parks:{nome:string;dias:number}[]`, `currency:string`, `totalValue:number|string`, `checkoutUrl:string`.
- `OrderFicha` (`@/features/order-ficha/types`): `items:{produto:string;quantidade:number;tipo?:string|null}[]`, `travelDatesText:string|null`, `requestedAt:string|null`, `divergences:{kind:string;message:string;detectedAt:string}[]`.
- `Contact.metadata: Record<string, any>` — guardamos a anotação em `metadata.requestNotes`. **O backend substitui o metadata inteiro**, então mesclamos client-side.

- [ ] **Step 1: Criar o componente**

`src/features/inbox/components/client-request-section.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contactsService, type Contact } from '@/features/contacts/services/contacts.service';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';

interface ClientRequestSectionProps {
  contact: Contact;
  conversationId: string;
  onSaved: () => void;
}

export function ClientRequestSection({ contact, conversationId, onSaved }: ClientRequestSectionProps) {
  const { data: proposals } = useQuery({
    queryKey: ['proposals', contact.id],
    queryFn: () => proposalsService.listForContact(contact.id),
    enabled: !!contact.id,
  });
  const lastProposal = proposals?.[0];

  const { data: orderFicha } = useQuery({
    queryKey: ['order-ficha', conversationId],
    queryFn: () => orderFichaService.getForConversation(conversationId),
  });

  const initialNote = (contact.metadata?.requestNotes as string) ?? '';
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setNote((contact.metadata?.requestNotes as string) ?? ''); }, [contact.id]);

  const commitNote = async () => {
    const next = note.trim();
    if (next === initialNote.trim()) return;
    setSaving(true);
    try {
      await contactsService.update(contact.id, {
        metadata: { ...(contact.metadata ?? {}), requestNotes: next },
      });
      toast.success('Anotação salva');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
      setNote(initialNote);
    } finally {
      setSaving(false);
    }
  };

  const hasAny = !!lastProposal || (orderFicha?.items?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {lastProposal && (
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Última proposta</p>
          <p className="text-sm">
            {lastProposal.adults} adulto(s)
            {lastProposal.children > 0 ? ` e ${lastProposal.children} criança(s)` : ''}{' · '}
            {new Date(lastProposal.startDate).toLocaleDateString('pt-BR')} a{' '}
            {new Date(lastProposal.endDate).toLocaleDateString('pt-BR')}
          </p>
          <ul className="mt-1 text-sm text-muted-foreground">
            {lastProposal.parks.map((p, i) => (<li key={i}>{p.nome} [{p.dias} dias]</li>))}
          </ul>
          <p className="mt-1 text-sm font-semibold">
            {lastProposal.currency}{' '}
            {Number(lastProposal.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <a href={lastProposal.checkoutUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Abrir carrinho
          </a>
        </div>
      )}

      {!!orderFicha?.items?.length && (
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Ficha do Pedido
            {!!orderFicha.divergences?.length && (
              <span className="normal-case text-amber-700 dark:text-amber-400">
                ⚠️ {orderFicha.divergences.length} divergência(s)
              </span>
            )}
          </p>
          <ul className="mt-1 text-sm text-muted-foreground">
            {orderFicha.items.map((it, i) => (
              <li key={i}>{it.quantidade}× {it.produto}{it.tipo ? ` (${it.tipo})` : ''}</li>
            ))}
          </ul>
          {orderFicha.travelDatesText && (
            <p className="mt-1 text-sm text-muted-foreground">Viagem: {orderFicha.travelDatesText}</p>
          )}
          {orderFicha.requestedAt && (
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido em: {new Date(orderFicha.requestedAt).toLocaleString('pt-BR')}
            </p>
          )}
          {!!orderFicha.divergences?.length && (
            <div className="mt-2 rounded-md border border-amber-300/50 bg-amber-50/60 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              {orderFicha.divergences.map((d, i) => (
                <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400">• {d.message}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Anotação do pedido</p>
        <textarea
          value={note}
          disabled={saving}
          placeholder="O que o cliente está pedindo (datas, parques, produtos)…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={commitNote}
          rows={3}
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        />
      </div>

      {!hasAny && !note.trim() && (
        <p className="text-sm text-muted-foreground">
          Nenhuma proposta ou ficha ainda. Use a anotação acima para registrar o que o cliente pediu.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar os nomes de campo do tipo `Proposal`**

Run: `git show fork/feat/conversation-tabs:src/features/proposals/types.ts | grep -nE "adults|children|startDate|endDate|parks|nome|dias|currency|totalValue|checkoutUrl"`
Expected: todos os campos usados existem com esses nomes. Se algum divergir, ajuste o componente para o nome real antes do typecheck.

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/features/inbox/components/client-request-section.tsx
git commit -m "feat(client-card): seção 'o que está pedindo' (proposta + ficha + anotação)"
```

---

### Task 5: `ClientCardDrawer` — o drawer que compõe tudo

**Files:**
- Create: `src/features/inbox/components/client-card-drawer.tsx`

**Contexto de tipos:** `ConversationCard` (`@/features/pipelines/services/pipelines.service`) tem `status:'WON'|'LOST'|string`, `stage:{name:string}`, `pipeline:{name:string}` (mesmo uso do `IntelligentPanel`). `contactsService.getById` retorna o `Contact` completo (com `email`, `metadata`, `tags:{tag:{id,name,color}}[]`).

- [ ] **Step 1: Criar o drawer**

`src/features/inbox/components/client-card-drawer.tsx`:
```tsx
'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { contactsService } from '@/features/contacts/services/contacts.service';
import { pipelinesService, type ConversationCard } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '@/features/inbox/services/inbox.service';
import { ContactIdentityFields } from './contact-identity-fields';
import { ContactTagsEditor } from './contact-tags-editor';
import { ClientRequestSection } from './client-request-section';

interface ClientCardDrawerProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function DrawerAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || 'avatar'} className="h-14 w-14 shrink-0 rounded-full bg-muted object-cover" />;
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
      {initials}
    </div>
  );
}

const sectionTitle = 'mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground';
const rowCls = 'flex items-center justify-between border-b border-border/60 py-2 text-sm';

export function ClientCardDrawer({ conversation, open, onClose, onUpdate }: ClientCardDrawerProps) {
  const contactId = conversation.contactId;

  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsService.getById(contactId),
    enabled: open && !!contactId,
  });

  const { data: cards } = useQuery({
    queryKey: ['conversation-cards', conversation.id],
    queryFn: () => pipelinesService.listByConversation(conversation.id),
    enabled: open,
  });
  const deal: ConversationCard | undefined = cards?.find((c) => c.status === 'WON') ?? cards?.[0];

  const handleChanged = () => { refetch(); onUpdate(); };
  const selectedTagIds = contact?.tags?.map((t) => t.tag.id) ?? [];

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[60]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex justify-end">
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-out duration-300" enterFrom="translate-x-full" enterTo="translate-x-0"
            leave="transform transition ease-in duration-200" leaveFrom="translate-x-0" leaveTo="translate-x-full"
          >
            <DialogPanel className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl">
              {/* Header com gradiente sutil da marca */}
              <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-5 py-4 backdrop-blur">
                <DrawerAvatar name={conversation.contact.name} avatarUrl={conversation.contact.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {conversation.contact.name || conversation.contact.phone || 'Cliente'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Ficha do cliente</p>
                </div>
                <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-6 px-5 py-5">
                {isLoading || !contact ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-2/3" />
                  </div>
                ) : (
                  <>
                    <section>
                      <h3 className={sectionTitle}>Identidade</h3>
                      <ContactIdentityFields contact={contact} onSaved={handleChanged} />
                    </section>

                    <section>
                      <h3 className={sectionTitle}>Tags do cliente</h3>
                      <ContactTagsEditor contactId={contactId} selectedIds={selectedTagIds} onChanged={handleChanged} />
                    </section>

                    <section>
                      <h3 className={sectionTitle}>O que está pedindo</h3>
                      <ClientRequestSection contact={contact} conversationId={conversation.id} onSaved={handleChanged} />
                    </section>

                    <section>
                      <h3 className={sectionTitle}>Negócio</h3>
                      {deal ? (
                        <div>
                          <div className={rowCls}>
                            <span className="text-muted-foreground">Status</span>
                            {deal.status === 'WON' ? (
                              <Badge variant="success">✓ Fechado</Badge>
                            ) : deal.status === 'LOST' ? (
                              <Badge variant="neutral">Perdido</Badge>
                            ) : (
                              <Badge variant="brand">{deal.stage.name}</Badge>
                            )}
                          </div>
                          <div className={rowCls}>
                            <span className="text-muted-foreground">Pipeline</span>
                            <span className="font-semibold">{deal.pipeline.name}</span>
                          </div>
                          <div className={rowCls}>
                            <span className="text-muted-foreground">Etapa</span>
                            <span className="font-semibold">{deal.stage.name}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum negócio vinculado.</p>
                      )}
                    </section>
                  </>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
```

- [ ] **Step 2: Confirmar exports do headless-ui v2**

Run: `node -e "const h=require('@headlessui/react'); console.log(['Dialog','DialogPanel','Transition','TransitionChild'].map(k=>k+':'+!!h[k]).join(' '))"`
Expected: `Dialog:true DialogPanel:true Transition:true TransitionChild:true`. Se `TransitionChild` vier `false`, troque por `Transition.Child` no código.

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/features/inbox/components/client-card-drawer.tsx
git commit -m "feat(client-card): drawer lateral (Headless UI Dialog, desliza da direita)"
```

---

### Task 6: Ligar o gatilho no header (avatar + nome clicáveis)

**Files:**
- Modify: `src/features/inbox/components/conversation-header.tsx`

- [ ] **Step 1: Importar o drawer + estado**

No topo, junto dos outros imports de componentes locais, adicione:
```tsx
import { ClientCardDrawer } from './client-card-drawer';
```
Dentro de `ConversationHeader`, junto dos outros `useState`, adicione:
```tsx
const [clientCardOpen, setClientCardOpen] = useState(false);
```

- [ ] **Step 2: Tornar o avatar clicável**

Substitua o bloco:
```tsx
        <HeaderAvatar
          name={conversation.contact.name}
          avatarUrl={conversation.contact.avatarUrl}
        />
```
por:
```tsx
        <button
          type="button"
          onClick={() => setClientCardOpen(true)}
          title="Ver ficha do cliente"
          className="shrink-0 rounded-full outline-none ring-primary/50 transition hover:opacity-90 focus-visible:ring-2"
        >
          <HeaderAvatar
            name={conversation.contact.name}
            avatarUrl={conversation.contact.avatarUrl}
          />
        </button>
```

- [ ] **Step 3: Tornar o nome clicável**

Substitua o bloco:
```tsx
          <div className="truncate text-sm font-semibold text-foreground">
            {conversation.contact.name || conversation.contact.phone || 'Desconhecido'}
          </div>
```
por:
```tsx
          <button
            type="button"
            onClick={() => setClientCardOpen(true)}
            title="Ver ficha do cliente"
            className="truncate text-left text-sm font-semibold text-foreground outline-none hover:text-primary hover:underline focus-visible:underline"
          >
            {conversation.contact.name || conversation.contact.phone || 'Desconhecido'}
          </button>
```

- [ ] **Step 4: Renderizar o drawer**

Logo antes do `<ContactNotesDialog ... />` (perto do fim do JSX, junto dos outros diálogos), adicione:
```tsx
      <ClientCardDrawer
        conversation={conversation}
        open={clientCardOpen}
        onClose={() => setClientCardOpen(false)}
        onUpdate={onUpdate}
      />
```

- [ ] **Step 5: Typecheck** — Run: `npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/features/inbox/components/conversation-header.tsx
git commit -m "feat(client-card): abre a ficha ao clicar no nome/foto do cliente"
```

---

### Task 7: Enxugar o `IntelligentPanel` (remove Cliente/Negócio/Proposta/Ficha)

**Files:**
- Modify: `src/features/inbox/components/intelligent-panel.tsx`

**Mantém:** Etapa (glance), `SummaryCard` (Resumo IA), `CallInsightBlock`, `ReengageSuggestionCard`, `ConversationSchedulesSection`.
**Remove:** seções Cliente, Negócio, Última proposta, Ficha do Pedido — que agora vivem no drawer.

- [ ] **Step 1: Remover imports órfãos**

Remova estas linhas de import:
```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { proposalsService } from '@/features/proposals/services/proposals.service';
import { orderFichaService } from '@/features/order-ficha/order-ficha.service';
```
Mantenha `pipelinesService`/`ConversationCard` (ainda usados no glance de Etapa), `Badge`, `Card`/`CardContent`, `Sparkles`/`X`/`RefreshCw`, `ReengageSuggestionCard`, `ConversationSchedulesSection`, `CallInsightBlock`, e os tipos de `inbox.service`.

- [ ] **Step 2: Enxugar o corpo de `IntelligentPanel`**

Substitua a função `IntelligentPanel` inteira (do `export function IntelligentPanel` até o `}` final do componente) por:
```tsx
export function IntelligentPanel({ conversation, onClose, onUseReply }: IntelligentPanelProps) {
  const { data: cards, isLoading } = useQuery({
    queryKey: ['conversation-cards', conversation.id],
    queryFn: () => pipelinesService.listByConversation(conversation.id),
  });
  // Prioriza um card ganho; senão o primeiro vinculado.
  const deal: ConversationCard | undefined =
    cards?.find((c) => c.status === 'WON') ?? cards?.[0];

  return (
    <aside className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:inset-auto lg:z-auto lg:w-[320px] lg:shrink-0 lg:border-r lg:border-border lg:pb-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <Sparkles className="h-4 w-4" /> Painel Inteligente
        </span>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Etapa</span>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">…</span>
        ) : deal ? (
          <Badge variant="brand">{deal.stage.name}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">fora do funil</span>
        )}
      </div>

      <SummaryCard conversation={conversation} onUseReply={onUseReply} />

      <div className="mt-3">
        <CallInsightBlock conversationId={conversation.id} />
      </div>

      <ReengageSuggestionCard conversationId={conversation.id} />

      <ConversationSchedulesSection conversationId={conversation.id} />
    </aside>
  );
}
```

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit`
Expected: PASS. Se acusar import não usado, remova-o. (`isLoading` continua usado no glance de Etapa.)

- [ ] **Step 4: Commit**
```bash
git add src/features/inbox/components/intelligent-panel.tsx
git commit -m "refactor(intel-panel): enxuga p/ IA+sugestões; cliente/negócio/proposta/ficha vão pro drawer"
```

---

### Task 8: Verificação final (lint + build + smoke)

**Files:** nenhum novo.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: sem erros novos nos arquivos tocados.

- [ ] **Step 2: Build de produção (typecheck completo do Next)**

Run: `npm run build`
Expected: `Compiled successfully`. Sem erro de tipos/import.

- [ ] **Step 3: Smoke manual no app**

REQUIRED SUB-SKILL: `run` (subir o app) — ou `npm run dev` e abrir o inbox.
Checklist (critérios de aceite do spec):
1. Clicar no nome **e** na foto abre o drawer da direita; backdrop/X/Esc fecham.
2. Editar Nome/Telefone/Email salva no blur (toast) e persiste ao reabrir.
3. Adicionar/remover tag reflete no drawer e nos selos do card na lista.
4. "O que está pedindo" mostra proposta + ficha + divergências; anotação persiste.
5. Negócio mostra Status/Pipeline/Etapa reais.
6. Painel ✨ não mostra mais Cliente/Negócio/Proposta/Ficha; Resumo IA + CallInsight + sugestões + agendamentos intactos.
7. Dark mode + tela estreita OK; header sem regressão.

- [ ] **Step 4: Finalizar a branch**

REQUIRED SUB-SKILL: `superpowers:finishing-a-development-branch`.
Abrir **PR** da `feat/client-card-drawer` → `feat/conversation-tabs` no fork `klebermdc` (nunca push direto na branch viva). Descrição com o que mudou + checklist de smoke.

---

## Self-Review (feito)

- **Cobertura do spec:** Identidade (T2), Tags contato (T3), O-que-pede + proposta/ficha/divergência/anotação (T4), Drawer direita + Negócio (T5), gatilho nome/foto (T6), enxugar painel (T7), aceite/deploy (T8). ✓
- **Placeholders:** nenhum — todo passo tem código/comando/expected reais.
- **Consistência de tipos:** `contactsService.getById`→`Contact{email,metadata,tags{tag{id,name,color}}}`; `onSaved`/`onChanged`/`onUpdate` encadeados via `handleChanged`; `ConversationCard.stage.name/pipeline.name/status`; `OrderFicha`/`Proposal` conferidos contra a branch viva (T4 Step 2 revalida `Proposal`). ✓
- **Pegadinhas cobertas:** branch viva (T1), metadata mesclado (T4), export headless-ui v2 (T5 Step 2), mobile/dark (T8). ✓
