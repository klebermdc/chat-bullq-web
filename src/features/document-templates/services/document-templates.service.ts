import { api } from '@/lib/api';
import { translateApiMessage } from '@/lib/errors';
import { readMessageFromBody, readMissingFromBody, unwrapEnvelope } from '../lib/api-shapes';
import { normalizeValues } from '../lib/placeholders';
import type {
  ContractStatus,
  CreateContractInput,
  DocumentTemplate,
  DocumentTemplateInput,
  DocumentTemplatePatch,
  DocumentTemplateSummary,
  PlaceholderValues,
  RenderedDocument,
  TemplateAudience,
} from '../types';

/**
 * Todas as chamadas de modelos de documentos e contratos num lugar só: se a
 * API mudar um caminho ou o formato de uma resposta, o ajuste é aqui.
 */

const UNPROCESSABLE = 422;
/** PDF é gerado na hora pela API; o padrão de 15 s do cliente é curto. */
const PDF_TIMEOUT_MS = 60_000;

/** 422 não passa pelo interceptor (que reduz o erro a uma mensagem e perde `missing`). */
const accept422 = (status: number) => (status >= 200 && status < 300) || status === UNPROCESSABLE;

export type CreateContractResult =
  | { ok: true; contract: ContractStatus }
  /** `missing` nulo = a API recusou sem dizer quais campos; a tela calcula. */
  | { ok: false; missing: string[] | null; message: string | null };

function withSummaryDefaults<T extends DocumentTemplateSummary>(raw: T): T {
  return { ...raw, category: raw.category ?? null, placeholders: raw.placeholders ?? [] };
}

function withContractDefaults(raw: ContractStatus): ContractStatus {
  return { ...raw, kind: 'CONTRACT', title: raw.title ?? 'Contrato', items: raw.items ?? [] };
}

export const documentTemplatesService = {
  async list(params: { audience?: TemplateAudience; includeInactive?: boolean } = {}): Promise<DocumentTemplateSummary[]> {
    const { data } = await api.get('/document-templates', {
      params: {
        audience: params.audience,
        includeInactive: params.includeInactive ? 'true' : undefined,
      },
    });
    return (unwrapEnvelope<DocumentTemplateSummary[] | null>(data) ?? []).map(withSummaryDefaults);
  },

  async get(id: string): Promise<DocumentTemplate> {
    const { data } = await api.get(`/document-templates/${id}`);
    const template = unwrapEnvelope<DocumentTemplate>(data);
    return { ...withSummaryDefaults(template), body: template.body ?? '' };
  },

  async create(input: DocumentTemplateInput): Promise<DocumentTemplate> {
    const { data } = await api.post('/document-templates', input);
    return unwrapEnvelope<DocumentTemplate>(data);
  },

  async update(id: string, patch: DocumentTemplatePatch): Promise<DocumentTemplate> {
    const { data } = await api.patch(`/document-templates/${id}`, patch);
    return unwrapEnvelope<DocumentTemplate>(data);
  },

  /** Na API, excluir só desativa o modelo. */
  async deactivate(id: string): Promise<void> {
    await api.delete(`/document-templates/${id}`);
  },

  async autofill(id: string, conversationId: string): Promise<PlaceholderValues> {
    const { data } = await api.get(`/document-templates/${id}/autofill`, { params: { conversationId } });
    const payload = unwrapEnvelope<{ values?: Record<string, unknown> } | null>(data);
    return normalizeValues(payload?.values);
  },

  async render(id: string, values: PlaceholderValues): Promise<RenderedDocument> {
    const { data } = await api.post(`/document-templates/${id}/render`, { values });
    const payload = unwrapEnvelope<Partial<RenderedDocument> | null>(data);
    return { text: payload?.text ?? '', missing: payload?.missing ?? [] };
  },

  async pdf(id: string, values: PlaceholderValues): Promise<Blob> {
    const { data } = await api.post(`/document-templates/${id}/pdf`, { values }, {
      responseType: 'blob',
      timeout: PDF_TIMEOUT_MS,
    });
    return data as Blob;
  },

  async listContracts(conversationId: string): Promise<ContractStatus[]> {
    const { data } = await api.get(`/conversations/${conversationId}/contracts`);
    const list = unwrapEnvelope<ContractStatus[] | null>(data);
    return Array.isArray(list) ? list.map(withContractDefaults) : [];
  },

  async createContract(conversationId: string, input: CreateContractInput): Promise<CreateContractResult> {
    const response = await api.post(`/conversations/${conversationId}/contracts`, input, {
      validateStatus: accept422,
    });
    if (response.status === UNPROCESSABLE) {
      const message = readMessageFromBody(response.data);
      return {
        ok: false,
        missing: readMissingFromBody(response.data),
        message: message ? translateApiMessage(message) : null,
      };
    }
    return { ok: true, contract: withContractDefaults(unwrapEnvelope<ContractStatus>(response.data)) };
  },
};
