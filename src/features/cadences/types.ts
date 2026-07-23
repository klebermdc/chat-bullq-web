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
  trigger: 'STAGE_ENTER' | 'MANUAL' | 'BOTH' | 'NO_REPLY';
  enabled: boolean;
  allowManual: boolean;
  watchedStageIds?: string[];
  isTemplate?: boolean;
  onYesMessage?: string | null;
  onNoMessage?: string | null;
  steps: CadenceStep[];
}

export interface ActiveEnrollment {
  /** Há enrollment VIVO — ACTIVE ou PAUSED. Pausado continua vivo. */
  active: boolean;
  enrollmentId?: string;
  status?: 'ACTIVE' | 'PAUSED';
  /** Pausado pelo revive: o watchdog de silêncio vai retomar sozinho. */
  paused?: boolean;
  pausedAt?: string | null;
  /** Previsão de retomada — o watchdog rearma a cada mensagem nova. */
  resumesAt?: string | null;
  currentStep?: number;
  totalSteps?: number;
  cadenceName?: string;
  trigger?: 'STAGE_ENTER' | 'MANUAL' | 'BOTH' | 'NO_REPLY';
}
