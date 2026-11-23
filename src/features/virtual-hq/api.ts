import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

export type PresenceStatus = 'online' | 'away' | 'offline';
export type Department = 'diretoria' | 'comercial';
export type RoomAlert = 'calm' | 'attention' | 'alert';

export interface ClientCard {
  conversationId: string;
  name: string;
  phoneMasked: string | null;
  awaitingReply: boolean;
  lastInboundAt: string | null;
}

export interface GuideDate {
  contractId: string;
  clientName: string;
  date: string;
  parkLabel: string;
  purchased: boolean;
}

export interface Room {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  department: Department;
  presence: PresenceStatus;
  alert: RoomAlert;
  stats: {
    openTotal: number;
    awaitingReply: number;
    closedToday: number;
    assignedToday: number;
    avgPickupMinutes: number | null;
  };
  awaitingOldestSince: string | null;
  clients: ClientCard[];
  guide: { name: string; dates: GuideDate[] } | null;
}

export interface VirtualHqSnapshot {
  generatedAt: string;
  date: string;
  reception: { unassigned: number; oldestSince: string | null; enteredToday: number } | null;
  rooms: Room[];
}

export const VIRTUAL_HQ_KEY = ['virtual-hq'] as const;

/** Nulo quando a org não ligou o escritório (a API responde 404). */
export async function fetchSnapshot(): Promise<VirtualHqSnapshot | null> {
  try {
    const { data } = await api.get('/virtual-hq/snapshot');
    return data.data as VirtualHqSnapshot;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
}
