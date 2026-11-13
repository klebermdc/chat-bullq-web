import { api } from '@/lib/api';

const unwrap = <T,>(body: { data: T }): T => body.data;

export interface SellerCallCheck {
  canCall: boolean;
  canRequest: boolean;
  permission: string;
  windowOpen: boolean;
  dialerConfigured: boolean;
}

export interface SellerCallAccess {
  room: string;
  url: string;
  token: string;
}

export async function checkSellerCall(conversationId: string): Promise<SellerCallCheck> {
  const { data } = await api.post('/voice/seller-calls/check', { conversationId });
  return unwrap(data);
}

export async function requestCallPermission(conversationId: string): Promise<void> {
  await api.post('/voice/seller-calls/permission', { conversationId });
}

export async function startSellerCall(conversationId: string): Promise<SellerCallAccess> {
  const { data } = await api.post('/voice/seller-calls/start', { conversationId });
  return unwrap(data);
}

export async function endSellerCall(conversationId: string, room: string): Promise<void> {
  await api.post('/voice/seller-calls/end', { conversationId, room });
}

export type CallPhase = 'conectando' | 'chamando' | 'em_ligacao' | 'encerrada';

/** Estado da ligação a partir do atributo sip.callStatus do cliente na sala. */
export function phaseFromSipStatus(status: string | undefined, clientPresent: boolean): CallPhase {
  if (!clientPresent) return 'conectando';
  if (status === 'active') return 'em_ligacao';
  if (status === 'hangup' || status === 'disconnected') return 'encerrada';
  return 'chamando';
}

export const PHASE_LABEL: Record<CallPhase, string> = {
  conectando: 'Conectando…',
  chamando: 'Chamando no WhatsApp…',
  em_ligacao: 'Em ligação',
  encerrada: 'Ligação encerrada',
};

/** O que fazer quando o vendedor clica em ligar. */
export function callAction(c: SellerCallCheck): 'LIGAR' | 'PEDIR_PERMISSAO' | 'AVISAR' {
  if (c.canCall) return 'LIGAR';
  if (c.canRequest) return 'PEDIR_PERMISSAO';
  return 'AVISAR';
}

export function blockedReason(c: SellerCallCheck): string {
  if (!c.dialerConfigured) return 'A conexão de ligações ainda não está configurada.';
  if (!c.windowOpen) return 'O cliente ainda não permitiu ligações e a janela de 24h está fechada: peça para ele mandar uma mensagem e tente de novo.';
  return 'O cliente ainda não permitiu ligações e a Meta não deixa pedir de novo agora (limite de 1 pedido por dia).';
}

export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
