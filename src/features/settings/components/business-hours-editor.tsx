'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  WEEKDAYS,
  type BusinessHoursConfig,
  type Weekday,
} from '@/features/ai-agents/services/ai-settings.service';
import { controlSmCls } from '@/components/ui/control';

/**
 * Editor controlado da grade semanal de horários (7 dias + janelas de
 * horário por dia). Extraído da tela de configurações de IA pra ser
 * reutilizado em outros lugares (ex: horário de trabalho por atendente).
 */
export function BusinessHoursEditor({
  value,
  onChange,
  disabledLabel = 'Não atende',
}: {
  value: BusinessHoursConfig;
  onChange: (next: BusinessHoursConfig) => void;
  /** Texto exibido quando o dia está desmarcado. */
  disabledLabel?: string;
}) {
  const updateDay = (
    day: Weekday,
    patch: Partial<{ enabled: boolean; windows: Array<[string, string]> }>,
  ) => {
    onChange({
      ...value,
      [day]: {
        enabled: value[day]?.enabled ?? false,
        windows: value[day]?.windows ?? [],
        ...patch,
      },
    });
  };

  const addWindow = (day: Weekday) => {
    const existing = value[day]?.windows ?? [];
    onChange({
      ...value,
      [day]: {
        enabled: value[day]?.enabled ?? true,
        windows: [...existing, ['09:00', '18:00']],
      },
    });
  };

  const removeWindow = (day: Weekday, idx: number) => {
    const existing = value[day]?.windows ?? [];
    onChange({
      ...value,
      [day]: {
        enabled: value[day]?.enabled ?? false,
        windows: existing.filter((_, i) => i !== idx),
      },
    });
  };

  return (
    <div className="mt-4 space-y-3">
      {WEEKDAYS.map(({ key, label }) => {
        const day = value[key] ?? { enabled: false, windows: [] };
        return (
          <div
            key={key}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
          >
            <label className="flex min-h-8 w-24 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) =>
                  updateDay(key, { enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm text-foreground">
                {label}
              </span>
            </label>

            {day.enabled ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {(day.windows ?? []).map(([from, to], i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      aria-label={`${label}: início da janela ${i + 1}`}
                      value={from}
                      onChange={(e) => {
                        const updated = [...(day.windows ?? [])];
                        updated[i] = [e.target.value, to];
                        updateDay(key, { windows: updated });
                      }}
                      className={`${controlSmCls} font-mono tabular-nums`}
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <input
                      type="time"
                      aria-label={`${label}: fim da janela ${i + 1}`}
                      value={to}
                      onChange={(e) => {
                        const updated = [...(day.windows ?? [])];
                        updated[i] = [from, e.target.value];
                        updateDay(key, { windows: updated });
                      }}
                      className={`${controlSmCls} font-mono tabular-nums`}
                    />
                    <button
                      type="button"
                      onClick={() => removeWindow(key, i)}
                      aria-label={`Remover janela ${i + 1} de ${label}`}
                      title="Remover janela"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addWindow(key)}
                  aria-label={`Adicionar janela de horário em ${label}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-input px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus aria-hidden="true" className="h-3 w-3" /> Janela
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{disabledLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
