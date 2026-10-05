'use client';

import { useEffect, useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiSettingsService,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_WATCHDOG_CONFIG,
  type BusinessHoursConfig,
  type WatchdogConfig,
} from '@/features/ai-agents/services/ai-settings.service';
import { channelsService, type Channel } from '@/features/channels/services/channels.service';
import { BusinessHoursEditor } from '@/features/settings/components/business-hours-editor';
import { Toggle } from '@/features/settings/components/toggle';
import { getErrorMessage } from '@/lib/errors';
import { channelTypeLabel } from '@/lib/channel-labels';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

export default function SettingsAiPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => aiSettingsService.get(),
  });

  const [aiEnabled, setAiEnabled] = useState(true);
  const [businessNotes, setBusinessNotes] = useState('');
  const [autoDisable, setAutoDisable] = useState(true);
  const [tokenCap, setTokenCap] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // ─── Watchdog state ──────────────────────────────
  const [watchdogEnabled, setWatchdogEnabled] = useState(true);
  const [watchdogHours, setWatchdogHours] =
    useState<BusinessHoursConfig>(DEFAULT_BUSINESS_HOURS);
  const [watchdogAlwaysOn, setWatchdogAlwaysOn] = useState(true);
  const [watchdogConfig, setWatchdogConfig] = useState<Required<WatchdogConfig>>(
    DEFAULT_WATCHDOG_CONFIG,
  );

  // ─── URL whitelist state ─────────────────────────
  const [allowedDomainsText, setAllowedDomainsText] = useState('');

  useEffect(() => {
    if (!data) return;
    setAiEnabled(data.aiEnabled);
    setBusinessNotes(data.aiBusinessNotes ?? '');
    setAutoDisable(data.aiAutoDisableOnHuman);
    setTokenCap(data.aiMonthlyTokenCap?.toString() ?? '');
    setWatchdogEnabled(data.watchdogEnabled);
    setWatchdogAlwaysOn(data.watchdogBusinessHours == null);
    setWatchdogHours(data.watchdogBusinessHours ?? DEFAULT_BUSINESS_HOURS);
    setWatchdogConfig({ ...DEFAULT_WATCHDOG_CONFIG, ...(data.watchdogConfig ?? {}) });
    setAllowedDomainsText((data.allowedUrlDomains ?? []).join('\n'));
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedDomains = allowedDomainsText
        .split(/[\n,]+/)
        .map((d) =>
          d
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, ''),
        )
        .filter(Boolean);
      await aiSettingsService.update({
        aiEnabled,
        aiBusinessNotes: businessNotes.trim() ? businessNotes : null,
        aiAutoDisableOnHuman: autoDisable,
        aiMonthlyTokenCap: tokenCap ? parseInt(tokenCap, 10) : null,
        watchdogEnabled,
        watchdogBusinessHours: watchdogAlwaysOn ? null : watchdogHours,
        watchdogConfig: watchdogConfig,
        allowedUrlDomains: parsedDomains.length > 0 ? parsedDomains : null,
      });
      toast.success('Configurações de IA salvas');
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
        title="Inteligência Artificial"
        description="Configure quando e como os agentes de IA atendem."
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        }
      />

      {/* Kill switch */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              IA habilitada (geral)
            </p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              Padrão para novas conversas. Cada canal pode ter a própria
              regra (abaixo), e cada conversa também pode ligar ou desligar
              a IA.
            </p>
          </div>
          <Toggle checked={aiEnabled} onChange={setAiEnabled} label="IA habilitada (geral)" />
        </label>
      </section>

      {/* Override por canal */}
      <ChannelAiOverrides />

      {/* Auto-disable on human */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Pausar IA quando humano responde
            </p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              Assim que um atendente envia uma mensagem na conversa, a IA é
              automaticamente desativada nessa conversa específica.
            </p>
          </div>
          <Toggle checked={autoDisable} onChange={setAutoDisable} label="Pausar IA quando humano responde" />
        </label>
      </section>

      {/* Business notes — vai pro contexto de TODOS os agentes da org */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm font-medium text-foreground">
          Contexto do negócio (visto por todos os agentes)
        </p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Texto livre que entra nas instruções de cada agente. Use pra info que
          muda com frequência e vale pra qualquer fluxo:
          como cada isca/lead magnet é entregue, horários de live, política de
          reembolso, talking points atuais, regras especiais.
          Atualize aqui em vez de editar agente por agente.
        </p>
        <textarea
          aria-label="Contexto do negócio"
          value={businessNotes}
          onChange={(e) => setBusinessNotes(e.target.value)}
          rows={8}
          maxLength={4000}
          placeholder={`Exemplos:

Iscas gratuitas:
- "MAESTRIA": entrega via aula ao vivo todo dia às 20h, link liberado 30min antes no grupo do WhatsApp.
- "EBOOK": link de download enviado automaticamente por email após mandar a palavra.

Política de bônus:
- Liberação 7 dias após a compra, automaticamente no portal. Sem liberação manual antes disso.

Reembolso:
- Garantia de 7 dias. Após esse prazo, escalar pra atendimento humano.`}
          className={`${controlCls} mt-3 h-auto w-full py-2 leading-relaxed`}
        />
        <p className="mt-1 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
          {businessNotes.length} / 4000
        </p>
      </section>

      {/* Token cap */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm font-medium text-foreground">
          Limite mensal de tokens
        </p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Soma dos tokens de entrada e de saída. Vazio = sem limite.
        </p>
        <input
          type="number"
          min="0"
          aria-label="Limite mensal de tokens"
          value={tokenCap}
          onChange={(e) => setTokenCap(e.target.value)}
          placeholder="Ex.: 1000000"
          className={`${controlCls} mt-3 w-48 font-mono tabular-nums`}
        />
      </section>

      {/* URL Whitelist */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <Link2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              Domínios permitidos em links da IA
            </p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              Quando preenchida, a IA não consegue mandar URL com host fora
              dessa lista — o sistema bloqueia na hora do envio e força a IA a
              reescrever sem o link inventado. A comparação é pelo final do endereço: <code className="font-mono text-[11px]">bravy.co</code> autoriza
              <code className="ml-1 font-mono text-[11px]">members.bravy.co</code>. Vazia = não bloqueia (só registra um aviso).
            </p>
            <p className="mt-1 text-xs font-medium text-warning-ink">
              Recomendado preencher — a IA já inventou domínios inexistentes em produção.
            </p>
            <textarea
              aria-label="Domínios permitidos, um por linha"
              value={allowedDomainsText}
              onChange={(e) => setAllowedDomainsText(e.target.value)}
              rows={5}
              placeholder={`bravy.co\ntrivapp.com.br\nalunos.bravy.school`}
              className={`${controlCls} mt-3 h-auto w-full py-2 font-mono text-xs leading-relaxed`}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Um domínio por linha. Cole sem <code>https://</code> ou <code>www.</code> — a gente normaliza.
            </p>
          </div>
        </div>
      </section>

      {/* Watchdog header */}
      <h3 className="mt-10 text-base font-semibold text-foreground">Watchdog de conversas presas</h3>
      <p className="mb-4 mt-1 max-w-prose text-sm text-muted-foreground">
        Detecta conversas onde a IA travou ou o humano abandonou e reativa o
        atendimento automaticamente. Roda em camadas: agenda um timer toda vez
        que o cliente manda mensagem e tem uma varredura de segurança que procura
        conversas presas a cada 15 minutos.
      </p>

      {/* Watchdog kill switch */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Watchdog habilitado
            </p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              Quando desligado, conversas presas ficam paradas até um humano
              intervir. Recomendado deixar ligado.
            </p>
          </div>
          <Toggle checked={watchdogEnabled} onChange={setWatchdogEnabled} label="Watchdog habilitado" />
        </label>
      </section>

      {/* Watchdog params */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm font-medium text-foreground">
          Parâmetros
        </p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Controle quanto o watchdog espera antes de reagir e quantas vezes
          tenta antes de marcar a conversa como presa.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="IA travou"
            hint="Minutos sem resposta com IA atendendo."
            suffix="min"
            value={watchdogConfig.delayBotMin}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, delayBotMin: v }))
            }
            disabled={!watchdogEnabled}
          />
          <NumberField
            label="Ninguém pegou"
            hint="Minutos sem ninguém assumir a conversa."
            suffix="min"
            value={watchdogConfig.delayPendingMin}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, delayPendingMin: v }))
            }
            disabled={!watchdogEnabled}
          />
          <NumberField
            label="Humano abandonou"
            hint="Minutos sem o atendente humano responder."
            suffix="min"
            value={watchdogConfig.delayHumanIdleMin}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, delayHumanIdleMin: v }))
            }
            disabled={!watchdogEnabled}
          />
          <NumberField
            label="Tentativas máximas"
            hint="Após esse número, marca como presa e notifica gestor."
            suffix=""
            value={watchdogConfig.maxAttempts}
            onChange={(v) =>
              setWatchdogConfig((c) => ({ ...c, maxAttempts: v }))
            }
            disabled={!watchdogEnabled}
            min={1}
            max={10}
          />
        </div>
      </section>

      {/* Watchdog business hours */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Horário de atuação do watchdog
            </p>
            <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
              {watchdogAlwaysOn
                ? 'O watchdog roda 24/7 e reativa conversas a qualquer hora.'
                : 'Fora desse horário o watchdog não reativa conversas.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                24/7
              </span>
              <Toggle
                checked={watchdogAlwaysOn}
                onChange={setWatchdogAlwaysOn}
                label="Watchdog ativo 24 horas por dia, 7 dias por semana"
              />
            </label>
          </div>
        </div>

        {watchdogAlwaysOn ? null : (
          <BusinessHoursEditor
            value={watchdogHours}
            onChange={setWatchdogHours}
            disabledLabel="Não atua"
          />
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  hint,
  suffix,
  value,
  onChange,
  disabled,
  min = 1,
  max = 1440,
}: {
  label: string;
  hint: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          className={`${controlCls} w-20 font-mono tabular-nums`}
        />
        {suffix ? (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Lista todos os canais ativos com um tri-state selector pra IA por canal:
 *   "Padrão" (null) → segue o toggle global da org
 *   "Forçar ON" (true) → IA responde nesse canal mesmo se org tá OFF
 *   "Forçar OFF" (false) → IA não responde nesse canal mesmo com org ON
 *
 * Cada mudança chama PATCH /channels/:id imediatamente — não precisa salvar.
 */
function ChannelAiOverrides() {
  const qc = useQueryClient();
  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
  });

  const update = async (id: string, value: boolean | null) => {
    try {
      await channelsService.update(id, { aiEnabled: value });
      qc.invalidateQueries({ queryKey: ['channels'] });
      toast.success(
        value === null
          ? 'Canal seguindo o padrão da organização'
          : value
            ? 'IA ligada nesse canal'
            : 'IA desligada nesse canal',
      );
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    }
  };

  const visible = (channels ?? []).filter((c) => !!c.isActive);

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3">
        <p className="text-sm font-medium text-foreground">
          IA por canal
        </p>
        <p className="mt-0.5 max-w-prose text-xs text-muted-foreground">
          Vale no lugar da chave geral acima, canal por canal. Útil pra ligar IA só num
          número de teste, ou desligar num canal de produção temporariamente.
        </p>
      </div>

      {isLoading ? (
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
      ) : visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum canal ativo. Adicione canais na aba Canais.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => (
            <ChannelOverrideRow
              key={c.id}
              channel={c}
              onChange={(v) => update(c.id, v)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChannelOverrideRow({
  channel,
  onChange,
}: {
  channel: Channel;
  onChange: (v: boolean | null) => void;
}) {
  // Selecionado = pílula clara com texto escuro nos três casos; o ponto
  // colorido diz se está ligada ou desligada, sem depender só da cor do fundo.
  const opts: Array<{ value: 'inherit' | 'on' | 'off'; label: string; dot: string }> = [
    { value: 'inherit', label: 'Padrão', dot: 'bg-zinc-400' },
    { value: 'on', label: 'Ligada', dot: 'bg-success' },
    { value: 'off', label: 'Desligada', dot: 'bg-urgent' },
  ];
  const current: 'inherit' | 'on' | 'off' =
    channel.aiEnabled === null || channel.aiEnabled === undefined
      ? 'inherit'
      : channel.aiEnabled
        ? 'on'
        : 'off';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {channel.name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {channelTypeLabel(channel.type)}
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label={`IA no canal ${channel.name}`}
        className="inline-flex shrink-0 rounded-lg bg-muted p-0.5"
      >
        {opts.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                onChange(
                  opt.value === 'inherit' ? null : opt.value === 'on',
                )
              }
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
