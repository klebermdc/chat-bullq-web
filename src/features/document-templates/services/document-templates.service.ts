import { api } from '@/lib/api';
import { translateApiMessage } from '@/lib/errors';
import { toContractDelivery } from '../lib/contract-delivery';
import {
  parseAiFill,
  parseAutofill,
  parseDataRequest,
  parseFieldDefaults,
  readMessageFromBody,
  readMissingFromBody,
  unwrapEnvelope,
} from '../lib/api-shapes';
import type {
  AiFillInput,
  AiFillResult,
  AutofillResult,
  ContractDelivery,
  ContractStatus,
  CreateContractInput,
  DataRequestResult,
  DocumentTemplate,
  DocumentTemplateInput,
  DocumentTemplatePatch,
  DocumentTemplateSummary,
  FieldDefaults,
  PlaceholderValues,
  RenderedDocument,
  TemplateAudience,
} from '../types';

/**
 * Todas as chamadas de modelos de documentos e contratos num lugar só: se a
 * API mudar um caminho ou o formato de uma resposta, o ajuste é aqui.
 */

const UNPROCESSABLE = 422;
const TOO_MANY_REQUESTS = 429;
/** PDF é gerado na hora pela API; o padrão de 15 s do cliente é curto. */
const PDF_TIMEOUT_MS = 60_000;
/** A IA lê a conversa inteira; pode passar dos 15 s do cliente. */
const AI_FILL_TIMEOUT_MS = 60_000;
const THROTTLED_MESSAGE = 'Muitos pedidos seguidos à IA. Espere um minuto e tente de novo.';
const DATA_REQUEST_THROTTLED_MESSAGE = 'Muitas solicitações seguidas. Aguarde um minuto e tente de novo.';

/** 422 não passa pelo interceptor (que reduz o erro a uma mensagem e perde `missing`). */
const isSuccess = (status: number) => status >= 200 && status < 300;
const accept422 = (status: number) => isSuccess(status) || status === UNPROCESSABLE;
/** 429 vem do limitador em inglês; tratamos aqui para dar uma mensagem útil. */
const accept429 = (status: number) => isSuccess(status) || status === TOO_MANY_REQUESTS;
const accept422or429 = (status: number) => accept422(status) || status === TOO_MANY_REQUESTS;

export type CreateContractResult =
  | ({ ok: true } & ContractDelivery)
  /** `missing` nulo = a API recusou sem dizer quais campos; a tela calcula. */
  | { ok: false; missing: string[] | null; message: string | null };

export type DataRequestOutcome =
  | ({ ok: true } & DataRequestResult)
  /** 422: já temos todos os dados do cliente para o modelo. */
  | { ok: false; message: string };

const NOTHING_MISSING_MESSAGE = 'Já temos todos os dados do cliente para este modelo.';

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

  async autofill(id: string, conversationId: string): Promise<AutofillResult> {
    const { data } = await api.get(`/document-templates/${id}/autofill`, { params: { conversationId } });
    return parseAutofill(unwrapEnvelope<unknown>(data));
  },

  /** Preenche com IA a partir da conversa e/ou de um texto colado. */
  async aiFill(id: string, input: AiFillInput): Promise<AiFillResult> {
    const response = await api.post(`/document-templates/${id}/ai-fill`, input, {
      timeout: AI_FILL_TIMEOUT_MS,
      validateStatus: accept429,
    });
    if (response.status === TOO_MANY_REQUESTS) throw new Error(THROTTLED_MESSAGE);
    return parseAiFill(unwrapEnvelope<unknown>(response.data));
  },

  /** Padrões da agência (dono/administrador). */
  async getFieldDefaults(): Promise<FieldDefaults> {
    const { data } = await api.get('/document-templates/field-defaults');
    return parseFieldDefaults(unwrapEnvelope<unknown>(data));
  },

  /** Valor vazio remove o campo dos padrões. */
  async saveFieldDefaults(values: Record<string, string>): Promise<FieldDefaults> {
    const { data } = await api.put('/document-templates/field-defaults', { values });
    return parseFieldDefaults(unwrapEnvelope<unknown>(data));
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
    return { ok: true, ...toContractDelivery(unwrapEnvelope<ContractStatus>(response.data), withContractDefaults) };
  },

  /**
   * Monta (e, com `send`, envia na conversa) a mensagem pedindo ao cliente os
   * dados que faltam para o modelo.
   */
  async requestClientData(conversationId: string, templateId: string, send: boolean): Promise<DataRequestOutcome> {
    const response = await api.post(`/conversations/${conversationId}/contracts/data-request`, { templateId, send }, {
      validateStatus: accept422or429,
    });
    if (response.status === TOO_MANY_REQUESTS) throw new Error(DATA_REQUEST_THROTTLED_MESSAGE);
    if (response.status === UNPROCESSABLE) {
      const message = readMessageFromBody(response.data);
      return { ok: false, message: message ? translateApiMessage(message) : NOTHING_MISSING_MESSAGE };
    }
    return { ok: true, ...parseDataRequest(unwrapEnvelope<unknown>(response.data)) };
  },

  /** Reenvia o link de um contrato pendente ou expirado. 409 = já assinado. */
  async resendContract(conversationId: string, contractId: string): Promise<ContractDelivery> {
    const { data } = await api.post(`/conversations/${conversationId}/contracts/${contractId}/resend`, {});
    return toContractDelivery(unwrapEnvelope<ContractStatus>(data), withContractDefaults);
  },
};
