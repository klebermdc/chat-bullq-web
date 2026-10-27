'use client';

import { controlCls } from '@/components/ui/control';

export const LABEL_CLS = 'block text-xs font-medium text-foreground';
export const INPUT_CLS = `${controlCls} mt-1 w-full`;
export const TEXTAREA_CLS = `${controlCls} mt-1 h-auto w-full resize-y py-2`;

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'number';
  inputMode?: 'text' | 'decimal' | 'numeric';
  maxLength?: number;
  placeholder?: string;
  className?: string;
  /** Só para type="number". */
  max?: number;
}

/** Rótulo + campo de uma linha, com o visual dos controles do app. */
export function TextField({ id, label, value, disabled, onChange, type = 'text', inputMode, maxLength, placeholder, className, max }: TextFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        max={type === 'number' ? max : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS}
      />
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
}

export function TextAreaField({ id, label, value, disabled, onChange, maxLength, rows = 2 }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={TEXTAREA_CLS}
      />
    </div>
  );
}

interface ChoiceGroupProps<T extends string | number> {
  labelId: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  disabled: boolean;
  onChange: (value: T) => void;
}

/** Botões de escolha única no padrão do seletor "Tipo" do modal de proposta. */
export function ChoiceGroup<T extends string | number>({ labelId, label, value, options, disabled, onChange }: ChoiceGroupProps<T>) {
  return (
    <div>
      <p id={labelId} className="text-sm font-medium text-foreground">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="mt-1.5 grid gap-1 rounded-lg bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={
              'min-h-9 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ' +
              (value === opt.value ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground')
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
