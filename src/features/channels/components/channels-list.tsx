'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Radio } from 'lucide-react';
import { channelsService } from '../services/channels.service';
import { ChannelCard } from './channel-card';
import { CreateChannelDialog } from './create-channel-dialog';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

export function ChannelsList() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', orgId],
    queryFn: () => channelsService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['channels'] });

  return (
    <div>
      <SettingsPageHeader
        title="Canais conectados"
        description="Gerencie seus canais de atendimento."
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Novo canal
          </Button>
        }
      />

      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-muted" />
          ))
        ) : channels && channels.length > 0 ? (
          channels.map((ch) => (
            <ChannelCard key={ch.id} channel={ch} onUpdate={refresh} />
          ))
        ) : (
          <EmptyState
            className="col-span-full rounded-xl border border-dashed border-border"
            icon={Radio}
            title="Nenhum canal configurado"
            description="Conecte seu primeiro canal para começar a receber mensagens."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Conectar canal
              </Button>
            }
          />
        )}
      </div>

      <CreateChannelDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />
    </div>
  );
}
