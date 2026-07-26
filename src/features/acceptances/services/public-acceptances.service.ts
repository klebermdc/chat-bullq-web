import type { PublicAcceptanceView } from '../types';

// Mesma base do client autenticado (já inclui o prefixo /api/v1). A página pública
// roda sem sessão, então bate direto na API com fetch — sem interceptors/token.
const BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const publicAcceptancesService = {
  async get(token: string): Promise<PublicAcceptanceView> {
    const r = await fetch(`${BASE}/public/acceptances/${token}`, {
      cache: 'no-store',
    });
    if (!r.ok) {
      throw Object.assign(new Error('not-ok'), { httpStatus: r.status });
    }
    return r.json();
  },

  async sign(token: string, name: string): Promise<PublicAcceptanceView> {
    const r = await fetch(`${BASE}/public/acceptances/${token}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) {
      throw Object.assign(new Error('sign-failed'), { httpStatus: r.status });
    }
    return r.json();
  },
};
