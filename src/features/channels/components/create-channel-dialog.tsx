'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, X, Copy, Check } from 'lucide-react';
import { channelsService, type ChannelType } from '../services/channels.service';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { loadFacebookSdk, isFacebookSdkReady } from '@/lib/facebook-sdk';

const FB_APP_ID = process.env.NEXT_PUBLIC_WA_APP_ID || '';
const FB_CONFIG_ID = process.env.NEXT_PUBLIC_WA_ES_CONFIG_ID || '';

const channelTypes: { value: ChannelType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  {
    value: 'WHATSAPP_ZAPPFY',
    label: 'WhatsApp (Zappfy)',
    icon: ZappfyIcon,
    color: 'bg-zinc-50 dark:bg-zinc-800',
    description: 'Conecte via Zappfy/Uazapi — sem restrição de 24h',
  },
  {
    value: 'WHATSAPP_OFFICIAL',
    label: 'WhatsApp Official',
    icon: MetaIcon,
    color: 'bg-zinc-50 dark:bg-zinc-800',
    description: 'Meta Cloud API — templates HSM, alta escala',
  },
  {
    value: 'INSTAGRAM',
    label: 'Instagram',
    icon: InstagramIcon,
    color: 'bg-zinc-50 dark:bg-zinc-800',
    description: 'Instagram API com login empresarial — DMs e stories',
  },
];

const zappfySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  token: z.string().min(1, 'Token é obrigatório'),
  webhookSecret: z.string().optional(),
});

const waOfficialSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phoneNumberId: z.string().min(1, 'Phone Number ID é obrigatório'),
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
  appSecret: z.string().min(1, 'App Secret é obrigatório (valida assinatura dos webhooks)'),
  businessAccountId: z.string().optional(),
  webhookSecret: z.string().optional(),
});

const instagramSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
  appSecret: z.string().min(1, 'App Secret é obrigatório'),
  igBusinessId: z.string().optional(),
  igAppId: z.string().optional(),
  webhookSecret: z.string().optional(),
});

type ZappfyFormData = z.infer<typeof zappfySchema>;
type WaOfficialFormData = z.infer<typeof waOfficialSchema>;
type InstagramFormData = z.infer<typeof instagramSchema>;

