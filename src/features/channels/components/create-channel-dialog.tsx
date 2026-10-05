'use client';

import { forwardRef, useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { channelsService, type ChannelType } from '../services/channels.service';
import { ZappfyIcon, MetaIcon, InstagramIcon } from '@/components/ui/icons';
import { loadFacebookSdk, isFacebookSdkReady } from '@/lib/facebook-sdk';
import { channelTypeLabel } from '@/lib/channel-labels';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

const FB_APP_ID = process.env.NEXT_PUBLIC_WA_APP_ID || '';
const FB_CONFIG_ID = process.env.NEXT_PUBLIC_WA_ES_CONFIG_ID || '';

const channelTypes: { value: ChannelType; icon: React.ElementType; description: string }[] = [
  {
    value: 'WHATSAPP_ZAPPFY',
    icon: ZappfyIcon,
    description: 'Conecte via Zappfy/Uazapi, sem a restrição de 24h',
  },
  {
    value: 'WHATSAPP_OFFICIAL',
    icon: MetaIcon,
    description: 'Cloud API da Meta: templates aprovados e alta escala',
  },
  {
    value: 'INSTAGRAM',
    icon: InstagramIcon,
    description: 'API do Instagram com login empresarial: mensagens diretas e stories',
  },
];

const FORM_IDS = {
  WHATSAPP_ZAPPFY: 'create-channel-zappfy',
  WHATSAPP_OFFICIAL: 'create-channel-wa-official',
  INSTAGRAM: 'create-channel-instagram',
} as const;

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

const labelCls = 'block text-sm font-medium text-foreground';
const errorCls = 'text-xs text-urgent-ink';

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

  const handleConnectWhatsApp = (coexistence = false) => {
    if (!FB_APP_ID || !FB_CONFIG_ID) {
      toast.error('O cadastro incorporado da Meta não está configurado (NEXT_PUBLIC_WA_APP_ID / _CONFIG_ID).');
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
      let session: { phoneNumberId?: string; wabaId?: string; businessId?: string; signupEvent?: string } | null = null;
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
            signupEvent: session.signupEvent,
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
            // Desfecho do fluxo. FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING =
            // coexistência: o backend usa isso pra NÃO chamar o /register.
            signupEvent: data.event,
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
        {
          config_id: FB_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          // Espelha o que o próprio simulador da Meta gera (App Dashboard →
          // Configurador de cadastro incorporado → Diálogo do cadastro
          // incorporado). Faltava o `version`.
          //
          // `featureType` torna o fluxo EXCLUSIVAMENTE de coexistência — a
          // Meta troca a tela de escolher/criar WABA pela de conectar um
          // número que já roda no app. Por isso é escolha do operador, e não
          // um parâmetro fixo: sem ele o caminho normal (número novo de Cloud
          // API) deixa de existir.
          extras: {
            sessionInfoVersion: '3',
            version: 'v4',
            ...(coexistence
              ? { featureType: 'whatsapp_business_app_onboarding' }
              : {}),
          },
        },
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
      toast.error(err instanceof Error ? err.message : 'Falha ao abrir o cadastro da Meta');
    }
  };

  if (!open) return null;

  const titleMap: Record<string, string> = {
    WHATSAPP_ZAPPFY: 'Configurar Zappfy',
    WHATSAPP_OFFICIAL: 'Configurar WhatsApp (API oficial)',
    INSTAGRAM: 'Configurar Instagram',
  };

  const backButton = (
    <Button type="button" variant="outline" onClick={() => setStep('type')}>
      Voltar
    </Button>
  );
  const formId =
    selectedType && selectedType in FORM_IDS
      ? FORM_IDS[selectedType as keyof typeof FORM_IDS]
      : undefined;
  // No WhatsApp oficial o formulário só existe na configuração manual.
  const hasForm =
    step === 'config' && !!formId && (selectedType !== 'WHATSAPP_OFFICIAL' || showManual);

  return (
    <Dialog
      open
      onClose={handleClose}
      // Na etapa de configuração há dado digitado: só fecha pelo X ou por "Voltar".
      dismissible={step === 'type'}
      size="lg"
      title={step === 'type' ? 'Novo canal' : titleMap[selectedType || '']}
      description={step === 'type' ? 'Escolha por onde as mensagens vão chegar.' : undefined}
      footer={
        step === 'type' ? undefined : (
          <>
            {backButton}
            {hasForm && (
              <Button type="submit" form={formId} loading={isLoading}>
                Criar canal
              </Button>
            )}
          </>
        )
      }
    >
      {step === 'type' ? (
        <div className="grid gap-3">
          {channelTypes.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => handleTypeSelect(ct.value)}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                <ct.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{channelTypeLabel(ct.value)}</p>
                <p className="text-xs text-muted-foreground">{ct.description}</p>
              </div>
            </button>
          ))}
        </div>
      ) : selectedType === 'WHATSAPP_ZAPPFY' ? (
        <form id={FORM_IDS.WHATSAPP_ZAPPFY} onSubmit={zappfyForm.handleSubmit(onSubmitZappfy)} className="space-y-4">
          <Field label="Nome do canal" placeholder="Ex.: WhatsApp Principal" error={zappfyForm.formState.errors.name?.message} {...zappfyForm.register('name')} />
          <Field label="Token" placeholder="Token da instância Zappfy" error={zappfyForm.formState.errors.token?.message} {...zappfyForm.register('token')} />
          <Field label="Segredo do webhook" optional {...zappfyForm.register('webhookSecret')} />
          <WebhookUrl url={`${apiBaseUrl}/webhooks/WHATSAPP_ZAPPFY`} copied={copied} onCopy={() => handleCopyWebhook('WHATSAPP_ZAPPFY')} />
        </form>
      ) : selectedType === 'WHATSAPP_OFFICIAL' ? (
        <div className="space-y-4">
          <Button
            type="button"
            size="lg"
            onClick={() => handleConnectWhatsApp(false)}
            loading={isLoading}
            className="w-full"
          >
            Conectar WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => handleConnectWhatsApp(true)}
            disabled={isLoading}
            className="h-auto min-h-10 w-full whitespace-normal py-2"
          >
            O número já está no app do WhatsApp Business
          </Button>
          <p className="text-xs text-muted-foreground">
            Use a segunda opção quando o número continuar sendo usado no celular.
            As conversas dos últimos 180 dias são importadas, e o que a equipe
            responder pelo app aparece aqui.
          </p>
          <WebhookUrl url={`${apiBaseUrl}/webhooks/WHATSAPP_OFFICIAL`} copied={copied} onCopy={() => handleCopyWebhook('WHATSAPP_OFFICIAL')} />
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            aria-expanded={showManual}
            className="rounded text-xs text-muted-foreground underline hover:text-foreground"
          >
            {showManual ? 'Ocultar configuração manual' : 'Configurar manualmente (avançado)'}
          </button>
          {showManual && (
            <form id={FORM_IDS.WHATSAPP_OFFICIAL} onSubmit={waForm.handleSubmit(onSubmitWaOfficial)} className="space-y-4">
              <Field label="Nome do canal" placeholder="Ex.: WhatsApp Business" error={waForm.formState.errors.name?.message} {...waForm.register('name')} />
              <Field label="Phone Number ID" placeholder="Encontrado no Meta Business Suite" error={waForm.formState.errors.phoneNumberId?.message} {...waForm.register('phoneNumberId')} />
              <Field label="Access Token" type="text" placeholder="Token de usuário do sistema" error={waForm.formState.errors.accessToken?.message} {...waForm.register('accessToken')} />
              <Field label="App Secret" type="text" placeholder="Configurações → Básico, no painel da Meta" error={waForm.formState.errors.appSecret?.message} {...waForm.register('appSecret')} />
              <Field label="Business Account ID (WABA)" optional {...waForm.register('businessAccountId')} />
              <Field label="Token de verificação do webhook" optional {...waForm.register('webhookSecret')} />
            </form>
          )}
        </div>
      ) : selectedType === 'INSTAGRAM' ? (
        <form id={FORM_IDS.INSTAGRAM} onSubmit={igForm.handleSubmit(onSubmitInstagram)} className="space-y-4">
          <Field label="Nome do canal" placeholder="Ex.: Instagram Loja" error={igForm.formState.errors.name?.message} {...igForm.register('name')} />
          <Field label="Access Token" type="text" placeholder="Token de acesso do usuário do Instagram (IGAAN...)" error={igForm.formState.errors.accessToken?.message} {...igForm.register('accessToken')} />
          <Field label="App Secret" type="text" placeholder="Chave secreta do app (para validar webhooks)" error={igForm.formState.errors.appSecret?.message} {...igForm.register('appSecret')} />
          <Field label="Instagram Business ID" placeholder="Detectado automaticamente" optional {...igForm.register('igBusinessId')} />
          <Field label="Instagram App ID" placeholder="ID do app do Instagram" optional {...igForm.register('igAppId')} />
          <Field label="Token de verificação do webhook" placeholder="Token que você definiu na Meta" optional {...igForm.register('webhookSecret')} />
          <WebhookUrl url={`${apiBaseUrl}/webhooks/INSTAGRAM`} copied={copied} onCopy={() => handleCopyWebhook('INSTAGRAM')} />
        </form>
      ) : null}
    </Dialog>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, optional, ...props }, ref) => {
    const id = useId();
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className={labelCls}>
          {label} {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
        </label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={`${controlCls} w-full`}
          {...props}
        />
        {error && <p className={errorCls}>{error}</p>}
      </div>
    );
  },
);
Field.displayName = 'Field';

function WebhookUrl({ url, copied, onCopy }: { url: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">
        URL do webhook (cole no painel do provedor):
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground" title={url}>
          {url}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? 'URL copiada' : 'Copiar URL do webhook'}
          title={copied ? 'URL copiada' : 'Copiar URL do webhook'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4 text-success-ink" />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
