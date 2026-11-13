'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import {
  fetchNumbers,
  fetchSimulator,
  NUMBERS_QUERY_KEY,
  sendSimulatorMessage,
  simulatorQueryKey,
  startBot,
  stopBot,
} from '../api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { BotPanel } from './bot-panel';
import { SimulatorChat } from './simulator-chat';

export const SIMULATOR_REFETCH_MS = 3000;
const MAX_TEXT = 2000;

export function SimulatorTab() {
  const queryClient = useQueryClient();
  const [numberId, setNumberId] = useState('');
  const [text, setText] = useState('');
  const { confirm, confirmDialog } = useConfirm();
  const chatRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);
  const numbers = useQuery({ queryKey: NUMBERS_QUERY_KEY, queryFn: fetchNumbers });
  const simulated = (numbers.data ?? []).filter((n) => n.isSimulated);
  const isSelectionValid = simulated.some((n) => n.id === numberId);
  const activeId = isSelectionValid ? numberId : (simulated[0]?.id ?? '');

  const state = useQuery({
    queryKey: simulatorQueryKey(activeId),
    queryFn: () => fetchSimulator(activeId),
    enabled: activeId !== '',
    refetchInterval: SIMULATOR_REFETCH_MS,
  });
  const messageCount = state.data?.messages.length ?? 0;

  // Selected client removed elsewhere: drop the stale selection.
  useEffect(() => {
    if (numberId !== '' && numbers.isSuccess && !isSelectionValid) setNumberId('');
  }, [numberId, numbers.isSuccess, isSelectionValid]);

  // Scroll only the chat box, and only when new messages arrive or the client changes.
  useEffect(() => {
    lastCountRef.current = 0;
  }, [activeId]);
  useEffect(() => {
    const el = chatRef.current;
    if (el && messageCount > lastCountRef.current) el.scrollTop = el.scrollHeight;
    lastCountRef.current = messageCount;
  }, [messageCount, activeId]);

  const send = useMutation({
    mutationFn: sendSimulatorMessage,
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: simulatorQueryKey(activeId) });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível enviar a mensagem.')),
  });

  const refreshState = () => queryClient.invalidateQueries({ queryKey: simulatorQueryKey(activeId) });
  const start = useMutation({
    mutationFn: startBot,
    onSuccess: refreshState,
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível iniciar o robô.')),
  });
  const stop = useMutation({
    mutationFn: stopBot,
    onSuccess: refreshState,
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível parar o robô.')),
  });
  const confirmStop = async () => {
    const ok = await confirm({
      title: 'Parar o robô?',
      description: 'O cliente simulado deixa de responder sozinho. Você ainda pode digitar à mão.',
      confirmLabel: 'Parar robô',
      destructive: true,
    });
    if (ok) stop.mutate(activeId);
  };

  const submit = () => {
    const value = text.trim();
    if (value === '' || activeId === '' || send.isPending) return;
    send.mutate({ numberId: activeId, text: value });
  };

  if (numbers.isLoading) return <LoadingState label="Carregando…" />;
  if (numbers.isError) {
    return (
      <p role="alert" className="text-sm text-urgent-ink">
        Não foi possível carregar os números.
      </p>
    );
  }
  if (simulated.length === 0) {
    return (
      <EmptyState
        title="Nenhum cliente simulado"
        description="Crie um cliente simulado na aba Números."
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="sim-number" className="text-sm text-muted-foreground">
          Cliente
        </label>
        <select
          id="sim-number"
          value={activeId}
          onChange={(e) => setNumberId(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
        >
          {simulated.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
              {n.contact.phone ? ` · ${n.contact.phone}` : ''}
            </option>
          ))}
        </select>
      </div>

      <BotPanel
        bot={state.data?.bot ?? null}
        isStarting={start.isPending}
        isStopping={stop.isPending}
        onStart={(persona) => start.mutate({ numberId: activeId, persona })}
        onStop={confirmStop}
      />

      <div ref={chatRef} className="flex h-[min(60vh,520px)] flex-col overflow-y-auto rounded-lg border border-border bg-card">
        {state.isError && (
          <p role="alert" className="p-3 text-sm text-urgent-ink">
            Não foi possível carregar a conversa.
          </p>
        )}
        <SimulatorChat messages={state.data?.messages ?? []} />
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="sim-text" className="sr-only">
          Mensagem do cliente
        </label>
        <textarea
          id="sim-text"
          rows={2}
          maxLength={MAX_TEXT}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Escreva como o cliente (Enter envia, Shift+Enter quebra linha)"
          className="min-h-[2.5rem] flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm" loading={send.isPending} disabled={text.trim() === ''}>
          Enviar
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Nada sai para o WhatsApp: este cliente só existe dentro do Sendtur.
      </p>
      {confirmDialog}
    </div>
  );
}