const inputCls = 'flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100';
const labelCls = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';
const errorCls = 'text-xs text-red-500';

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChannelDialog({ open, onClose, onCreated }: CreateChannelDialogProps) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedType, setSelectedType] = useState<ChannelType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // Default ORG = qualquer membro com permissão padrão enxerga.
  // PRIVATE = apenas quem tiver grant explícito (pra canais sensíveis).
  const [visibility, setVisibility] = useState<'ORG' | 'PRIVATE'>('ORG');
  const [showManual, setShowManual] = useState(false);

  const zappfyForm = useForm<ZappfyFormData>({
    resolver: zodResolver(zappfySchema),
    defaultValues: { name: '', token: '', webhookSecret: '' },
  });

  const waForm = useForm<WaOfficialFormData>({
    resolver: zodResolver(waOfficialSchema),
    defaultValues: { name: '', phoneNumberId: '', accessToken: '', appSecret: '', businessAccountId: '', webhookSecret: '' },
  });

  const igForm = useForm<InstagramFormData>({
    resolver: zodResolver(instagramSchema),
    defaultValues: { name: '', accessToken: '', appSecret: '', igBusinessId: '', igAppId: '', webhookSecret: '' },
  });

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  // Pré-carrega o SDK assim que a tela do WhatsApp Official abre, pra que o
  // clique em "Conectar WhatsApp" possa chamar FB.login SEM await no meio —
  // é o que preserva o gesto do usuário e evita o bloqueio de popup.
  useEffect(() => {
    if (!open || selectedType !== 'WHATSAPP_OFFICIAL') return;
    if (!FB_APP_ID || !FB_CONFIG_ID) return;
    if (isFacebookSdkReady()) return;
    let cancelled = false;
    loadFacebookSdk(FB_APP_ID).catch((err) => {
      if (cancelled) return;
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar o SDK do Facebook');
    });
    return () => { cancelled = true; };
  }, [open, selectedType]);

  const handleTypeSelect = (type: ChannelType) => {
    setSelectedType(type);
    setStep('config');
  };

  const handleCopyWebhook = (channelType: string) => {
    navigator.clipboard.writeText(`${apiBaseUrl}/webhooks/${channelType}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitChannel = async (type: ChannelType, name: string, config: Record<string, any>, webhookSecret?: string) => {
    setIsLoading(true);
    try {
      await channelsService.create({ type, name, config, webhookSecret, visibility });
      toast.success('Canal criado com sucesso!');
      handleClose();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar canal');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitZappfy = (data: ZappfyFormData) =>
    submitChannel('WHATSAPP_ZAPPFY', data.name, { token: data.token }, data.webhookSecret);

  const onSubmitWaOfficial = (data: WaOfficialFormData) =>
    submitChannel(
      'WHATSAPP_OFFICIAL',
      data.name,
      {
        phoneNumberId: data.phoneNumberId,
        accessToken: data.accessToken,
        appSecret: data.appSecret,
        businessAccountId: data.businessAccountId || undefined,
      },
      data.webhookSecret,
    );

  const onSubmitInstagram = (data: InstagramFormData) =>
    submitChannel(
      'INSTAGRAM',
      data.name,
      {
        accessToken: data.accessToken,
        appSecret: data.appSecret,
        igBusinessId: data.igBusinessId || undefined,
        igAppId: data.igAppId || undefined,
        apiVersion: 'v21.0',
      },
      data.webhookSecret,
    );

  const handleClose = () => {
    setStep('type');
    setSelectedType(null);
    zappfyForm.reset();
    waForm.reset();
    igForm.reset();
    setIsLoading(false);
    setShowManual(false);
    onClose();
  };

  const handleConnectWhatsApp = () => {
    if (!FB_APP_ID || !FB_CONFIG_ID) {
      toast.error('Embedded Signup nao configurado (NEXT_PUBLIC_WA_APP_ID / _CONFIG_ID).');
      return;
    }
    // NÃO pode haver `await` entre o clique e o FB.login: o navegador só
    // autoriza abrir popup de forma síncrona dentro do gesto do usuário.
    // Esperar o SDK aqui consome o gesto e o popup é bloqueado em silêncio —
    // sem callback, sem erro, botão girando pra sempre. O SDK é pré-carregado
    // no useEffect acima justamente pra este ponto ser síncrono.
    const FB = (window as any).FB;
    if (!FB) {
      toast.error('O SDK do Facebook ainda está carregando. Tente de novo em instantes.');
      void loadFacebookSdk(FB_APP_ID).catch(() => {});
      return;
    }
    setIsLoading(true);
    try {
      // O `code` (callback do FB.login) e o `session` (postMessage da Meta) chegam
      // em ordem INDETERMINADA. Quem chegar por último dispara a conexão — se a
      // gente só lesse o session dentro do callback, um cadastro completo viraria
      // "conexão cancelada" sempre que o callback ganhasse a corrida.
      let code: string | null = null;
      let session: { phoneNumberId?: string; wabaId?: string; businessId?: string } | null = null;
      let done = false;
      let popup: Window | null = null;
      let poll: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        if (poll !== null) { clearInterval(poll); poll = null; }
      };

      const tryFinish = async () => {
        if (done || !code || !session?.phoneNumberId || !session?.wabaId) return;
        done = true;
        cleanup();
        try {
          await channelsService.connectEmbeddedSignup({
            code,
            phoneNumberId: session.phoneNumberId,
            wabaId: session.wabaId,
            businessId: session.businessId,
            visibility,
          });
          toast.success('WhatsApp conectado!');
          handleClose();
          onCreated();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erro ao conectar');
        } finally {
          setIsLoading(false);
        }
      };

      const abort = (message?: string) => {
        if (done) return;
        done = true;
        cleanup();
        setIsLoading(false);
        if (message) toast.error(message);
      };

      function onMessage(event: MessageEvent) {
        if (event.origin !== 'https://www.facebook.com' && !event.origin.endsWith('.facebook.com')) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

          // O campo `event` diz como o fluxo terminou. Sem ele, um cadastro que
          // só compartilhou a WABA (sem número) deixaria o botão girando à toa.
          if (data.event === 'CANCEL') { abort(); return; }
          if (data.event === 'ERROR') {
            abort('A Meta reportou um erro no cadastro. Tente de novo.');
            return;
          }
          if (data.event === 'FINISH_ONLY_WABA') {
            abort('A conta (WABA) foi compartilhada, mas nenhum número de telefone foi selecionado.');
            return;
          }
          // Fallback pro payload antigo, que não traz `event`: `current_step`
          // presente significa que o usuário saiu no meio do fluxo.
          if (!data.event && data.data?.current_step) { abort(); return; }

          session = {
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
            businessId: data.data?.business_id,
          };
          if (!session.phoneNumberId || !session.wabaId) {
            abort('O cadastro terminou sem devolver o número ou a conta.');
            return;
          }
          void tryFinish();
        } catch { /* ignore non-JSON */ }
      }
      window.addEventListener('message', onMessage);

      // FB.login abre o popup de forma síncrona; capturamos a referência
      // interceptando window.open só durante essa chamada.
      const originalOpen = window.open;
      window.open = function (...args: Parameters<typeof window.open>) {
        const w = originalOpen.apply(window, args);
        if (w) popup = w;
        window.open = originalOpen;
        return w;
      };

      FB.login(
        (response: any) => {
          const received = response?.authResponse?.code;
          if (!received) {
            // Cancelou no próprio diálogo do Facebook.
            abort();
            return;
          }
          code = received;
          void tryFinish();
        },
        { config_id: FB_CONFIG_ID, response_type: 'code', override_default_response_type: true, extras: { sessionInfoVersion: '3' } },
      );
      window.open = originalOpen;

      // Fechar a janela no X não dispara o callback do FB.login — sem isso o
      // botão fica em loading pra sempre.
      let ticks = 0;
      poll = setInterval(() => {
        if (done) { cleanup(); return; }
        ticks += 1;
        // Nenhum popup depois de 2s = o navegador bloqueou. Sem esta checagem
        // o botão gira indefinidamente, porque não existe janela pra vigiar
        // nem callback pra receber.
        if (!popup && ticks >= 4) {
          abort('O navegador bloqueou a janela do Facebook. Libere popups para este site e tente de novo.');
          return;
        }
        if (popup && popup.closed) abort();
      }, 500);
    } catch (err) {
      setIsLoading(false);
      toast.error(err instanceof Error ? err.message : 'Falha ao abrir o Embedded Signup');
    }
  };

  if (!open) return null;

  const titleMap: Record<string, string> = {
    WHATSAPP_ZAPPFY: 'Configurar Zappfy',
    WHATSAPP_OFFICIAL: 'Configurar WhatsApp Official',
    INSTAGRAM: 'Configurar Instagram',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {step === 'type' ? 'Novo Canal' : titleMap[selectedType || '']}
          </h2>
          <button onClick={handleClose} className="rounded-md p-1 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'type' ? (
          <div className="mt-6 grid gap-3">
            {channelTypes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => handleTypeSelect(ct.value)}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-primary hover:shadow-sm dark:border-zinc-700 dark:hover:border-primary"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 ${ct.color}`}>
                  <ct.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ct.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{ct.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : selectedType === 'WHATSAPP_ZAPPFY' ? (
          <form onSubmit={zappfyForm.handleSubmit(onSubmitZappfy)} className="mt-6 space-y-4">
            <Field label="Nome do canal" placeholder="Ex: WhatsApp Principal" error={zappfyForm.formState.errors.name?.message} {...zappfyForm.register('name')} />
            <Field label="Token" placeholder="Token da instância Zappfy" error={zappfyForm.formState.errors.token?.message} {...zappfyForm.register('token')} />
            <Field label="Webhook Secret" placeholder="Opcional" optional {...zappfyForm.register('webhookSecret')} />
            <WebhookUrl url={`${apiBaseUrl}/webhooks/WHATSAPP_ZAPPFY`} copied={copied} onCopy={() => handleCopyWebhook('WHATSAPP_ZAPPFY')} />
            <FormFooter isLoading={isLoading} onBack={() => setStep('type')} />
          </form>
        ) : selectedType === 'WHATSAPP_OFFICIAL' ? (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              onClick={handleConnectWhatsApp}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conectar WhatsApp
            </button>
            <WebhookUrl url={`${apiBaseUrl}/webhooks/WHATSAPP_OFFICIAL`} copied={copied} onCopy={() => handleCopyWebhook('WHATSAPP_OFFICIAL')} />
            <button type="button" onClick={() => setShowManual((v) => !v)} className="text-xs text-zinc-500 underline">
              {showManual ? 'Ocultar configuracao manual' : 'Configurar manualmente (avancado)'}
            </button>
            {showManual && (
              <form onSubmit={waForm.handleSubmit(onSubmitWaOfficial)} className="space-y-4">
                <Field label="Nome do canal" placeholder="Ex: WhatsApp Business" error={waForm.formState.errors.name?.message} {...waForm.register('name')} />
                <Field label="Phone Number ID" placeholder="Meta Business Suite" error={waForm.formState.errors.phoneNumberId?.message} {...waForm.register('phoneNumberId')} />
                <Field label="Access Token" type="text" placeholder="System User Token" error={waForm.formState.errors.accessToken?.message} {...waForm.register('accessToken')} />
                <Field label="App Secret" type="text" placeholder="Settings -> Basic" error={waForm.formState.errors.appSecret?.message} {...waForm.register('appSecret')} />
                <Field label="Business Account ID (WABA)" placeholder="Opcional" optional {...waForm.register('businessAccountId')} />
                <Field label="Webhook Verify Token" placeholder="Opcional" optional {...waForm.register('webhookSecret')} />
                <FormFooter isLoading={isLoading} onBack={() => setStep('type')} />
              </form>
            )}
            {!showManual && (
              <div className="flex justify-start">
                <button type="button" onClick={() => setStep('type')} className="rounded-md px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100">Voltar</button>
              </div>
            )}
          </div>
        ) : selectedType === 'INSTAGRAM' ? (
          <form onSubmit={igForm.handleSubmit(onSubmitInstagram)} className="mt-6 space-y-4">
            <Field label="Nome do canal" placeholder="Ex: Instagram Loja" error={igForm.formState.errors.name?.message} {...igForm.register('name')} />
            <Field label="Access Token" type="text" placeholder="Instagram User Access Token (IGAAN...)" error={igForm.formState.errors.accessToken?.message} {...igForm.register('accessToken')} />
            <Field label="App Secret" type="text" placeholder="Chave secreta do app (para validar webhooks)" error={igForm.formState.errors.appSecret?.message} {...igForm.register('appSecret')} />
            <Field label="Instagram Business ID" placeholder="Opcional — detectado automaticamente" optional {...igForm.register('igBusinessId')} />
            <Field label="Instagram App ID" placeholder="Opcional — ID do app do Instagram" optional {...igForm.register('igAppId')} />
            <Field label="Webhook Verify Token" placeholder="Token que você definiu no Meta" optional {...igForm.register('webhookSecret')} />
            <WebhookUrl url={`${apiBaseUrl}/webhooks/INSTAGRAM`} copied={copied} onCopy={() => handleCopyWebhook('INSTAGRAM')} />
            <FormFooter isLoading={isLoading} onBack={() => setStep('type')} />
          </form>
        ) : null}
      </div>
    </div>
  );
}

import { forwardRef } from 'react';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, optional, ...props }, ref) => (
    <div className="space-y-1.5">
      <label className={labelCls}>
        {label} {optional && <span className="text-zinc-400">(opcional)</span>}
      </label>
      <input ref={ref} className={inputCls} {...props} />
      {error && <p className={errorCls}>{error}</p>}
    </div>
  ),
);
Field.displayName = 'Field';

function WebhookUrl({ url, copied, onCopy }: { url: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        URL do Webhook (cole no painel do provedor):
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {url}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function FormFooter({
  isLoading,
  onBack,
  submitLabel = 'Criar Canal',
}: {
  isLoading: boolean;
  onBack: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Voltar
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
