'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRightLeft, Check, Loader2, Search, User, X } from 'lucide-react';
import { inboxService, type Conversation } from '../services/inbox.service';
import {
  membersService,
  type Member,
} from '@/features/settings/services/members.service';
import { useAuthStore } from '@/stores/auth-store';

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
  const initials = (name ?? '??').slice(0, 2).toUpperCase();
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
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800"
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

  // Fecha no Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
      toast.error(err?.response?.data?.message || 'Erro ao transferir');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Transferir cliente
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          Escolha o atendente que vai assumir. A transferência fica registrada no
          histórico da conversa.
        </p>

        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar atendente…"
            className="w-full rounded-md border border-zinc-200 bg-white py-2 pl-8 pr-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-100 dark:border-zinc-800">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-zinc-400">
              Nenhum atendente encontrado
            </p>
          )}
          {filtered.map((m: Member) => {
            const isMe = m.user.id === currentUser?.id;
            const isSelected = m.user.id === selectedId;
            return (
              <button
                key={m.user.id}
                onClick={() => setSelectedId(m.user.id)}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary/10 dark:bg-primary/20'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <MemberAvatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {m.user.name}
                    {isMe && (
                      <span className="ml-1 text-[10px] font-normal text-zinc-400">
                        (você)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {m.role.toLowerCase()}
                  </p>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <User className="h-3 w-3" />
            Motivo (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Ex.: cliente pediu especialista em pacotes família"
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleTransfer}
            disabled={!selectedId || busy}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}
