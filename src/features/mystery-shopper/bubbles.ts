export interface SimulatorMessage {
  id: string;
  from: 'CLIENTE' | 'EMPRESA';
  text: string;
  createdAt: string;
  status: string | null;
}

export type Tick = 'none' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Bubble {
  id: string;
  side: 'left' | 'right';
  text: string;
  createdAt: string;
  tick: Tick;
}

function tickFor(status: string | null): Tick {
  switch (status?.toUpperCase()) {
    case 'READ':
      return 'read';
    case 'SENT':
      return 'sent';
    case 'FAILED':
      return 'failed';
    default:
      // Mensagem de entrada já chegou ao Sendtur: sem status explícito conta como entregue.
      return 'delivered';
  }
}

/** Ponto de vista do cliente: o que ele escreve fica à direita, com tique; a equipe, à esquerda. */
export function toBubbles(messages: SimulatorMessage[]): Bubble[] {
  return messages.map((m) => ({
    id: m.id,
    side: m.from === 'CLIENTE' ? 'right' : 'left',
    text: m.text,
    createdAt: m.createdAt,
    tick: m.from === 'CLIENTE' ? tickFor(m.status) : 'none',
  }));
}
