/*
 * Adaptado de DeskcommCRM (https://github.com/melgarafael/DeskcommCRM), MIT License, Copyright (c) 2026 Rafael Melgaço.
 * Origem: lib/notifications/push_client.ts
 */
import { api } from '@/lib/api';
import { useNotificationStore } from '../stores/notification-store';
import { sameKeyBytes, urlBase64ToUint8Array } from './push-keys';

export type PushSyncResult =
  | 'active'
  | 'not-granted'
  | 'unsupported'
  | 'server-disabled'
  | 'no-service-worker'
  | 'error';

/** O SW registra no `load`; fora de produção ele nem existe. */
const SW_READY_TIMEOUT_MS = 10_000;
/** Logout não pode ficar preso esperando a rede. */
const UNSUBSCRIBE_TIMEOUT_MS = 3_000;
const MAX_USER_AGENT = 500;

interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
}

function isPushCapable(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'PushManager' in window
    && 'serviceWorker' in navigator;
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function fetchConfig(): Promise<PushConfig> {
  const { data } = await api.get('/push/config');
  return data.data as PushConfig;
}

/**
 * Reaproveita a inscrição se foi feita com a chave atual do servidor; senão
 * refaz. Navegador que não informa a chave da inscrição fica com a que tem.
 */
async function currentSubscription(reg: ServiceWorkerRegistration, key: Uint8Array): Promise<PushSubscription> {
  const existing = await reg.pushManager.getSubscription();
  const existingKey = existing?.options.applicationServerKey;
  if (existing && (!existingKey || sameKeyBytes(existingKey, key))) return existing;
  if (existing) await existing.unsubscribe();
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
}

async function subscribeAndSave(reg: ServiceWorkerRegistration): Promise<PushSyncResult> {
  const config = await fetchConfig();
  if (!config.enabled || !config.publicKey) return 'server-disabled';
  const sub = await currentSubscription(reg, urlBase64ToUint8Array(config.publicKey));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'error';
  await api.put('/push/subscriptions', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent.slice(0, MAX_USER_AGENT),
  });
  return 'active';
}

/**
 * Garante que este navegador está inscrito para a empresa ativa e renova o
 * "visto por último" no servidor. Chamado a cada abertura do app (com a
 * permissão já concedida) e ao ativar o push nas preferências.
 */
export async function syncPushSubscription(): Promise<PushSyncResult> {
  const result = await computeSync();
  useNotificationStore.getState().setPushActive(result === 'active');
  return result;
}

async function computeSync(): Promise<PushSyncResult> {
  if (!isPushCapable()) return 'unsupported';
  if (Notification.permission !== 'granted') return 'not-granted';
  const reg = await readyRegistration();
  if (!reg) return 'no-service-worker';
  try {
    return await subscribeAndSave(reg);
  } catch (err) {
    console.warn('[push] falha ao inscrever este aparelho', err);
    return 'error';
  }
}

/**
 * Tira este aparelho do push (logout ou "desativar neste aparelho"): avisa o
 * servidor ANTES de o token sair, depois cancela no navegador. Nunca lança.
 */
export async function unsubscribeThisDevice(): Promise<void> {
  useNotificationStore.getState().setPushActive(false);
  if (!isPushCapable()) return;
  let sub: PushSubscription | null = null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    sub = (await reg?.pushManager.getSubscription()) ?? null;
  } catch (err) {
    console.warn('[push] não foi possível ler a inscrição deste aparelho', err);
  }
  if (!sub) return;
  try {
    await api.delete('/push/subscriptions', {
      params: { endpoint: sub.endpoint },
      timeout: UNSUBSCRIBE_TIMEOUT_MS,
    });
  } catch (err) {
    console.warn('[push] servidor não confirmou a remoção da inscrição', err);
  }
  try {
    await sub.unsubscribe();
  } catch (err) {
    console.warn('[push] navegador não cancelou a inscrição', err);
  }
}
