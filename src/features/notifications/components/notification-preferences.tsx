'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Bell, Monitor, Volume2, VolumeX, Moon, Lock,
  MessageSquare, Users, AlertTriangle, ArrowRightLeft, AtSign, Cog, Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { controlCls } from '@/components/ui/control';
import { notificationsSettingsService } from '@/features/settings/services/notifications.service';
import { useNotificationStore } from '@/features/notifications/stores/notification-store';

const notifTypes = [
  { type: 'NEW_MESSAGE', label: 'Nova mensagem', description: 'Quando um cliente envia uma mensagem', icon: MessageSquare },
  { type: 'CONVERSATION_ASSIGNED', label: 'Conversa atribuída', description: 'Quando uma conversa é atribuída a você', icon: Users },
  { type: 'CONVERSATION_TRANSFERRED', label: 'Transferência', description: 'Quando uma conversa é transferida para você', icon: ArrowRightLeft },
  { type: 'SLA_WARNING', label: 'Alerta de SLA', description: 'Quando o tempo de SLA está se esgotando', icon: AlertTriangle },
  { type: 'SLA_BREACH', label: 'SLA violado', description: 'Quando o SLA foi ultrapassado', icon: AlertTriangle },
  { type: 'MENTION', label: 'Menção', description: 'Quando alguém menciona você em uma nota', icon: AtSign },
  { type: 'SYSTEM', label: 'Sistema', description: 'Avisos e atualizações do sistema', icon: Cog },
  { type: 'AI_TOOL_FAILURE', label: 'Falha da IA', description: 'Quando a IA não conseguiu executar uma ação', icon: Bot },
];

interface Preferences {
  [type: string]: { inApp: boolean; browserPush: boolean; sound: boolean };
}

const CARD_CLS = 'rounded-xl border border-border bg-card shadow-soft';
const TH_CLS = 'px-2 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:px-4';
const TOGGLE_CELL_CLS = 'px-2 py-3 text-center align-middle sm:px-4';

/** Por que a coluna Push está travada, em palavras de quem usa. */
function pushBlockedReason(permission: NotificationPermission | 'unsupported'): string | null {
  if (permission === 'granted') return null;
  if (permission === 'unsupported') {
    return 'Este navegador não tem suporte a notificações push, por isso a coluna Push fica desligada.';
  }
  if (permission === 'denied') {
    return 'O navegador bloqueou as notificações deste site. Libere nas permissões do site (cadeado na barra de endereço) para usar a coluna Push.';
  }
  return 'A coluna Push fica desligada até você ativar as notificações push acima. Suas escolhas ficam guardadas.';
}

const defaultPrefs = (): Preferences =>
  Object.fromEntries(notifTypes.map((t) => [t.type, { inApp: true, browserPush: true, sound: true }]));

/**
 * Preferências de notificação e som. São por usuário, então moram em Minha
 * conta: em Configurações o Operador não entrava, e o gestor que abria a tela
 * mexia nas PRÓPRIAS preferências, não nas do operador.
 */
