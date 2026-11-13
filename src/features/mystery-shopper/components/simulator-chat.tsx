import { cn } from '@/lib/utils';
import { toBubbles, type SimulatorMessage, type Tick } from '../bubbles';

const TICK_LABEL: Record<Tick, string> = {
  none: '',
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓',
  failed: '!',
};

const TICK_A11Y: Record<Tick, string> = {
  none: '',
  sent: 'enviada',
  delivered: 'entregue',
  read: 'lida',
  failed: 'falhou',
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function SimulatorChat({ messages }: { messages: SimulatorMessage[] }) {
  const bubbles = toBubbles(messages);
  if (bubbles.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Escreva como o cliente.</p>;
  }
  return (
    <ul className="flex flex-col gap-2 p-3" aria-label="Conversa do cliente simulado">
      {bubbles.map((b) => (
        <li
          key={b.id}
          data-side={b.side}
          className={cn(
            'max-w-[80%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm',
            b.side === 'right' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted',
          )}
        >
          {b.text}
          <span className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
            {formatTime(b.createdAt)}
            {b.tick !== 'none' && (
              <span
                aria-label={TICK_A11Y[b.tick]}
                className={cn(b.tick === 'read' && 'font-bold opacity-100', b.tick === 'failed' && 'font-bold')}
              >
                {TICK_LABEL[b.tick]}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
