import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

export type PresenceStatus = 'online' | 'away' | 'offline';
export const DEPARTMENTS = ['diretoria', 'comercial', 'guiamento', 'tecnologia'] as const;
export type Department = (typeof DEPARTMENTS)[number];
export type DepartmentSource = 'role' | 'custom';
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
  /** Pode faltar (API antiga) ou vir com valor desconhecido: o mapa cai no padrão pelo papel. */
  department?: Department;
  departmentSource?: DepartmentSource;
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

export interface PosVendaItem {
  contractId: string;
  clientName: string;
  date: string;
  parkLabel: string;
  guideName: string;
}

export interface Areas {
  agency: { openTotal: number; awaitingReply: number; closedToday: number; assignedToday: number };
  posVenda: { ticketsPending: number; next: PosVendaItem[] } | null;
  financeiro: { unpaid: number; invoicesPending: number } | null;
  marketing: { leadsToday: number; byChannel: Array<{ channel: string; count: number }> } | null;
  iaCentral: { withAi: number; handedOffToday: number } | null;
}

export interface VirtualHqSnapshot {
  generatedAt: string;
  date: string;
  reception: { unassigned: number; oldestSince: string | null; enteredToday: number } | null;
  rooms: Room[];
  /** Nulo para o vendedor (só vê a própria sala); ausente em API antiga. */
  areas?: Areas | null;
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

/** Troca o departamento da sala; `null` volta ao padrão pelo papel. */
export async function updateRoomDepartment(userId: string, department: Department | null): Promise<void> {
  await api.patch(`/virtual-hq/rooms/${encodeURIComponent(userId)}/department`, { department });
}
