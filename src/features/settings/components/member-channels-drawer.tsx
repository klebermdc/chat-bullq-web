'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Lock, X, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { channelsService, type Channel } from '@/features/channels/services/channels.service';
import { channelAccessService } from '@/features/settings/services/channel-access.service';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { channelTypeLabel } from '@/lib/channel-labels';

interface Props {
  open: boolean;
  onClose: () => void;
  member: { id: string; name: string; role: 'OWNER' | 'ADMIN' | 'AGENT' } | null;
  onSaved?: () => void;
}

/**
 * Drawer de gerenciar canais por membro.
 *
 * Regras de visibilidade reproduzidas no UI (espelho do ChannelAccessService):
 * - OWNER: acesso intrínseco a tudo, drawer fica read-only com mensagem.
 * - ADMIN: vê todos canais ORG por herança (mostrado como "Herdado"
 *          read-only) + precisa grant explícito pra cada PRIVATE
 *          (toggleable). Salva só os PRIVATE selecionados.
 * - AGENT: nada por herança — todos os canais são toggleable.
 */
export function MemberChannelsDrawer({ open, onClose, member, onSaved }: Props) {
  const isOwner = member?.role === 'OWNER';
  const enabled = open && !!member && !isOwner;

  const { data: channels, isLoading: loadingChannels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
    enabled: open,
  });

  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ['member-channels', member?.id],
    queryFn: () => channelAccessService.listMemberChannels(member!.id),
    enabled,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (access) setSelected(new Set(access.channelIds));
  }, [access]);

  // Pre-split por visibility quando member é ADMIN — ORG canais são
  // herdados (read-only), PRIVATE são toggleable.
  const { inherited, toggleable } = useMemo(() => {
    if (!channels || !member) {
      return { inherited: [] as Channel[], toggleable: [] as Channel[] };
    }
    if (member.role === 'ADMIN') {
      return {
        inherited: channels.filter((c) => c.visibility !== 'PRIVATE'),
        toggleable: channels.filter((c) => c.visibility === 'PRIVATE'),
      };
    }
    // AGENT: todos toggleable
    return { inherited: [] as Channel[], toggleable: channels };
  }, [channels, member]);

  // Esc fecha o painel, como nos diálogos do app.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !member) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Pra ADMIN: salva apenas os IDs PRIVATE selecionados (não interfere
      // nos ORG que são herdados). Pra AGENT: salva tudo selecionado.
      const toPersist =
        member.role === 'ADMIN'
          ? [...selected].filter((id) =>
              toggleable.some((c) => c.id === id),
            )
          : [...selected];
      await channelAccessService.setMemberChannels(member.id, toPersist);
      toast.success('Canais atualizados');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const headerSubtitle = isOwner
    ? 'Proprietário tem acesso a todos os canais — incluindo privados.'
    : member.role === 'ADMIN'
      ? 'Admin enxerga todos os canais públicos automaticamente. Para canais privados, é preciso liberar o acesso individualmente.'
      : 'Marque os canais que este operador pode ver e atender.';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Canais de ${member.name}`}
        className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-overlay"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Canais de {member.name}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isOwner ? (
            <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
              Acesso total. Não há restrição por canal para o proprietário.
            </div>
          ) : loadingChannels || loadingAccess ? (
            <LoadingState />
          ) : !channels?.length ? (
            <EmptyState
              size="sm"
              title="Nenhum canal configurado"
              description="Conecte um canal em Configurações → Canais para liberar o acesso aqui."
            />
          ) : (
            <div className="space-y-5">
              {inherited.length > 0 && (
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Globe aria-hidden="true" className="h-3 w-3" /> Herdados (acesso automático)
                  </h4>
                  <ul className="space-y-1">
                    {inherited.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 rounded-lg px-3 py-2"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
                          <Check aria-hidden="true" className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {channelTypeLabel(c.type)} · canal público
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {toggleable.length > 0 && (
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {member.role === 'ADMIN' ? (
                      <>
                        <Lock aria-hidden="true" className="h-3 w-3" /> Privados (precisa liberar)
                      </>
                    ) : (
                      'Canais'
                    )}
                  </h4>
                  <ul className="space-y-1">
                    {toggleable.map((c) => {
                      const checked = selected.has(c.id);
                      return (
                        <li key={c.id}>
                          <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(c.id)}
                              className="h-4 w-4 shrink-0 rounded border-input"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {c.name}
                              </p>
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                {channelTypeLabel(c.type)}
                                {c.visibility === 'PRIVATE' && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 text-[11px]">
                                    <Lock aria-hidden="true" className="h-2.5 w-2.5" /> privado
                                  </span>
                                )}
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {member.role === 'ADMIN' && toggleable.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Não existem canais privados nesta organização. O admin
                  enxerga todos os canais.
                </p>
              )}
            </div>
          )}
        </div>

        {!isOwner && (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={save} loading={saving}>
              Salvar
            </Button>
          </footer>
        )}
      </aside>
    </div>
  );
}
