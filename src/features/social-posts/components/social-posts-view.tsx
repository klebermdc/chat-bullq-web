'use client';

import { useState } from 'react';
import { Instagram, Lightbulb, Lock, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { controlSmCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { isForbidden, useInstagramChannels, useSocialPosts } from '../hooks/use-social-posts';
import type { PostsTab } from '../lib/post-groups';
import { NewIdeaDialog, SuggestDialog } from './create-dialogs';
import { PostsBoard } from './posts-board';

type OpenDialog = 'suggest' | 'idea' | null;

const DESCRIPTION = 'A IA sugere posts para o Instagram. Você revisa, agenda ou publica.';

/** Tela de Publicações: cabeçalho com canal e criação, abas com os cartões. */
export function SocialPostsView({ isManager }: { isManager: boolean }) {
  const channels = useInstagramChannels(isManager);
  const posts = useSocialPosts(isManager);
  const [chosenChannelId, setChosenChannelId] = useState<string | null>(null);
  const [tab, setTab] = useState<PostsTab>('suggestions');
  const [dialog, setDialog] = useState<OpenDialog>(null);

  const channelList = channels.data ?? [];
  // Sem escolha, vale o primeiro canal; com um só canal, o seletor nem aparece.
  const channelId = chosenChannelId ?? channelList[0]?.id ?? null;
  const hasChannels = channelList.length > 0;

  if (!isManager || isForbidden(posts.error) || isForbidden(channels.error)) {
    return (
      <>
        <PageHeader title="Publicações" description={DESCRIPTION} />
        <EmptyState
          className="mt-6"
          icon={Lock}
          title="Esta tela é só para o dono e os administradores"
          description="Se você precisa cuidar do Instagram, peça acesso ao dono da organização."
        />
      </>
    );
  }

  const renderBody = () => {
    if (posts.isLoading || channels.isLoading) return <LoadingState label="Carregando publicações…" />;
    if (posts.isError || channels.isError) {
      return (
        <EmptyState
          title="Não deu para carregar as publicações"
          description={(posts.error ?? channels.error)?.message}
          action={
            <Button
              variant="outline"
              onClick={() => {
                void posts.refetch();
                void channels.refetch();
              }}
            >
              Tentar de novo
            </Button>
          }
        />
      );
    }
    if (!hasChannels) {
      return (
        <EmptyState
          icon={Instagram}
          title="Nenhum Instagram conectado"
          description="Conecte a conta do Instagram em Configurações → Canais para a IA poder sugerir posts."
        />
      );
    }
    return (
      <PostsBoard
        posts={posts.data ?? []}
        channels={channelList}
        channelId={channelList.length > 1 ? channelId : null}
        tab={tab}
        onTabChange={setTab}
        onSuggest={() => setDialog('suggest')}
      />
    );
  };

  const actions = (
    <>
      {channelList.length > 1 && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">Conta</span>
          <select
            value={channelId ?? ''}
            onChange={(event) => setChosenChannelId(event.target.value)}
            className={cn(controlSmCls, 'min-w-0 max-w-[12rem]')}
          >
            {channelList.map((c) => (
              <option key={c.id} value={c.id}>
                @{c.username || c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button variant="outline" onClick={() => setDialog('idea')} disabled={!hasChannels}>
        <Lightbulb aria-hidden="true" className="h-4 w-4" />
        Nova ideia
      </Button>
      <Button onClick={() => setDialog('suggest')} disabled={!hasChannels}>
        <Sparkles aria-hidden="true" className="h-4 w-4" />
        Sugerir posts
      </Button>
    </>
  );

  return (
    <>
      <PageHeader title="Publicações" description={DESCRIPTION} actions={actions} />
      <div className="mt-6">{renderBody()}</div>
      <SuggestDialog
        open={dialog === 'suggest'}
        onClose={() => setDialog(null)}
        channelId={channelId}
        onCreated={() => setTab('suggestions')}
      />
      <NewIdeaDialog
        open={dialog === 'idea'}
        onClose={() => setDialog(null)}
        channelId={channelId}
        onCreated={() => setTab('suggestions')}
      />
    </>
  );
}
