'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiSettingsService,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursConfig,
} from '@/features/ai-agents/services/ai-settings.service';
import { BusinessHoursEditor } from '@/features/settings/components/business-hours-editor';
import { Toggle } from '@/features/settings/components/toggle';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
];

export default function SettingsHorariosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => aiSettingsService.get(),
  });

  const [aiTimezone, setAiTimezone] = useState('America/Sao_Paulo');
  const [hours, setHours] = useState<BusinessHoursConfig>(DEFAULT_BUSINESS_HOURS);
  // 24/7: representado no banco como aiBusinessHours = null. Mantemos os
  // valores de `hours` no state mesmo com 24/7 ON pra preservar a config
  // anterior se o user voltar atrás.
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState('');
  const [offHoursMode, setOffHoursMode] = useState<'SILENT' | 'MESSAGE' | 'ATTEND'>('SILENT');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAiTimezone(data.aiTimezone);
    setAlwaysOn(data.aiBusinessHours == null);
    setHours(data.aiBusinessHours ?? DEFAULT_BUSINESS_HOURS);
    setOutOfHoursMessage(data.aiOutOfHoursMessage ?? '');
    setOffHoursMode(data.aiOffHoursMode ?? 'SILENT');
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await aiSettingsService.update({
        aiTimezone,
        aiBusinessHours: alwaysOn ? null : hours,
        aiOutOfHoursMessage: outOfHoursMessage,
        aiOffHoursMode: offHoursMode,
      });
      toast.success('Horário de atendimento salvo');
      qc.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-72 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <CalendarClock className="h-5 w-5 text-primary" />
            Horário de atendimento
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Defina os dias e horários da agência e o que a IA faz fora deles
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>

      {/* Business hours */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Dias e horários
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {alwaysOn
                ? 'Atendimento a qualquer hora — 24 horas por dia, todos os dias.'
                : 'Fora desses horários a equipe humana não está disponível.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Atendimento 24/7
              </span>
              <Toggle checked={alwaysOn} onChange={setAlwaysOn} />
            </label>
            <select
              value={aiTimezone}
              onChange={(e) => setAiTimezone(e.target.value)}
              disabled={alwaysOn}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {alwaysOn ? null : (
          <BusinessHoursEditor value={hours} onChange={setHours} />
        )}
      </section>

      {/* Out of hours mode selector */}
      {alwaysOn ? null : (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Fora do horário, a Aline:
          </p>
          <div className="mt-3 space-y-2">
            {([
              ['SILENT', 'Não responde', 'O lead não recebe nada fora do horário.'],
              ['MESSAGE', 'Envia uma mensagem fixa', 'Manda um texto pronto uma vez e não conversa.'],
              ['ATTEND', 'Continua atendendo e avisa o horário', 'A Aline responde 24/7, qualifica e avisa quando a equipe volta.'],
            ] as const).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <input
                  type="radio"
                  name="offHoursMode"
                  checked={offHoursMode === value}
                  onChange={() => setOffHoursMode(value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm text-zinc-800 dark:text-zinc-200">{label}</span>
                  <span className="block text-xs text-zinc-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          {offHoursMode === 'MESSAGE' ? (
            <textarea
              value={outOfHoursMessage}
              onChange={(e) => setOutOfHoursMessage(e.target.value)}
              rows={2}
              placeholder="Olá! No momento estamos fora do horário. Voltamos {proximo_horario} e respondemos por aqui."
              className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          ) : null}
        </section>
      )}
    </div>
  );
}
