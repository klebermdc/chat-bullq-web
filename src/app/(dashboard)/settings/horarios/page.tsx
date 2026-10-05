'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiSettingsService,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursConfig,
} from '@/features/ai-agents/services/ai-settings.service';
import { membersService, type Member } from '@/features/settings/services/members.service';
import { BusinessHoursEditor } from '@/features/settings/components/business-hours-editor';
import { MemberWorkingHoursDrawer } from '@/features/settings/components/member-working-hours-drawer';
import { Toggle } from '@/features/settings/components/toggle';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { controlCls, controlSmCls } from '@/components/ui/control';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

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
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersService.list(),
  });

  const [aiTimezone, setAiTimezone] = useState('America/Sao_Paulo');
  const [hours, setHours] = useState<BusinessHoursConfig>(DEFAULT_BUSINESS_HOURS);
  // 24/7: representado no banco como aiBusinessHours = null. Mantemos os
  // valores de `hours` no state mesmo com 24/7 ON pra preservar a config
  // anterior se o user voltar atrás.
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState('');
  const [offHoursMode, setOffHoursMode] = useState<'SILENT' | 'MESSAGE' | 'ATTEND'>('SILENT');
  const [offHoursTemplate, setOffHoursTemplate] = useState('');
  const [saving, setSaving] = useState(false);

  // Drawer de horário por atendente (reusa o de Configurações → Membros).
  const [workingHoursMember, setWorkingHoursMember] = useState<Member | null>(null);

  useEffect(() => {
    if (!data) return;
    setAiTimezone(data.aiTimezone);
    setAlwaysOn(data.aiBusinessHours == null);
    setHours(data.aiBusinessHours ?? DEFAULT_BUSINESS_HOURS);
    setOutOfHoursMessage(data.aiOutOfHoursMessage ?? '');
    setOffHoursMode(data.aiOffHoursMode ?? 'SILENT');
    setOffHoursTemplate(data.offHoursMessageTemplate ?? '');
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await aiSettingsService.update({
        aiTimezone,
        aiBusinessHours: alwaysOn ? null : hours,
        aiOutOfHoursMessage: outOfHoursMessage,
        aiOffHoursMode: offHoursMode,
        offHoursMessageTemplate: offHoursTemplate.trim() ? offHoursTemplate : null,
      });
      toast.success('Horário de atendimento salvo');
      qc.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <SettingsPageHeader
        title="Horário de atendimento"
        description="Defina o horário geral da agência, o de cada atendente e o que a IA faz fora deles."
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        }
      />

      {/* Horário geral da agência */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Horário geral da agência
            </p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              {alwaysOn
                ? 'Atendimento a qualquer hora — 24 horas por dia, todos os dias.'
                : 'Fora desses horários a equipe humana não está disponível.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                Atendimento 24/7
              </span>
              <Toggle checked={alwaysOn} onChange={setAlwaysOn} label="Atendimento 24 horas por dia, 7 dias por semana" />
            </label>
            <select
              value={aiTimezone}
              onChange={(e) => setAiTimezone(e.target.value)}
              disabled={alwaysOn}
              aria-label="Fuso horário"
              className={controlSmCls}
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
        <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm font-medium text-foreground">
            Fora do horário, a Aline:
          </p>
          <div className="mt-3 space-y-2">
            {([
              ['SILENT', 'Não responde', 'O lead não recebe nada fora do horário.'],
              ['MESSAGE', 'Envia uma mensagem fixa', 'Manda um texto pronto uma vez e não conversa.'],
              ['ATTEND', 'Continua atendendo e avisa o horário', 'A Aline responde 24/7, qualifica e avisa quando a equipe volta.'],
            ] as const).map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                  offHoursMode === value ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="offHoursMode"
                  checked={offHoursMode === value}
                  onChange={() => setOffHoursMode(value)}
                  className="mt-0.5 h-4 w-4 shrink-0 border-input"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          {offHoursMode === 'MESSAGE' ? (
            <textarea
              aria-label="Mensagem fixa enviada fora do horário"
              value={outOfHoursMessage}
              onChange={(e) => setOutOfHoursMessage(e.target.value)}
              rows={2}
              placeholder="Olá! No momento estamos fora do horário. Voltamos {proximo_horario} e respondemos por aqui."
              className={`${controlCls} mt-3 h-auto w-full py-2`}
            />
          ) : null}
        </section>
      )}

      {/* Horário por atendente */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm font-medium text-foreground">
          Horário por atendente
        </p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Cada atendente pode ter a própria grade. Quando ligado, o cliente recebe
          um aviso se escrever numa conversa desse atendente fora do horário dele.
        </p>

        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {!members || members.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Nenhum atendente encontrado.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.offHoursNoticeEnabled
                        ? 'Avisa o cliente fora do horário'
                        : 'Sem aviso fora do horário'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkingHoursMember(m)}
                  aria-label={`Editar horário de ${m.user.name}`}
                  className="shrink-0"
                >
                  <Pencil aria-hidden="true" className="h-3 w-3" />
                  Editar horário
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Aviso de atendente fora do horário (template compartilhado) */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm font-medium text-foreground">
          Aviso de atendente fora do horário
        </p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Mensagem enviada quando um atendente com aviso ligado tem uma conversa
          fora da grade dele. Use{' '}
          <code className="font-mono text-[11px]">{'{atendente}'}</code> e{' '}
          <code className="font-mono text-[11px]">{'{proximo_horario}'}</code>{' '}
          como variáveis — vazio usa o texto padrão.
        </p>
        <textarea
          aria-label="Aviso de atendente fora do horário"
          value={offHoursTemplate}
          onChange={(e) => setOffHoursTemplate(e.target.value)}
          rows={3}
          placeholder="Oi! No momento o {atendente} está fora do horário de atendimento. Ele retorna {proximo_horario} e responde você assim que possível 🙂"
          className={`${controlCls} mt-3 h-auto w-full py-2`}
        />
      </section>

      <MemberWorkingHoursDrawer
        open={!!workingHoursMember}
        member={workingHoursMember}
        onClose={() => setWorkingHoursMember(null)}
      />
    </div>
  );
}
