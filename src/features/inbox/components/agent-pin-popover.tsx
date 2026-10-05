'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Bot, ChevronDown, Search, Check, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  inboxService,
  type Conversation,
} from '../services/inbox.service';
import {
  aiAgentsService,
  type AiAgent,
} from '@/features/ai-agents/services/ai-agents.service';
import { getErrorMessage } from '@/lib/errors';
import { controlSmCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';

/** Campo dos popovers do cabeçalho: 40px, canto de 12px, texto de 14px. */
const POPOVER_FIELD = 'h-10 rounded-xl px-3 text-sm';

interface Props {
  conversation: Conversation;
  onChanged?: () => void;
}

/**
 * Campo de busca do painel.
 *
 * O foco é dado num efeito, e NÃO via `autoFocus`. Este popover vive dentro do
 * painel de outro Popover (menu "⋯" do header): o React aplica `autoFocus` na
 * fase de layout, antes do ref do portal aninhado se registrar no popover pai.
 * O pai então enxerga o foco como "fora" e se fecha, levando este junto — o
 * painel abria e fechava no mesmo clique. No efeito o portal já está
 * registrado, e o foco não derruba mais o menu.
 */
function AgentSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar agente…"
      aria-label="Buscar agente"
      className={cn(controlSmCls, POPOVER_FIELD, 'w-full pl-9')}
    />
  );
}

const KIND_BADGE: Record<string, string> = {
  ORCHESTRATOR: 'bg-primary/10 text-primary',
  WORKER: 'bg-foreground/[0.07] text-muted-foreground',
};

export function AgentPinPopover({ conversation, onChanged }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => aiAgentsService.list(),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents
      .filter((a) => a.isActive)
      .filter((a) =>
        q
          ? a.name.toLowerCase().includes(q) ||
            (a.description ?? '').toLowerCase().includes(q)
          : true,
      );
  }, [agents, search]);

  const currentAgent = useMemo(() => {
    if (!conversation.activeAgentId) return null;
    return agents.find((a) => a.id === conversation.activeAgentId) ?? null;
  }, [agents, conversation.activeAgentId]);

  const handlePin = async (agent: AiAgent, closeFn: () => void) => {
    setBusyId(agent.id);
    try {
      const result = await inboxService.setActiveAgent(
        conversation.id,
        agent.id,
      );
      if (result.engaged) {
        toast.success(`${agent.name} assumiu a conversa`);
      } else {
        toast.info(
          `${agent.name} marcado como ativo, mas não engajou (${result.reason})`,
        );
      }
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      onChanged?.();
      closeFn();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao trocar agent'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover className="relative">
      <PopoverButton className="inline-flex h-10 max-w-full items-center gap-2 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Sparkles className="h-[18px] w-[18px] shrink-0" />
        {currentAgent ? (
          <span className="max-w-[160px] truncate">{currentAgent.name}</span>
        ) : (
          <span>IA</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-80 rounded-2xl border border-border bg-popover p-1.5 shadow-overlay outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.25rem]"
      >
        {({ close }) => (
          <>
            <div className="px-1 pb-1.5 pt-1">
              <p className="mb-2 px-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quem responde essa conversa
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <AgentSearchInput value={search} onChange={setSearch} />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">
                  Nenhum agente encontrado
                </p>
              )}
              {filtered.map((a) => {
                const isCurrent = a.id === conversation.activeAgentId;
                const isPending = busyId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => handlePin(a, close)}
                    disabled={isPending || isCurrent}
                    className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50 ${
                      isCurrent
                        ? 'bg-primary/10'
                        : 'hover:bg-primary/10'
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-semibold text-foreground">
                          {a.name}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            KIND_BADGE[a.kind] ?? KIND_BADGE.WORKER
                          }`}
                        >
                          {a.kind === 'ORCHESTRATOR' ? 'Orquestrador' : 'Auxiliar'}
                        </span>
                      </div>
                      {a.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {a.description}
                        </p>
                      )}
                    </div>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : isCurrent ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}
