'use client';

import { InboxScreen } from '@/features/inbox/components/inbox-screen';
import { INBOX_CHANNEL_TYPES } from '@/features/inbox/channel-types';

/** Inbox único: WhatsApp e Instagram juntos (Instagram só para quem pode). */
export default function InboxPage() {
  return <InboxScreen channelTypes={INBOX_CHANNEL_TYPES} />;
}
