export type CadenceStepOption = 'SIM' | 'NAO' | 'DESCADASTRAR';

export interface CadenceStep {
  order: number;
  delayMinutes: number;
  content: { text: string };
  options: CadenceStepOption[];
  templateId?: string | null;
}

export interface Cadence {
  id: string | null;
  organizationId?: string;
  name: string;
  pipelineId: string | null;
  stageId: string | null;
  lostStageId: string | null;
  hotTagId: string | null;
  optOutTagId: string | null;
  trigger: 'STAGE_ENTER' | 'MANUAL' | 'BOTH';
  enabled: boolean;
  allowManual: boolean;
  isTemplate?: boolean;
  steps: CadenceStep[];
}

export interface ActiveEnrollment {
  active: boolean;
  enrollmentId?: string;
  currentStep?: number;
  totalSteps?: number;
  cadenceName?: string;
}
