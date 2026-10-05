'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, Info } from 'lucide-react';
import type { EmailTheme, FontFamily } from '@/lib/email-api';
import { Field, choiceClass, colorInputClass, fieldLabelClass, inputClass } from './style-controls';
import { normalizeHexColor } from './hex-color';

interface Props {
  theme: EmailTheme;
  onChange: (patch: Partial<EmailTheme>) => void;
}

const FONT_OPTIONS: Array<{ value: FontFamily; label: string }> = [
  { value: 'sans', label: 'Sem serifa' },
  { value: 'serif', label: 'Com serifa' },
];

/** Painel recolhível com as cinco propriedades do tema da campanha. */
export function ThemePanel({ theme, onChange }: Props) {
  return (
    <details
      className="group rounded-xl border border-border bg-card shadow-soft"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-foreground">
          Tema da campanha
        </span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ThemeColorField
            id="theme-primary-color"
            label="Cor primária"
            value={theme.primaryColor}
            onChange={(primaryColor) => onChange({ primaryColor })}
          />
          <ThemeColorField
            id="theme-text-color"
            label="Cor do texto"
            value={theme.textColor}
            onChange={(textColor) => onChange({ textColor })}
          />
          <ThemeColorField
            id="theme-background-color"
            label="Fundo da página"
            value={theme.backgroundColor}
            onChange={(backgroundColor) => onChange({ backgroundColor })}
          />
          <ThemeColorField
            id="theme-container-color"
            label="Fundo do cartão"
            value={theme.containerColor}
            onChange={(containerColor) => onChange({ containerColor })}
          />
        </div>

        <div>
          <span className={`mb-1 ${fieldLabelClass}`}>
            Fonte
          </span>
          <div className="flex gap-2" role="group" aria-label="Família de fonte">
            {FONT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ fontFamily: value })}
                aria-pressed={theme.fontFamily === value}
                className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors ${choiceClass(
                  theme.fontFamily === value,
                )}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Email não aceita fonte personalizada — Gmail e Outlook ignoram fontes carregadas por
              @font-face. Estas duas opções são as que funcionam em qualquer caixa de entrada; o
              limite é do meio, não desta ferramenta.
            </span>
          </p>
        </div>
      </div>
    </details>
  );
}

function ThemeColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // Campo de texto livre: aceita "#7c3aed" ou "7c3aed" enquanto digita, mas
  // só propaga pro estado quando o resultado é um hex de 6 dígitos válido —
  // a API rejeita qualquer outra coisa. Estado próprio porque o valor exibido
  // (o que o usuário está digitando) pode divergir do valor válido mais
  // recente enquanto o texto está incompleto ou inválido.
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(value);
    setInvalid(false);
  }, [value]);

  function handleTextChange(raw: string) {
    setText(raw);
    const normalized = normalizeHexColor(raw);
    if (normalized) {
      setInvalid(false);
      onChange(normalized);
    } else {
      setInvalid(true);
    }
  }

  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={colorInputClass}
        />
        <input
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          aria-label={`${label} (código hexadecimal)`}
          aria-invalid={invalid}
          className={`${inputClass} font-mono ${invalid ? 'border-urgent focus-visible:border-urgent' : ''}`}
        />
      </div>
      {invalid && (
        <p role="alert" className="flex items-start gap-1 text-xs text-urgent-ink">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
          Cor inválida — use um hex de 6 dígitos, com ou sem #, ex.: 7c3aed.
        </p>
      )}
    </Field>
  );
}
