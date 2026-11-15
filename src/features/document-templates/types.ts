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
