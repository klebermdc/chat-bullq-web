'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { inboxService, type Conversation } from '../services/inbox.service';
import { membersService } from '@/features/settings/services/members.service';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';
import { roleLabel } from '@/lib/role-labels';
import { MemberAvatar } from './transfer-dialog';
import { canRemoveParticipant, participantCandidates } from '../lib/participants';

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  /** Papel do usuário na org — ADM/Owner podem tirar qualquer vendedor. */
  isManager: boolean;
  onChanged?: () => void;
}

/**
 * Conversa compartilhada: inclui outro vendedor na conversa. O incluído vê e
 * responde, mas o dono continua o mesmo (SLA, placar e aba Esperando seguem
 * com ele). Quem pode tirar: a própria pessoa (sair), o dono ou a gestão.
 */
export function ParticipantsDialog({
  open,
  onClose,
  conversation,
  isManager,
  onChanged,
}: Props) {
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const participantsKey = ['conversation-participants', conversation.id];
  const { data: participants = [] } = useQuery({
    queryKey: participantsKey,
    queryFn: () => inboxService.listParticipants(conversation.id),
    enabled: open,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
    enabled: open,
  });

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const candidates = useMemo(
    () =>
      participantCandidates(
        members,
        participants.map((p) => p.userId),
        conversation.assignedToId,
        search,
      ),
    [members, participants, search, conversation.assignedToId],
  );

  const canRemove = (userId: string) =>
    canRemoveParticipant({
      targetId: userId,
      currentUserId,
      ownerId: conversation.assignedToId,
      isManager,
    });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: participantsKey });
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
    qc.invalidateQueries({ queryKey: ['messages', conversation.id] });
    onChanged?.();
  };

  const handleAdd = async (userId: string, name: string) => {
    setBusyId(userId);
    try {
      await inboxService.addParticipant(conversation.id, userId);
      toast.success(`${name} foi incluído na conversa`);
      setSearch('');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível incluir o vendedor'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    const leaving = userId === currentUserId;
    setBusyId(userId);
    try {
      await inboxService.removeParticipant(conversation.id, userId);
      toast.success(leaving ? 'Você saiu da conversa' : `${name} saiu da conversa`);
      refresh();
      if (leaving) onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível tirar o vendedor'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vendedores na conversa"
      description="Quem você incluir vê e responde este cliente. O dono continua o mesmo."
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <section aria-labelledby="participants-current">
        <h3
          id="participants-current"
          className="mb-1.5 text-sm font-medium text-foreground"
        >
          Na conversa
        </h3>
        <ul className="rounded-lg border border-border">
          {conversation.assignedTo && (
            <li className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm">
              <MemberAvatar
                name={conversation.assignedTo.name}
                avatarUrl={conversation.assignedTo.avatarUrl}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {conversation.assignedTo.name}
              </span>
              <span className="text-[11px] text-muted-foreground">Dono</span>
            </li>
          )}
          {participants.map((p) => {
            const isMe = p.userId === currentUserId;
            return (
              <li
                key={p.userId}
                className="flex min-h-11 items-center gap-2.5 border-t border-border px-3 py-2 text-sm first:border-t-0"
              >
                <MemberAvatar name={p.user.name} avatarUrl={p.user.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {p.user.name}
                    {isMe && (
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </p>
                  {p.addedBy && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      Incluído por {p.addedBy.name}
                    </p>
                  )}
                </div>
                {canRemove(p.userId) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={busyId === p.userId}
                    onClick={() => handleRemove(p.userId, p.user.name)}
                  >
                    {isMe ? 'Sair' : 'Tirar'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="participants-add" className="mt-4">
        <h3 id="participants-add" className="mb-1.5 text-sm font-medium text-foreground">
          Incluir vendedor
        </h3>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar vendedor…"
            aria-label="Buscar vendedor"
            className={`${controlCls} w-full pl-9`}
          />
        </div>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
          {candidates.length === 0 && (
            <EmptyState
              icon={Users}
              size="sm"
              title="Ninguém para incluir"
              description={search.trim() ? 'Confira o nome ou o e-mail digitado.' : undefined}
            />
          )}
          {candidates.map((m) => (
            <div
              key={m.user.id}
              className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm"
            >
              <MemberAvatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{m.user.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {roleLabel(m.role)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={busyId === m.user.id}
                onClick={() => handleAdd(m.user.id, m.user.name)}
                aria-label={`Incluir ${m.user.name}`}
              >
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Incluir
              </Button>
            </div>
          ))}
        </div>
      </section>
    </Dialog>
  );
}
