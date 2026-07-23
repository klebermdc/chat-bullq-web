'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  WEEKDAYS,
  type BusinessHoursConfig,
  type Weekday,
} from '@/features/ai-agents/services/ai-settings.service';

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
            className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <label className="flex w-24 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) =>
                  updateDay(key, { enabled: e.target.checked })
                }
                className="h-3.5 w-3.5 rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {label}
              </span>
            </label>

            {day.enabled ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {(day.windows ?? []).map(([from, to], i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      type="time"
                      value={from}
                      onChange={(e) => {
                        const updated = [...(day.windows ?? [])];
                        updated[i] = [e.target.value, to];
                        updateDay(key, { windows: updated });
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <span className="text-xs text-zinc-400">até</span>
                    <input
                      type="time"
                      value={to}
                      onChange={(e) => {
                        const updated = [...(day.windows ?? [])];
                        updated[i] = [from, e.target.value];
                        updateDay(key, { windows: updated });
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <button
                      onClick={() => removeWindow(key, i)}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addWindow(key)}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-3 w-3" /> Janela
                </button>
              </div>
            ) : (
              <span className="text-xs text-zinc-400">{disabledLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
