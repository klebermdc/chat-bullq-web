'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '../stores/notification-store';
import { syncPushSubscription, unsubscribeThisDevice, type PushSyncResult } from '../lib/push-client';
import { pushDeviceState, readPushDeviceEnv, type PushDeviceState } from '../lib/push-device';

export type PushPermission = NotificationPermission | 'unsupported';

interface Props {
  permission: PushPermission;
  onPermissionChange: (p: PushPermission) => void;
}

const WARN_CLS = 'flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-wash p-4 text-warning-ink';
const OK_CLS = 'flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-wash p-4 text-success-ink';
const INFO_CLS = 'flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground';

const SYNC_MESSAGES: Record<Exclude<PushSyncResult, 'active'>, string> = {
  'not-granted': 'O navegador não liberou as notificações.',
  unsupported: 'Este navegador não recebe push.',
  'server-disabled': 'O push ainda não foi ligado no servidor. Os avisos chegam com o Sendtur aberto.',
  'no-service-worker': 'Não foi possível preparar este aparelho. Recarregue a página e tente de novo.',
  error: 'Não foi possível ativar neste aparelho. Tente de novo.',
};

function reportSync(result: PushSyncResult) {
  if (result === 'active') {
    toast.success('Pronto! Os avisos chegam neste aparelho mesmo com o Sendtur fechado.');
    return;
  }
  toast.error(SYNC_MESSAGES[result]);
}

function Texts({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs">{text}</p>
    </div>
  );
}

/**
 * Situação do push NESTE aparelho: pedir permissão, inscrever, desativar, e
 * o aviso do iPhone (push só com o Sendtur instalado na Tela de Início).
 */
export function PushDeviceCard({ permission, onPermissionChange }: Props) {
  const pushActive = useNotificationStore((s) => s.pushActive);
  const [device, setDevice] = useState<PushDeviceState>('ready');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDevice(pushDeviceState(readPushDeviceEnv()));
  }, []);

  const activate = async () => {
    setBusy(true);
    try {
      const next = await Notification.requestPermission();
      onPermissionChange(next);
      if (next !== 'granted') {
        toast.error('Permissão negada pelo navegador');
        return;
      }
      reportSync(await syncPushSubscription());
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      await unsubscribeThisDevice();
      toast.success('Push desativado neste aparelho.');
    } finally {
      setBusy(false);
    }
  };

  if (device === 'ios-needs-install') {
    return (
      <div className={INFO_CLS}>
        <Smartphone aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
        <Texts
          title="No iPhone, instale o Sendtur para receber avisos"
          text="No Safari, toque em Compartilhar → Adicionar à Tela de Início e abra o Sendtur pelo ícone. Depois ative o push aqui (iOS 16.4 ou mais novo)."
        />
      </div>
    );
  }

  if (device !== 'ready' || permission === 'unsupported') {
    return (
      <div className={INFO_CLS}>
        <Monitor aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
        <Texts title="Push indisponível neste navegador" text="Abra o Sendtur no Chrome, Edge, Firefox ou Safari para receber avisos com o app fechado." />
      </div>
    );
  }

  if (permission !== 'granted' || !pushActive) {
    return (
      <div className={WARN_CLS}>
        <div className="flex min-w-0 items-center gap-3">
          <Monitor aria-hidden="true" className="h-5 w-5 shrink-0" />
          <Texts title="Push desativado neste aparelho" text="Ative para receber avisos mesmo com o Sendtur fechado" />
        </div>
        <Button variant="outline" size="sm" onClick={activate} disabled={busy || permission === 'denied'} className="shrink-0 text-foreground">
          Ativar push
        </Button>
      </div>
    );
  }

  return (
    <div className={OK_CLS}>
      <div className="flex min-w-0 items-center gap-3">
        <Monitor aria-hidden="true" className="h-5 w-5 shrink-0" />
        <Texts
          title="Push ativo neste aparelho"
          text="Com o Sendtur fechado, você recebe aviso de mensagem, conversa passada para você e chamado de suporte. Com o app aberto, vale o som do app."
        />
      </div>
      <Button variant="outline" size="sm" onClick={deactivate} disabled={busy} className="shrink-0 text-foreground">
        Desativar neste aparelho
      </Button>
    </div>
  );
}
