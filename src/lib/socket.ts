import { io, Socket } from 'socket.io-client';
import axios from 'axios';

let socket: Socket | null = null;
let recovering = false;
let recoverAttempts = 0;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const MAX_RECOVER_DELAY_MS = 30_000;

type RefreshResult = 'ok' | 'retry' | 'fatal';

async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return 'fatal';
  try {
    // axios puro (não o client com interceptors) pra não entrar em loop de 401.
    const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
      refreshToken,
    });
    localStorage.setItem('access_token', data.data.accessToken);
    localStorage.setItem('refresh_token', data.data.refreshToken);
    return 'ok';
  } catch (err) {
    // 401/403 = refresh token inválido: não adianta insistir (o axios do app
    // cuida do logout). Qualquer outra falha (sem rede ao acordar, 502 no
    // deploy, timeout) é passageira — tenta de novo.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    return status === 401 || status === 403 ? 'fatal' : 'retry';
  }
}

// Quando o gateway derruba a conexão no handshake (token expirado →
// client.disconnect() no backend), o socket.io-client recebe reason
// "io server disconnect" e NÃO reconecta sozinho. Sem este recovery,
// uma única expiração de access_token mata o realtime até o usuário
// dar F5 — o REST continua funcionando (interceptor do axios renova o
// token), então o app parece vivo mas nenhum message:new chega.
//
// Re-tenta até conseguir: a versão anterior desistia PARA SEMPRE se o refresh
// falhasse uma única vez (wifi ainda voltando, API no meio de deploy) e o chat
// ficava sem mensagem nova até o F5.
async function recoverFromServerDisconnect() {
  if (recovering || !socket) return;
  recovering = true;
  try {
    while (socket && !socket.connected) {
      // Backoff pra não martelar caso o servidor rejeite por outro motivo
      // (membership removida, org inválida).
      const delay = Math.min(1000 * 2 ** recoverAttempts, MAX_RECOVER_DELAY_MS);
      recoverAttempts += 1;
      await new Promise((r) => setTimeout(r, delay));
      if (!socket || socket.connected) return;
      const result = await refreshAccessToken();
      if (result === 'fatal') return;
      if (result === 'ok') {
        socket.connect();
        return;
      }
    }
  } finally {
    recovering = false;
  }
}

// Aba volta a ficar visível / rede volta: se o socket está desconectado e não
// há recuperação em curso, força uma. Notebook que dormiu é o caso clássico.
function reviveIfDisconnected() {
  if (!socket || socket.connected || recovering) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  // `active` = o próprio socket.io ainda está tentando (queda de transporte).
  if (socket.active) return;
  void recoverFromServerDisconnect();
}

let reviveListenersInstalled = false;
function installReviveListeners() {
  if (reviveListenersInstalled || typeof window === 'undefined') return;
  reviveListenersInstalled = true;
  document.addEventListener('visibilitychange', reviveIfDisconnected);
  window.addEventListener('online', reviveIfDisconnected);
}

export function getSocket(): Socket {
  if (socket) return socket;

  const url = API_BASE.replace('/api/v1', '');

  socket = io(url, {
    auth: (cb) => {
      const token = localStorage.getItem('access_token');
      const organizationId = localStorage.getItem('active_org_id');
      cb({ token, organizationId });
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    // Sem limite de tentativas: com reconnectionAttempts finito o socket
    // desiste PARA SEMPRE após N falhas (ex: deploy de 1min do backend)
    // e o usuário fica sem realtime até recarregar a página.
    reconnectionAttempts: Infinity,
  });

  socket.on('disconnect', (reason) => {
    if (reason !== 'io server disconnect') return;
    void recoverFromServerDisconnect();
  });

  // Handshake completou de verdade (auth + rooms) — zera o backoff.
  socket.on('ready', () => {
    recoverAttempts = 0;
  });

  installReviveListeners();

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
