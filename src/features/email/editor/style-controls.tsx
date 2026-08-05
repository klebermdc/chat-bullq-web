'use client';

import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';
import type { BlockAlign, BlockStyle, EmailTheme } from '@/lib/email-api';

interface Props {
  style: BlockStyle | undefined;
  theme: EmailTheme;
  /** true para blocos 'button' e 'offer' — mostra cor do botão, cor do texto do botão e arredondamento. */
  showButtonControls: boolean;
  onChange: (patch: BlockStyle) => void;
}

const ALIGN_OPTIONS: Array<{ value: BlockAlign; label: string; icon: typeof AlignLeft }> = [
  { value: 'left', label: 'Esquerda', icon: AlignLeft },
  { value: 'center', label: 'Centro', icon: AlignCenter },
  { value: 'right', label: 'Direita', icon: AlignRight },
];

export const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      {children}
    </label>
  );
}

/**
 * Controles de estilo compartilhados por qualquer bloco. `style` pode vir
 * `undefined` (bloco ainda sem override) — nesse caso cada controle exibe o
 * valor herdado do tema e o seletor de cor livre continua funcional, porque
 * `<input type="color">` não aceita `undefined`.
 */
export function StyleControls({ style, theme, showButtonControls, onChange }: Props) {
  const s = style ?? {};
  const themeSwatches = [
    { value: theme.primaryColor, label: 'Cor primária do tema' },
    { value: theme.textColor, label: 'Cor do texto do tema' },
    { value: theme.containerColor, label: 'Cor de fundo do cartão do tema' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField
          id="style-color"
          label="Cor do texto"
          value={s.color}
          fallback={theme.textColor}
          swatches={themeSwatches}
          onChange={(color) => onChange({ color })}
          onReset={() => onChange({ color: undefined })}
        />
        <ColorField
          id="style-background-color"
          label="Cor de fundo"
          value={s.backgroundColor}
          fallback={theme.containerColor}
          swatches={themeSwatches}
          onChange={(backgroundColor) => onChange({ backgroundColor })}
          onReset={() => onChange({ backgroundColor: undefined })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tamanho da fonte" htmlFor="style-font-size">
          <input
            id="style-font-size"
            type="number"
            min={10}
            max={64}
            value={s.fontSize ?? ''}
            placeholder="Padrão"
            onChange={(e) =>
              onChange({ fontSize: e.target.value ? Number(e.target.value) : undefined })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Espaçamento vertical" htmlFor="style-padding-y">
          <input
            id="style-padding-y"
            type="number"
            min={0}
            max={96}
            value={s.paddingY ?? ''}
            placeholder="Padrão"
            onChange={(e) =>
              onChange({ paddingY: e.target.value ? Number(e.target.value) : undefined })
            }
            className={inputClass}
          />
        </Field>
      </div>

      <label htmlFor="style-bold" className="flex w-fit items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
        <input
          id="style-bold"
          type="checkbox"
          checked={s.bold ?? false}
          onChange={(e) => onChange({ bold: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Negrito
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Alinhamento
        </span>
        <div className="flex gap-1" role="group" aria-label="Alinhamento do bloco">
          {ALIGN_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ align: value })}
              aria-pressed={(s.align ?? 'left') === value}
              aria-label={label}
              title={label}
              className={`rounded-lg border p-2 ${
                (s.align ?? 'left') === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {showButtonControls && (
        <div className="space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Botão</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="style-button-color"
              label="Cor do botão"
              value={s.buttonColor}
              fallback={theme.primaryColor}
              swatches={themeSwatches}
              onChange={(buttonColor) => onChange({ buttonColor })}
              onReset={() => onChange({ buttonColor: undefined })}
            />
            <ColorField
              id="style-button-text-color"
              label="Cor do texto do botão"
              value={s.buttonTextColor}
              fallback={theme.containerColor}
              swatches={themeSwatches}
              onChange={(buttonTextColor) => onChange({ buttonTextColor })}
              onReset={() => onChange({ buttonTextColor: undefined })}
            />
          </div>

          <Field label="Arredondamento" htmlFor="style-border-radius">
            <input
              id="style-border-radius"
              type="number"
              min={0}
              max={32}
              value={s.borderRadius ?? ''}
              placeholder="Padrão"
              onChange={(e) =>
                onChange({ borderRadius: e.target.value ? Number(e.target.value) : undefined })
              }
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-zinc-400">No Outlook para Windows o botão aparece reto.</p>
        </div>
      )}
    </div>
  );
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  /** Valor do tema exibido enquanto o bloco não tem override próprio. */
  fallback: string;
  swatches: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  onReset: () => void;
}

function ColorField({ id, label, value, fallback, swatches, onChange, onReset }: ColorFieldProps) {
  const isCustom = value !== undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
        />

        <div
          className="flex items-center gap-1"
          role="group"
          aria-label={`Cores do tema para ${label.toLowerCase()}`}
        >
          {swatches.map((swatch) => (
            <button
              key={swatch.label}
              type="button"
              onClick={() => onChange(swatch.value)}
              title={swatch.label}
              aria-label={swatch.label}
              style={{ backgroundColor: swatch.value }}
              className="h-6 w-6 rounded-full border border-zinc-300 dark:border-zinc-600"
            />
          ))}
        </div>

        {isCustom && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Voltar ao tema
          </button>
        )}
      </div>
    </div>
  );
}
