'use client';

import { useState } from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlaceholderValues } from '../types';
import { AiFillPanel } from './ai-fill-panel';
import { DataRequestPanel } from './data-request-panel';

type Panel = 'data' | 'ai' | null;

interface ContractFillActionsProps {
  conversationId: string;
  templateId: string;
  currentValues: PlaceholderValues;
  onApplyAi: (values: PlaceholderValues) => number;
  disabled?: boolean;
}

/**
 * Barra do passo "Campos" do contrato: pedir ao cliente o que falta e, quando
 * ele responder, completar com a IA. Um painel aberto por vez.
 */
export function ContractFillActions({ conversationId, templateId, currentValues, onApplyAi, disabled }: ContractFillActionsProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const close = () => setPanel(null);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={panel === 'data' ? 'secondary' : 'outline'}
          size="sm"
          aria-expanded={panel === 'data'}
          onClick={() => toggle('data')}
          disabled={disabled}
        >
          <MessageSquareText aria-hidden="true" className="h-4 w-4" />
          Pedir dados ao cliente
        </Button>
        <Button
          variant={panel === 'ai' ? 'secondary' : 'outline'}
          size="sm"
          aria-expanded={panel === 'ai'}
          onClick={() => toggle('ai')}
          disabled={disabled}
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          Preencher com IA
        </Button>
      </div>
      {panel === 'data' && <DataRequestPanel conversationId={conversationId} templateId={templateId} onClose={close} />}
      {panel === 'ai' && (
        <AiFillPanel
          templateId={templateId}
          conversationId={conversationId}
          currentValues={currentValues}
          onApply={onApplyAi}
          onClose={close}
        />
      )}
    </div>
  );
}
