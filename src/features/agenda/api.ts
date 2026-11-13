import { api } from '@/lib/api';

export type AppointmentStatus = 'MARCADO' | 'FEITO' | 'CANCELADO' | 'NAO_ATENDEU';
export type AppointmentKind = 'RETORNO_LIGACAO' | 'REUNIAO';
export type AppointmentSource = 'ALINE_VOZ' | 'ALINE_CHAT' | 'MANUAL';

export interface Appointment {
  id: string;
  ownerUserId: string;
  contactId: string;
  conversationId: string | null;
  cardId: string | null;
  startsAt: string;
  durationMin: number;
  kind: AppointmentKind;
  status: AppointmentStatus;
  source: AppointmentSource;
  notes: string | null;
  owner: { id: string; name: string };
  contact: { id: string; name: string | null; phone: string | null };
}

const unwrap = <T,>(body: { data: T }): T => body.data;

export const AGENDA_QUERY_KEY = ['agenda'] as const;

export async function fetchAgenda(params: { from: string; to: string; ownerUserId?: string }): Promise<Appointment[]> {
  const { data } = await api.get('/agenda', { params });
  return unwrap<Appointment[]>(data);
}

export async function fetchFreeSlots(params: { ownerUserId?: string; count?: number }): Promise<{ ownerUserId: string; slots: string[] }> {
  const { data } = await api.get('/agenda/free-slots', { params });
  return unwrap(data);
}

export async function createAppointment(payload: {
  contactId: string;
  startsAt: string;
  ownerUserId?: string;
  conversationId?: string;
  notes?: string;
  kind?: AppointmentKind;
}): Promise<Appointment> {
  const { data } = await api.post('/agenda', payload);
  return unwrap(data);
}

export async function rescheduleAppointment(id: string, startsAt: string): Promise<Appointment> {
  const { data } = await api.patch(`/agenda/${id}/reschedule`, { startsAt });
  return unwrap(data);
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const { data } = await api.patch(`/agenda/${id}/status`, { status });
  return unwrap(data);
}
