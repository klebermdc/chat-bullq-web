'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ChevronDown, Search, UserPlus, X, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { inboxService, type Conversation } from '../services/inbox.service';
import {
  membersService,
  type Member,
} from '@/features/settings/services/members.service';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';
import { getInitials } from '@/lib/initials';
import { roleLabel } from '@/lib/role-labels';
import { controlSmCls } from '@/components/ui/control';

interface Props {
  conversation: Conversation;
  onChanged?: () => void;
}

function MemberAvatar({
  name,
  avatarUrl,
  size = 24,
}: {
  name: string | null;
  avatarUrl: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name) || '?';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
    >
      {initials}
    </div>
  );
}

export function AssignmentPopover({ conversation, onChanged }: Props) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => m.user.isActive)
      .filter((m) =>
        q
          ? m.user.name.toLowerCase().includes(q) ||
            m.user.email.toLowerCase().includes(q)
          : true,
      );
  }, [members, search]);

  const currentAssignee = useMemo(() => {
    if (!conversation.assignedToId) return null;
    return (
      members.find((m) => m.user.id === conversation.assignedToId) ?? null
    );
  }, [members, conversation.assignedToId]);

  const handleAssign = async (
    userId: string | null,
    label: string,
    closeFn: () => void,
  ) => {
    setBusy(true);
    try {
      await inboxService.assignTo(conversation.id, userId);
      toast.success(label);
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      onChanged?.();
      closeFn();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao atribuir'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover className="relative">
      <PopoverButton
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[open]:bg-muted disabled:opacity-50"
        disabled={busy}
        title={currentAssignee ? `Responsável: ${currentAssignee.user.name}` : 'Atribuir responsável'}
      >
        {currentAssignee ? (
          <>
            <MemberAvatar
              name={currentAssignee.user.name}
              avatarUrl={currentAssignee.user.avatarUrl}
              size={18}
            />
            <span className="hidden max-w-[120px] truncate @[64rem]/header:inline">
              {currentAssignee.user.name}
            </span>
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            <span>Atribuir</span>
          </>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 mt-1.5 w-64 rounded-xl border border-border bg-popover p-1 shadow-elevated outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:0.25rem]"
      >
        {({ close }) => (
          <>
            <div className="px-2 py-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar membro…"
                  aria-label="Buscar membro"
                  className={`${controlSmCls} w-full pl-7`}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {currentUser && (
                <button
                  onClick={() =>
                    handleAssign(
                      currentUser.id,
                      'Conversa atribuída a você',
                      close,
                    )
                  }
                  disabled={busy || conversation.assignedToId === currentUser.id}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 disabled:opacity-40"
                >
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">
                    Atribuir a mim
                  </span>
                </button>
              )}

              {conversation.assignedToId && (
                <button
                  onClick={() => handleAssign(null, 'Atribuição removida', close)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remover atribuição</span>
                </button>
              )}

              <div className="my-1 border-t border-border" />

              {filtered.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                  Nenhum membro encontrado
                </p>
              )}
              {filtered.map((m: Member) => {
                const isMe = m.user.id === currentUser?.id;
                const isCurrent = m.user.id === conversation.assignedToId;
                return (
                  <button
                    key={m.user.id}
                    onClick={() =>
                      handleAssign(
                        m.user.id,
                        `Conversa atribuída a ${m.user.name}`,
                        close,
                      )
                    }
                    disabled={busy || isCurrent}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                      isCurrent
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <MemberAvatar
                      name={m.user.name}
                      avatarUrl={m.user.avatarUrl}
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium text-foreground">
                        {m.user.name}
                        {isMe && (
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {roleLabel(m.role)}
                      </p>
                    </div>
                    {isCurrent && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
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
