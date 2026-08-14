'use client';

import { InboxScreen } from '@/features/inbox/components/inbox-screen';

/**
 * Inbox só do Instagram. Trava por TIPO de canal, não por channelId — a org
 * tem mais de um canal IG, e canais novos entram sozinhos.
 */
export default function InboxInstagramPage() {
  return <InboxScreen channelType="INSTAGRAM" />;
}
