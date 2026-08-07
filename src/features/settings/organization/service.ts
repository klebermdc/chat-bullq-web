import { api } from '@/lib/api';

/**
 * Recorte da organização usado pelas Configurações Gerais.
 *
 * Bate no mesmo `PATCH /organizations/current` que o ai-settings usa, mas com
 * tipo próprio: política de cancelamento não é ajuste de IA, e pendurá-la em
 * `OrganizationAiSettings` acoplaria duas telas que mudam por motivos
 * diferentes. Como o endpoint é PATCH parcial, as duas telas convivem sem uma
 * sobrescrever os campos da outra.
 */
export interface OrganizationGeneralSettings {
  id: string;
  name: string;
  /**
   * Texto exibido no Aceite de Entrega que o cliente assina.
   * `null` = organização sem política; a página pública não mostra bloco algum.
   */
  cancellationPolicy: string | null;
}

export interface UpdateOrganizationGeneralInput {
  cancellationPolicy?: string | null;
}

/**
 * O campo é novo: uma API ainda sem ele (ou um deploy pela metade) responderia
 * `undefined`, e aí o textarea da tela alternaria de não-controlado para
 * controlado no meio do caminho. Normalizamos na fronteira, uma vez.
 */
function withDefaults(org: OrganizationGeneralSettings): OrganizationGeneralSettings {
  return { ...org, cancellationPolicy: org.cancellationPolicy ?? null };
}

export const organizationService = {
  async get(): Promise<OrganizationGeneralSettings> {
    const { data } = await api.get('/organizations/current');
    return withDefaults(data.data ?? data);
  },

  async update(
    input: UpdateOrganizationGeneralInput,
  ): Promise<OrganizationGeneralSettings> {
    const { data } = await api.patch('/organizations/current', input);
    return withDefaults(data.data ?? data);
  },
};

/**
 * Campo vazio precisa virar `null`, não `''`: o contrato do aceite é
 * "sem política = sem bloco", e `null` é o valor que representa isso. Mandar
 * string vazia gravaria uma política de zero caractere, que a página pública
 * teria de aprender a ignorar de novo, em outro lugar.
 */
export function normalizeCancellationPolicy(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
