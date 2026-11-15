import type { AcceptanceConversationStatus } from '@/features/acceptances/types';

/**
 * Para quem o modelo serve: CLIENT vira contrato que o cliente assina pelo
 * link de aceite; INTERNAL é documento da casa, só dono/admin preenche e baixa.
 */
export type TemplateAudience = 'CLIENT' | 'INTERNAL';

/** Item da listagem de modelos (sem o corpo, que pode ser longo). */
export interface DocumentTemplateSummary {
  id: string;
  title: string;
  category: string | null;
  audience: TemplateAudience;
  isActive: boolean;
  /** Campos do modelo COM os colchetes, ex.: "[Nome do Cliente]". */
  placeholders: string[];
}

export interface DocumentTemplate extends DocumentTemplateSummary {
  body: string;
}

export interface DocumentTemplateInput {
  title: string;
  category: string | null;
  audience: TemplateAudience;
  body: string;
}

export type DocumentTemplatePatch = Partial<DocumentTemplateInput> & { isActive?: boolean };

/** Valores dos campos, indexados pelo placeholder COM colchetes. */
export type PlaceholderValues = Record<string, string>;

export interface RenderedDocument {
  text: string;
  /** Placeholders que ficaram sem valor. */
  missing: string[];
}

/** Contrato enviado ao cliente: o mesmo status do aceite + título do modelo. */
export interface ContractStatus extends AcceptanceConversationStatus {
  kind: 'CONTRACT';
  title: string;
}

export interface CreateContractInput {
  templateId: string;
  values: PlaceholderValues;
  expiresInDays?: number;
}

/**
 * Resultado do envio do link pelo WhatsApp. `queued` (e não "enviado") porque
 * a API só enfileira; a janela do WhatsApp ainda pode recusar depois.
 */
export interface ContractSendResult {
  queued: boolean;
  messageId?: string;
  error?: string;
}

/** Contrato criado ou reenviado: o status, o link de assinatura e o envio. */
export interface ContractDelivery {
  contract: ContractStatus;
  /** Só vem na criação e no reenvio; a listagem não traz o link. */
  link: string | null;
  /** Nulo = a API não informou o envio (deploy antigo). */
  send: ContractSendResult | null;
}

/**
 * De onde veio um valor sugerido pela API: padrão da agência (`default` e
 * `agency`), cadastro do contato, dado salvo de um contrato anterior ou data.
 */
export type FieldSource = 'default' | 'agency' | 'contact' | 'saved' | 'date';

/** Origem mostrada no campo: as da API mais o preenchimento por IA. */
export type FieldOrigin = FieldSource | 'ai';

/** Campos do modelo por quem costuma informá-los, na ordem do modelo. */
export interface FieldGroups {
  client: string[];
  seller: string[];
  agency: string[];
  auto: string[];
}

export interface AutofillResult {
  values: PlaceholderValues;
  sources: Record<string, FieldSource>;
  /** Nulo = API sem agrupamento (deploy antigo): lista única. */
  groups: FieldGroups | null;
}

/** Texto pronto para pedir ao cliente os dados que faltam no modelo. */
export interface DataRequestResult {
  text: string;
  fields: string[];
  /** Só quando pedido com envio; nulo = não informado. */
  send: ContractSendResult | null;
}

export interface AiFillInput {
  conversationId?: string;
  text?: string;
  useConversation?: boolean;
  currentValues?: PlaceholderValues;
}

export interface AiFillResult {
  values: PlaceholderValues;
  filled: string[];
}

/** Dados da agência que entram sozinhos em todos os contratos. */
export interface FieldDefaults {
  values: Record<string, string>;
  suggestedFields: string[];
}
