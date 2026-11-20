'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { aiSettingsService } from '@/features/ai-agents/services/ai-settings.service';
import { Switch } from '@/components/ui/switch';
import { controlSmCls } from '@/components/ui/control';
import { getErrorMessage } from '@/lib/errors';
import { holidayState } from '../lib/holiday';

/**
 * Feriado: liga na hora (sem "Salvar alterações") e desliga sozinho à
 * meia-noite do último dia. Enquanto ativo, a Aline atende todo mundo e a
 * equipe fica fora do SLA.
 */
export function HolidayCard({
  holidayUntil,
  timezone,
}: {
  holidayUntil: string | null;
  timezone: string;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const state = holidayState(holidayUntil, timezone, new Date());

  const save = async (date: string | null, success: string) => {
    setSaving(true);
    try {
      await aiSettingsService.update({ aiHolidayDate: date });
      toast.success(success);
      await qc.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível salvar o feriado'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (on: boolean) =>
    on
      ? save(state.today, 'Feriado ligado — a Aline está no comando até o fim de hoje')
      : save(null, 'Feriado desligado — atendimento normal');

  const handleDate = (date: string) => {
    if (!date || date === state.lastDay) return;
    void save(date, 'Data do feriado atualizada');
  };

  return (
    <section
      className={`mt-6 rounded-xl border p-5 shadow-soft transition-colors ${
        state.isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <PartyPopper aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Feriado</p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              {state.isActive
                ? `A Aline está no comando: atende os leads novos e cobre as conversas dos vendedores. Volta ao normal à meia-noite do dia ${state.lastDayLabel}.`
                : 'Ligue em dia de feriado: a Aline atende todos os clientes, avisa quando a equipe volta e o SLA fica pausado.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {state.isActive ? (
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">Até</span>
              <input
                type="date"
                value={state.lastDay ?? state.today}
                min={state.today}
                max={state.maxDate}
                disabled={saving}
                onChange={(e) => handleDate(e.target.value)}
                aria-label="Último dia do feriado"
                className={controlSmCls}
              />
            </label>
          ) : null}
          <Switch
            checked={state.isActive}
            onChange={handleToggle}
            disabled={saving}
            label="Feriado: Aline no comando"
          />
        </div>
      </div>
    </section>
  );
}
