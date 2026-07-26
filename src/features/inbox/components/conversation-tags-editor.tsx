'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Plus, X, Loader2, Tag as TagIcon } from 'lucide-react';
import { tagsService } from '@/features/settings/services/tags.service';

interface AppliedTag {
  id: string;
  name: string;
  color: string;
}

interface ConversationTagsEditorProps {
  conversationId: string;
  /** Tags que a conversa já tem (inclui as automáticas: origem, atendente, IA). */
  initialTags: AppliedTag[];
  onChanged: () => void;
}

const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];

export function ConversationTagsEditor({ conversationId, initialTags, onChanged }: ConversationTagsEditorProps) {
  const queryClient = useQueryClient();
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => tagsService.list() });

  // Estado otimista das tags aplicadas; ressincroniza quando muda de conversa
  // ou quando o conjunto externo (conversation.tags) muda.
  const [applied, setApplied] = useState<AppliedTag[]>(initialTags);
  useEffect(() => {
    setApplied(initialTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, initialTags.map((t) => t.id).sort().join(',')]);

  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const appliedIds = new Set(applied.map((t) => t.id));
  const available = allTags.filter((t) => !appliedIds.has(t.id));
  const q = query.trim().toLowerCase();
  const filtered = q ? available.filter((t) => t.name.toLowerCase().includes(q)) : available;
  const exactExists = allTags.some((t) => t.name.toLowerCase() === q);

  const add = async (tag: AppliedTag) => {
    if (busy) return;
    setBusy(true);
    setApplied((a) => [...a, tag]);
    try {
      await tagsService.addToConversation(conversationId, tag.id);
      onChanged();
    } catch (err) {
      setApplied((a) => a.filter((t) => t.id !== tag.id));
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar tag');
    } finally {
      setBusy(false);
      setQuery('');
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const prev = applied;
    setApplied((a) => a.filter((t) => t.id !== id));
    try {
      await tagsService.removeFromConversation(conversationId, id);
      onChanged();
    } catch (err) {
      setApplied(prev);
      toast.error(err instanceof Error ? err.message : 'Erro ao remover tag');
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    const name = query.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const color = PALETTE[applied.length % PALETTE.length];
      const tag = await tagsService.create({ name, color });
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      setApplied((a) => [...a, { id: tag.id, name: tag.name, color: tag.color }]);
      await tagsService.addToConversation(conversationId, tag.id);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar tag');
    } finally {
      setBusy(false);
      setQuery('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {applied.length === 0 && (
        <span className="text-xs text-muted-foreground">Sem tags ainda</span>
      )}

      {applied.map((tag) => (
        <span
          key={tag.id}
          className="group/tag inline-flex items-center gap-1 rounded-full border border-transparent py-1 pl-2.5 pr-1 text-xs font-medium text-white"
          style={{ backgroundColor: tag.color || '#6366f1' }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => remove(tag.id)}
            disabled={busy}
            aria-label={`Remover tag ${tag.name}`}
            title={`Remover tag ${tag.name}`}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 transition-colors hover:bg-white/45 disabled:opacity-50"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {/* Dropdown: buscar/selecionar/criar */}
      <Popover className="relative">
        <PopoverButton
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500 outline-none transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Adicionar
        </PopoverButton>
        <PopoverPanel
          anchor="bottom start"
          className="z-[70] mt-1.5 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl outline-none [--anchor-gap:0.25rem]"
        >
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ou criar tag…"
            className="mb-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => add({ id: tag.id, name: tag.name, color: tag.color })}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }} />
                <span className="truncate">{tag.name}</span>
              </button>
            ))}

            {filtered.length === 0 && !query && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">Todas as tags já aplicadas.</p>
            )}

            {query.trim() && !exactExists && (
              <button
                type="button"
                onClick={createAndAdd}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar “{query.trim()}”
              </button>
            )}

            {query.trim() && filtered.length === 0 && exactExists && (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">Essa tag já está aplicada.</p>
            )}
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  );
}
