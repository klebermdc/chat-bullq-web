/*
 * Adaptado de DeskcommCRM (https://github.com/melgarafael/DeskcommCRM), MIT License, Copyright (c) 2026 Rafael Melgaço.
 * Origem: lib/pwa/estado-da-instalacao.ts
 */

export type PushDeviceState =
  /** Sem https: nenhum navegador entrega push. */
  | 'insecure'
  /** iPhone/iPad fora do app instalado: push só com o Sendtur na Tela de Início (iOS 16.4+). */
  | 'ios-needs-install'
  /** Navegador sem Notification/ServiceWorker/PushManager (ou app de outro app, ex.: Instagram). */
  | 'unsupported'
  | 'ready';

export interface PushDeviceEnv {
  secure: boolean;
  /** Aberto pelo ícone da Tela de Início. */
  standalone: boolean;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
}

// Navegador de dentro de outro aplicativo: não instala nem recebe push.
const EMBEDDED = /\b(Instagram|FBAN|FBAV|Line)\b|\/(FBIOS|FB_IAB)|; wv\)/;

export function isAppleMobile(env: Pick<PushDeviceEnv, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  // iPad com iPadOS se apresenta como Mac; o toque é o que o entrega.
  return /iPhone|iPad|iPod/.test(env.userAgent) || (env.platform === 'MacIntel' && env.maxTouchPoints > 1);
}

/** Puro de propósito: quem lê o navegador é o componente, a regra fica testável. */
export function pushDeviceState(env: PushDeviceEnv): PushDeviceState {
  if (!env.secure) return 'insecure';
  if (EMBEDDED.test(env.userAgent)) return 'unsupported';
  if (isAppleMobile(env) && !env.standalone) return 'ios-needs-install';
  if (!env.hasNotification || !env.hasServiceWorker || !env.hasPushManager) return 'unsupported';
  return 'ready';
}

/** Lê o ambiente do navegador atual (só no cliente). */
export function readPushDeviceEnv(): PushDeviceEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    secure: window.isSecureContext,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true,
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    hasNotification: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in nav,
    hasPushManager: 'PushManager' in window,
  };
}
