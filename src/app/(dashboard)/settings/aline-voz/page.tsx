'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePageTitle } from '@/components/layout/use-page-title';
import { controlCls } from '@/components/ui/control';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';
import { Toggle } from '@/features/settings/components/toggle';
import {
  DELAY_OPTIONS,
  fetchVoiceSettings,
  updateSellerCalls,
  updateVoiceSettings,
  voiceSummary,
  VOICE_SETTINGS_QUERY_KEY,
  type VoiceCallSettings,
} from '@/features/voice/api';

export default function AlineVozSettingsPage() {
  usePageTitle('Ligações pelo WhatsApp');
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const { data, isLoading, isError, error } = useQuery({ queryKey: VOICE_SETTINGS_QUERY_KEY, queryFn: fetchVoiceSettings });

  const save = useMutation({
    mutationFn: updateVoiceSettings,
    onSuccess: (next: VoiceCallSettings) => {
      queryClient.setQueryData(VOICE_SETTINGS_QUERY_KEY, next);
      toast.success(next.enabled ? 'Ligações da Aline ligadas' : 'Ligações da Aline desligadas');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível salvar.')),
  });

  const saveSellers = useMutation({
    mutationFn: updateSellerCalls,
    onSuccess: (next: VoiceCallSettings) => {
      queryClient.setQueryData(VOICE_SETTINGS_QUERY_KEY, next);
      toast.success(next.sellerCallsEnabled ? 'Vendedores podem ligar pelo WhatsApp' : 'Ligações de vendedor desligadas');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível salvar.')),
  });

  const toggle = async (enabled: boolean) => {
    if (!data) return;
    if (enabled) {
      const ok = await confirm({
        title: 'Ligar as ligações da Aline?',
        description: `A Aline vai pedir permissão de ligação logo depois de cada cotação e ligar para o cliente ${data.delayHours} horas depois, se ele não responder, no horário de atendimento do vendedor.`,
        confirmLabel: 'Ligar',
      });
      if (!ok) return;
    }
    save.mutate({ enabled, delayHours: data.delayHours });
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Ligações pelo WhatsApp"
        description="A Aline liga pelo WhatsApp para quem recebeu uma cotação e não respondeu: confirma se o cliente viu e oferece marcar uma conversa com o vendedor dele na Agenda."
      />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {isError && <p className="text-sm text-destructive">{getErrorMessage(error, 'Não foi possível carregar.')}</p>}

      {data && (
        <div className="space-y-5 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Aline liga para o cliente</p>
              <p className="text-sm text-muted-foreground">{voiceSummary(data)}</p>
            </div>
            <Toggle checked={data.enabled} onChange={toggle} label="Ligações da Aline" />
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Ligar quantas horas depois da cotação sem resposta</span>
            <select
              className={controlCls}
              value={data.delayHours}
              disabled={save.isPending}
              onChange={(e) => save.mutate({ enabled: data.enabled, delayHours: Number(e.target.value) })}
            >
              {DELAY_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h} horas
                </option>
              ))}
            </select>
          </label>

          {!data.dialerConfigured && (
            <p className="rounded-md bg-warning-wash p-3 text-sm text-warning-ink">
              A conexão de ligações (LiveKit + WhatsApp Calling no número) ainda não foi ativada. Enquanto isso, mesmo ligada, nenhuma ligação sai.
            </p>
          )}

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Só liga para quem aceitou receber ligação da empresa no WhatsApp (a Meta exige).</li>
            <li>Uma tentativa por cotação, só no horário de atendimento e só se a conversa tem vendedor.</li>
            <li>Tudo o que a Aline fizer aparece como aviso na conversa do cliente.</li>
          </ul>
        </div>
      )}
      {data && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Vendedores ligam pelo WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                {data.sellerCallsEnabled
                  ? 'Ligado: na conversa, o vendedor dono (e a gestão) liga para o cliente pelo WhatsApp, falando pelo computador.'
                  : 'Desligado: o botão de ligar da conversa avisa que as ligações estão desligadas.'}
              </p>
            </div>
            <Toggle checked={data.sellerCallsEnabled} onChange={(v) => saveSellers.mutate(v)} label="Vendedores ligam pelo WhatsApp" />
          </div>
          <p className="text-sm text-muted-foreground">
            Só liga para quem permitiu ligações (sem permissão, o botão manda o pedido ao cliente). Use fone de ouvido para evitar eco.
          </p>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
