import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ORIGIN_LABEL } from '../lib/field-origin';
import type { FieldOrigin } from '../types';

/**
 * Selo de origem ao lado do rótulo do campo. O da IA chama atenção (âmbar):
 * o atendente precisa conferir antes de enviar.
 */
export function FieldSourceBadge({ origin }: { origin: FieldOrigin }) {
  const isAi = origin === 'ai';
  return (
    <Badge variant={isAi ? 'hot' : 'neutral'} className="font-medium" data-origin={origin}>
      {isAi && <Sparkles aria-hidden="true" className="h-3 w-3" />}
      {ORIGIN_LABEL[origin]}
    </Badge>
  );
}
