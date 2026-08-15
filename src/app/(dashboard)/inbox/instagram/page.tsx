'use client';

import { InboxScreen } from '@/features/inbox/components/inbox-screen';
import { INSTAGRAM_CHANNEL_TYPES } from '@/features/inbox/channel-types';

/**
 * Inbox só do Instagram. Filtra por TIPO de canal, não por channelId — a
 * org tem mais de um canal IG e canais novos entram sozinhos.
 *
 * O acesso é gateado por `inbox.instagram.view` no DashboardLayout, e o
 * servidor reforça: Operador que force a URL recebe lista vazia.
 */
export default function InboxInstagramPage() {
  return <InboxScreen channelTypes={INSTAGRAM_CHANNEL_TYPES} />;
}
