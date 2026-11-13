'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduleCallbackDialog } from './schedule-callback-dialog';

interface Props {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  /** Dono da conversa: gestão marca na agenda dele; atendente marca na própria. */
  assignedToId: string | null;
  assignedToName: string | null;
  isManager: boolean;
}

/** Ícone do topo da conversa: marca um retorno com o cliente na agenda. */
export function ScheduleCallbackButton({ conversationId, contactId, contactName, assignedToId, assignedToName, isManager }: Props) {
  const [open, setOpen] = useState(false);
  const owner = isManager ? assignedToId ?? undefined : undefined;
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Marcar retorno" aria-label="Marcar retorno">
        <CalendarPlus className="size-4" />
      </Button>
      <ScheduleCallbackDialog
        open={open}
        onClose={() => setOpen(false)}
        contactId={contactId}
        conversationId={conversationId}
        contactName={contactName}
        ownerUserId={owner}
        ownerName={owner ? assignedToName ?? undefined : undefined}
      />
    </>
  );
}
