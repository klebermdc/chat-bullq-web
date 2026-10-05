'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState } from '@/components/ui/empty-state';
import { inboxService, type Conversation } from '../services/inbox.service';
import {
  membersService,
  type Member,
} from '@/features/settings/services/members.service';
import { useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/errors';
import { getInitials } from '@/lib/initials';
import { roleLabel } from '@/lib/role-labels';

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: Conversation;
  onTransferred?: () => void;
}

function MemberAvatar({
  name,
  avatarUrl,
  size = 28,
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

export function TransferDialog({
  open,
  onClose,
  conversation,
  onTransferred,
}: Props) {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => membersService.list(),
    staleTime: 60_000,
    enabled: open,
  });

  // Reset ao abrir.
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedId(null);
      setReason('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => m.user.isActive)
      // Não faz sentido transferir pra quem já é o dono.
      .filter((m) => m.user.id !== conversation.assignedToId)
      .filter((m) =>
        q
          ? m.user.name.toLowerCase().includes(q) ||
            m.user.email.toLowerCase().includes(q)
          : true,
      );
  }, [members, search, conversation.assignedToId]);

  const handleTransfer = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const target = members.find((m) => m.user.id === selectedId);
      await inboxService.transfer(conversation.id, selectedId, reason);
      toast.success(
        `Cliente transferido${target ? ` para ${target.user.name}` : ''}`,
      );
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      qc.invalidateQueries({ queryKey: ['messages', conversation.id] });
      onTransferred?.();
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao transferir'));
    } finally {
      setBusy(false);
    }
  };

  // O <Dialog> já renderiza em portal no <body> (escapa dos ancestrais com
  // transform do header), prende o foco e fecha com Esc.
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transferir cliente"
      description="Escolha o atendente que vai assumir. A transferência fica registrada no histórico da conversa."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleTransfer} disabled={!selectedId} loading={busy}>
            Transferir
          </Button>
        </>
      }
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar atendente…"
          aria-label="Buscar atendente"
          className={`${controlCls} w-full pl-9`}
        />
      </div>

      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            size="sm"
            title="Nenhum atendente encontrado"
            description={search.trim() ? 'Confira o nome ou o e-mail digitado.' : undefined}
          />
        )}
        {filtered.map((m: Member) => {
          const isMe = m.user.id === currentUser?.id;
          const isSelected = m.user.id === selectedId;
          return (
            <button
              key={m.user.id}
              type="button"
              onClick={() => setSelectedId(m.user.id)}
              aria-pressed={isSelected}
              className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                isSelected ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <MemberAvatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
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
              {isSelected && (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label
          htmlFor="transfer-reason"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="transfer-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="Ex.: cliente pediu especialista em pacotes família"
          className={`${controlCls} h-auto w-full resize-none py-2`}
        />
      </div>
    </Dialog>
  );
}