export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  // Salvar antes de carregar gravava os defaults (som LIGADO) por cima do que
  // o usuário tinha desligado — por isso o botão só libera depois do GET.
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [savingSound, setSavingSound] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    } else {
      setPushPermission('unsupported');
    }
  }, []);

  useEffect(() => {
    notificationsSettingsService.getPreferences().then((rows) => {
      if (rows.length) {
        setPrefs((prev) => {
          const next = { ...prev };
          for (const r of rows) next[r.type] = { inApp: r.inApp, browserPush: r.browserPush, sound: r.sound };
          return next;
        });
        const withDnd = rows.find((r) => r.dndStart && r.dndEnd);
        if (withDnd) {
          setDndEnabled(true);
          setDndStart(withDnd.dndStart!);
          setDndEnd(withDnd.dndEnd!);
        }
      }
      setLoadState('ready');
    }).catch(() => setLoadState('error'));
  }, []);

  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      toast.error('Notificações push não são suportadas neste navegador');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === 'granted') {
      toast.success('Notificações push ativadas!');
    } else {
      toast.error('Permissão negada pelo navegador');
    }
  };

  const toggle = (type: string, channel: 'inApp' | 'browserPush' | 'sound') => {
    setPrefs((prev) => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  };

  const buildPayload = (source: Preferences) =>
    notifTypes.map((t) => {
      const p = source[t.type] ?? { inApp: true, browserPush: true, sound: true };
      return {
        type: t.type,
        inApp: p.inApp,
        browserPush: p.browserPush,
        sound: p.sound,
        dndStart: dndEnabled ? dndStart : null,
        dndEnd: dndEnabled ? dndEnd : null,
      };
    });

  const handleSave = async () => {
    if (loadState !== 'ready') return;
    try {
      const saved = await notificationsSettingsService.updatePreferences(buildPayload(prefs));
      useNotificationStore.getState().setPrefs(saved);
      toast.success('Preferências salvas!');
    } catch {
      toast.error('Não foi possível salvar as preferências');
    }
  };

  const anySoundOn = notifTypes.some((t) => prefs[t.type]?.sound);

  // Interruptor geral: vale para TODOS os tipos (SLA, sistema, IA...) e já
  // salva — antes o usuário desligava só "Nova mensagem", ou esquecia o
  // "Salvar", e o som voltava.
  const handleToggleAllSound = async () => {
    if (loadState !== 'ready' || savingSound) return;
    const sound = !anySoundOn;
    const next: Preferences = Object.fromEntries(
      notifTypes.map((t) => [t.type, { ...(prefs[t.type] ?? { inApp: true, browserPush: true }), sound }]),
    ) as Preferences;
    setSavingSound(true);
    try {
      const saved = await notificationsSettingsService.updatePreferences(buildPayload(next));
      setPrefs(next);
      useNotificationStore.getState().setPrefs(saved);
      toast.success(sound ? 'Som das notificações ligado' : 'Som das notificações desligado');
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.');
    } finally {
      setSavingSound(false);
    }
  };

  const isPushEnabled = pushPermission === 'granted';
  const pushBlocked = pushBlockedReason(pushPermission);

  return (
    <div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">Notificações</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Configure como e quando você quer ser avisado</p>
      </div>

      <div className="mt-6 space-y-6">
        {loadState === 'error' && (
          <div role="alert" className="rounded-xl bg-urgent-wash p-4 text-sm text-urgent-ink">
            Não foi possível carregar suas preferências. Recarregue a página antes de alterar.
          </div>
        )}

        {/* Som geral */}
        <div className={`flex items-center justify-between gap-4 p-4 sm:p-5 ${CARD_CLS}`}>
          <div className="flex min-w-0 items-center gap-3">
            {anySoundOn ? (
              <Volume2 aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <VolumeX aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Som das notificações</p>
              <p className="text-xs text-muted-foreground">Liga ou desliga o som de todos os avisos. Salva na hora.</p>
            </div>
          </div>
          <Switch
            checked={anySoundOn}
            onChange={handleToggleAllSound}
            disabled={loadState !== 'ready' || savingSound}
            label="Som das notificações"
          />
        </div>

        {/* Permissão de push */}
        {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-wash p-4 text-warning-ink">
            <div className="flex min-w-0 items-center gap-3">
              <Monitor aria-hidden="true" className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Notificações push desativadas</p>
                <p className="text-xs">Ative para receber alertas mesmo quando a aba estiver fechada</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRequestPush} className="shrink-0 text-foreground">
              Ativar push
            </Button>
          </div>
        )}

        {pushPermission === 'granted' && (
          <div className="flex items-center gap-3 rounded-xl bg-success-wash p-4 text-success-ink">
            <Monitor aria-hidden="true" className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Notificações push ativas</p>
              <p className="text-xs">Você vai receber alertas no navegador</p>
            </div>
          </div>
        )}

        {/* Não perturbe */}
        <div className={`p-4 sm:p-5 ${CARD_CLS}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Moon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Não perturbe</p>
                <p className="text-xs text-muted-foreground">Silenciar notificações em horários específicos</p>
              </div>
            </div>
            <Switch checked={dndEnabled} onChange={setDndEnabled} label="Não perturbe" />
          </div>
          {dndEnabled && (
            <div className="mt-4 flex flex-wrap items-end gap-3 sm:pl-8">
              <div>
                <label htmlFor="dnd-start" className="mb-1 block text-sm font-medium text-foreground">De</label>
                <input
                  id="dnd-start"
                  type="time"
                  value={dndStart}
                  onChange={(e) => setDndStart(e.target.value)}
                  className={`${controlCls} font-mono tabular-nums`}
                />
              </div>
              <div>
                <label htmlFor="dnd-end" className="mb-1 block text-sm font-medium text-foreground">Até</label>
                <input
                  id="dnd-end"
                  type="time"
                  value={dndEnd}
                  onChange={(e) => setDndEnd(e.target.value)}
                  className={`${controlCls} font-mono tabular-nums`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Matriz de notificações */}
        <div className={`overflow-hidden ${CARD_CLS}`}>
          {pushBlocked && (
            <p className="flex items-start gap-2 border-b border-border bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
              <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span id="push-column-hint">{pushBlocked}</span>
            </p>
          )}
          <div className="overflow-x-auto">
            <table aria-label="Preferências por tipo de notificação" className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th scope="col" className={`${TH_CLS} pl-4 text-left`}>Tipo de notificação</th>
                  <th scope="col" className={`${TH_CLS} text-center`}>
                    <div className="flex flex-col items-center gap-0.5">
                      <Bell aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>No app</span>
                    </div>
                  </th>
                  <th scope="col" className={`${TH_CLS} text-center`} aria-describedby={pushBlocked ? 'push-column-hint' : undefined}>
                    <div className="flex flex-col items-center gap-0.5">
                      {isPushEnabled ? (
                        <Monitor aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                      <span>Push</span>
                    </div>
                  </th>
                  <th scope="col" className={`${TH_CLS} text-center`}>
                    <div className="flex flex-col items-center gap-0.5">
                      <Volume2 aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>Som</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {notifTypes.map((nt) => {
                  const Icon = nt.icon;
                  const pref = prefs[nt.type];
                  return (
                    <tr key={nt.type} className="border-b border-border last:border-b-0">
                      <th scope="row" className="py-3 pl-4 pr-2 text-left font-normal">
                        <div className="flex items-center gap-3">
                          <Icon aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{nt.label}</p>
                            <p className="text-xs text-muted-foreground">{nt.description}</p>
                          </div>
                        </div>
                      </th>
                      <td className={TOGGLE_CELL_CLS}>
                        <Switch
                          size="sm"
                          checked={pref.inApp}
                          onChange={() => toggle(nt.type, 'inApp')}
                          label={`${nt.label}: avisar no app`}
                        />
                      </td>
                      <td className={TOGGLE_CELL_CLS} title={pushBlocked ?? undefined}>
                        {/* Travado = mostrado desligado e opaco (o push não dispara);
                            a escolha salva volta a aparecer quando o push é ativado. */}
                        <Switch
                          size="sm"
                          checked={isPushEnabled && pref.browserPush}
                          onChange={() => toggle(nt.type, 'browserPush')}
                          disabled={!isPushEnabled}
                          className="disabled:opacity-100"
                          label={
                            isPushEnabled
                              ? `${nt.label}: notificação push`
                              : `${nt.label}: notificação push (indisponível)`
                          }
                        />
                      </td>
                      <td className={TOGGLE_CELL_CLS}>
                        <Switch
                          size="sm"
                          checked={pref.sound}
                          onChange={() => toggle(nt.type, 'sound')}
                          label={`${nt.label}: tocar som`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ação de salvar no pé da coluna: acompanha a rolagem enquanto as
          preferências estão na tela, em vez de flutuar ao lado do título. */}
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          Não perturbe e as escolhas da tabela só valem depois de salvar.
        </p>
        <Button onClick={handleSave} disabled={loadState !== 'ready'} className="ml-auto shrink-0">
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
