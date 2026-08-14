'use client';

import { InboxScreen } from '@/features/inbox/components/inbox-screen';
import { WHATSAPP_CHANNEL_TYPES } from '@/features/inbox/channel-types';

/** Inbox geral: só WhatsApp. O Instagram tem página própria. */
export default function InboxPage() {
  return <InboxScreen channelTypes={WHATSAPP_CHANNEL_TYPES} />;
}
