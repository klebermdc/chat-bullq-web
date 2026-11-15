'use client';

import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import { isLongPlaceholder, placeholderLabel } from '../lib/placeholders';
import type { FieldOrigin } from '../types';
import { FieldSourceBadge } from './field-source-badge';

interface PlaceholderFieldProps {
  id: string;
  placeholder: string;
  value: string;
  isEmpty: boolean;
  isInvalid: boolean;
  origin?: FieldOrigin;
  disabled?: boolean;
  onChange: (placeholder: string, value: string) => void;
}

const textareaCls = controlCls.replace('h-9', 'min-h-[5.5rem] py-2') + ' resize-y leading-relaxed';
const LONG_FIELD_ROWS = 4;

/** Um campo do modelo: rótulo sem colchetes, selo de origem e o controle. */
export function PlaceholderField({ id, placeholder, value, isEmpty, isInvalid, origin, disabled, onChange }: PlaceholderFieldProps) {
  const common = {
    id,
    value,
    disabled,
    required: true,
    'aria-required': true,
    'aria-invalid': isInvalid || undefined,
    'data-empty': isEmpty ? 'true' : undefined,
    className: cn(
      'w-full',
      isInvalid && 'border-warning-ink/60 focus-visible:border-warning-ink focus-visible:ring-warning-ink/25',
      origin === 'ai' && 'border-warning-ink/40 bg-warning-wash/40',
    ),
  };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
        <span>
          {placeholderLabel(placeholder)}
          <span aria-hidden="true" className="ml-0.5 text-muted-foreground">*</span>
        </span>
        {isEmpty ? (
          <span className="text-[11px] font-normal text-muted-foreground">vazio</span>
        ) : (
          origin && <FieldSourceBadge origin={origin} />
        )}
      </label>
      {isLongPlaceholder(placeholder) ? (
        <textarea
          {...common}
          rows={LONG_FIELD_ROWS}
          onChange={(e) => onChange(placeholder, e.target.value)}
          className={cn(textareaCls, common.className)}
        />
      ) : (
        <input
          {...common}
          type="text"
          onChange={(e) => onChange(placeholder, e.target.value)}
          className={cn(controlCls, common.className)}
        />
      )}
    </div>
  );
}
