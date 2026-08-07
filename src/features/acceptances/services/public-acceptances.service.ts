import type { PublicAcceptanceView } from '../types';

// Mesma base do client autenticado (já inclui o prefixo /api/v1). A página pública
// roda sem sessão, então bate direto na API com fetch — sem interceptors/token.
const BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// A API embrulha TODA resposta HTTP num envelope { data, meta } via ResponseInterceptor
// global (inclusive rotas públicas). Como a página pública usa fetch cru, precisamos
// desempacotar aqui. Defensivo: aceita tanto { data, ... } quanto objeto cru, então
// não quebra se a API parar de embrulhar no futuro.
function unwrap<T>(body: any): T {
  return body && typeof body === 'object' && 'data' in body
    ? (body.data as T)
    : (body as T);
}

/**
 * O `unwrap` é um cast, não uma validação: o tipo é uma promessa nossa, não uma
 * garantia da API. `vouchers`, `orderRef` e `policyText` são recentes, então uma
 * API mais velha (ou um deploy pela metade) responde sem eles — e aí um `.map` na
 * página do cliente quebraria a assinatura. Preenchemos o default aqui, na
 * fronteira, uma vez, em vez de espalhar `?? []` por todo consumidor.
 */
function withDefaults(view: PublicAcceptanceView): PublicAcceptanceView {
  return {
    ...view,
    vouchers: view.vouchers ?? [],
    orderRef: view.orderRef ?? null,
    policyText: view.policyText ?? null,
  };
}

export const publicAcceptancesService = {
  async get(token: string): Promise<PublicAcceptanceView> {
    const r = await fetch(`${BASE}/public/acceptances/${token}`, {
      cache: 'no-store',
    });
    if (!r.ok) {
      throw Object.assign(new Error('not-ok'), { httpStatus: r.status });
    }
    return withDefaults(unwrap<PublicAcceptanceView>(await r.json()));
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
    return withDefaults(unwrap<PublicAcceptanceView>(await r.json()));
  },
};
