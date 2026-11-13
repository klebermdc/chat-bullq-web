'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { addSimulatedNumber, CHANNELS_QUERY_KEY, fetchChannels, NUMBERS_QUERY_KEY } from '../api';

const INPUT_CLS = 'h-9 rounded-lg border border-border bg-card px-3 text-sm';

/** Cria um cliente que só existe dentro do Sendtur: nada sai para o WhatsApp. */
export function SimulatedForm() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [profileName, setProfileName] = useState('');
  const [channelId, setChannelId] = useState('');
  const { data: channels } = useQuery({ queryKey: CHANNELS_QUERY_KEY, queryFn: fetchChannels });
  const selectedChannel = channelId || channels?.[0]?.id || '';
  const canSubmit = label.trim() !== '' && selectedChannel !== '';

  const create = useMutation({
    mutationFn: addSimulatedNumber,
    onSuccess: () => {
      toast.success('Cliente simulado criado. Use a aba Simulador para conversar como ele.');
      setLabel('');
      setProfileName('');
      queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEY });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível criar o cliente simulado.')),
  });

  return (
    <form
      className="space-y-2 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        const name = profileName.trim();
        create.mutate({
          label: label.trim(),
          channelId: selectedChannel,
          ...(name ? { profileName: name } : {}),
        });
      }}
    >
      <p className="text-sm font-medium">Novo cliente simulado</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="sim-label" className="sr-only">
          Apelido
        </label>
        <input
          id="sim-label"
          required
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Apelido (só você vê)"
          className={`${INPUT_CLS} flex-1`}
        />
        <label htmlFor="sim-profile" className="sr-only">
          Nome de perfil
        </label>
        <input
          id="sim-profile"
          maxLength={60}
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="Nome de perfil (opcional)"
          className={`${INPUT_CLS} flex-1`}
        />
        <label htmlFor="sim-channel" className="sr-only">
          Canal
        </label>
        <select
          id="sim-channel"
          value={selectedChannel}
          onChange={(e) => setChannelId(e.target.value)}
          className={INPUT_CLS}
        >
          {(channels ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" loading={create.isPending} disabled={!canSubmit}>
          Criar
        </Button>
      </div>
      {channels && channels.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum canal oficial do WhatsApp ativo.</p>
      )}
    </form>
  );
}
