'use client';

import { useId, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { documentTemplatesService } from '../services/document-templates.service';
import type { PlaceholderValues } from '../types';
import { FillPanel } from './fill-panel';

interface AiFillPanelProps {
  templateId: string;
  conversationId?: string;
  currentValues: PlaceholderValues;
  /** Aplica nos campos vazios e devolve quantos preencheu. */
  onApply: (values: PlaceholderValues) => number;
  onClose: () => void;
}

const textareaCls = cn(controlCls.replace('h-9', 'min-h-[5rem] py-2'), 'w-full resize-y leading-relaxed');
const FALLBACK_ERROR = 'A IA não conseguiu preencher agora. Tente de novo ou preencha à mão.';

export function aiFillToastMessage(count: number): string {
  if (count === 0) return 'A IA não encontrou novos dados.';
  return count === 1
    ? 'A IA preencheu 1 campo — confira o marcado.'
    : `A IA preencheu ${count} campos — confira os marcados.`;
}

/**
 * "Preencher com IA": lê a conversa e/ou um texto colado e completa só os
 * campos vazios. O que o atendente digitou ou já veio sugerido fica.
 */
export function AiFillPanel({ templateId, conversationId, currentValues, onApply, onClose }: AiFillPanelProps) {
  const baseId = useId();
  const [useConversation, setUseConversation] = useState(!!conversationId);
  const [text, setText] = useState('');
  const [isFilling, setIsFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = text.trim();
  const canSubmit = (useConversation || trimmed.length > 0) && !isFilling;

  async function fill() {
    if (!canSubmit) return;
    setIsFilling(true);
    setError(null);
    try {
      const result = await documentTemplatesService.aiFill(templateId, {
        conversationId,
        useConversation,
        text: trimmed || undefined,
        currentValues,
      });
      const count = onApply(result.values);
      if (count > 0) toast.success(aiFillToastMessage(count));
      else toast.info(aiFillToastMessage(0));
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, FALLBACK_ERROR));
    } finally {
      setIsFilling(false);
    }
  }

  return (
    <FillPanel title="Preencher com IA" onClose={onClose}>
      <label className={cn('flex items-center gap-2 text-sm text-foreground', !conversationId && 'opacity-60')}>
        <input
          type="checkbox"
          checked={useConversation}
          disabled={!conversationId || isFilling}
          onChange={(e) => setUseConversation(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        Ler a conversa
      </label>
      <div className="space-y-1.5">
        <label htmlFor={`${baseId}-text`} className="text-sm font-medium text-foreground">
          Ou cole aqui os dados (opcional)
        </label>
        <textarea
          id={`${baseId}-text`}
          value={text}
          rows={4}
          disabled={isFilling}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex.: Nome: Ana Souza, CPF 123.456.789-00, Rua…"
          className={textareaCls}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-warning-wash px-3 py-2 text-sm text-warning-ink">{error}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Só completa os campos vazios.</p>
        <Button size="sm" onClick={fill} loading={isFilling} disabled={!canSubmit}>
          {!isFilling && <Sparkles aria-hidden="true" className="h-4 w-4" />}
          {isFilling ? 'Lendo…' : 'Preencher'}
        </Button>
      </div>
    </FillPanel>
  );
}
