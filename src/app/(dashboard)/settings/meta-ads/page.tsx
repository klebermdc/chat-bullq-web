'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, RefreshCw, Unplug, AlertTriangle, Plug } from 'lucide-react';
import { toast } from 'sonner';
import {
  metaAdsService,
  type AdConnection,
  type AdConnectionStatus,
  type MetaAdAccount,
  type ExchangeResult,
} from '@/features/settings/services/meta-ads.service';
import { loadFacebookSdk, isFacebookSdkReady } from '@/lib/facebook-sdk';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SettingsPageHeader } from '@/features/settings/components/settings-page-header';

const APP_ID = process.env.NEXT_PUBLIC_META_ADS_APP_ID || '';
const CONFIG_ID = process.env.NEXT_PUBLIC_META_ADS_CONFIG_ID || '';
const IS_CONFIGURED = Boolean(APP_ID && CONFIG_ID);

const statusMeta: Record<AdConnectionStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Ativa', cls: 'bg-success-wash text-success-ink' },
  DISABLED: { label: 'Desativada', cls: 'bg-muted text-muted-foreground' },
  INVALID_TOKEN: { label: 'Token expirado — reconecte', cls: 'bg-urgent-wash text-urgent-ink' },
  REVOKED: { label: 'Acesso revogado — reconecte', cls: 'bg-urgent-wash text-urgent-ink' },
};

export default function MetaAdsPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const orgId = useOrgId();
  const { data: connections, isLoading } = useQuery({
    queryKey: ['meta-ads', orgId],
    queryFn: () => metaAdsService.list(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['meta-ads'] });

  const [connecting, setConnecting] = useState(false);
  const [picker, setPicker] = useState<ExchangeResult | null>(null);
  const [creatingAccountId, setCreatingAccountId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Pré-carrega o SDK assim que a tela abre, pra que o clique em "Conectar"
  // possa chamar FB.login SEM await no meio — é o que preserva o gesto do
  // usuário e evita o bloqueio de popup (mesmo padrão do Embedded Signup).
  useEffect(() => {
    if (!IS_CONFIGURED) return;
    if (isFacebookSdkReady()) return;
    let cancelled = false;
    loadFacebookSdk(APP_ID).catch(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, []);

  const exchangeToken = async (accessToken: string) => {
    try {
      const result = await metaAdsService.exchange(accessToken);
      if (result.accounts.length === 0) {
        toast.error(
          'A conta Meta conectada não enxerga nenhuma conta de anúncios. Isso é uma permissão faltando no Business Manager, não um erro do sistema.',
        );
        setPicker(null);
        return;
      }
      setPicker(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao validar o acesso com a Meta');
      setPicker(null);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = () => {
    if (!IS_CONFIGURED) {
      toast.error('Integração não configurada: faltam NEXT_PUBLIC_META_ADS_APP_ID / NEXT_PUBLIC_META_ADS_CONFIG_ID no build do site.');
      return;
    }
    // NÃO pode haver `await` entre o clique e o FB.login: o navegador só
    // autoriza abrir popup de forma síncrona dentro do gesto do usuário.
    const FB = (window as any).FB;
    if (!FB) {
      toast.error('O SDK do Facebook ainda está carregando. Tente de novo em instantes.');
      void loadFacebookSdk(APP_ID).catch(() => {});
      return;
    }
    setConnecting(true);
    // Pedimos o TOKEN, não o `code`. O fluxo de code exige que o servidor
    // repita o mesmo `redirect_uri` que a Meta registrou no diálogo — mas o
    // FB.login não redireciona de verdade, e esse valor é uma URL interna do
    // Facebook que o backend não consegue reproduzir. Tentar isso devolve
    // OAuthException code 100 / subcode 36008.
    //
    // Este token dura 1-2h e o SDK já o mantém aqui de qualquer forma. O
    // backend o troca pelo de ~60 dias, que nunca chega ao navegador.
    FB.login(
      (response: any) => {
        const accessToken = response?.authResponse?.accessToken;
        if (!accessToken) {
          // Usuário fechou o diálogo ou negou a permissão — não é um erro.
          setConnecting(false);
          toast.message('Conexão cancelada.');
          return;
        }
        void exchangeToken(accessToken);
      },
      { config_id: CONFIG_ID },
    );
  };

  const selectAccount = async (account: MetaAdAccount) => {
    if (!picker) return;
    setCreatingAccountId(account.id);
    try {
      await metaAdsService.create(picker.handshakeId, account.id);
      setPicker(null);
      toast.success('Conta conectada — importando os últimos 90 dias de histórico.');
      refresh();
    } catch (err) {
      // O handshake tem TTL de 10min e é consumido no uso: se falhar aqui, o
      // handshakeId morreu. Limpamos o picker pra obrigar o usuário a
      // refazer o login em vez de clicar num botão morto repetidamente.
      toast.error(err instanceof Error ? err.message : 'Falha ao concluir a conexão — refaça o login com a Meta');
      setPicker(null);
    } finally {
      setCreatingAccountId(null);
    }
  };

  const handleSync = async (connection: AdConnection) => {
    setSyncingId(connection.id);
    try {
      const res = await metaAdsService.sync(connection.id);
      toast.success(res.message || 'Sincronização iniciada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao sincronizar');
    } finally {
      setSyncingId(null);
    }
  };

  const handleRemove = async (connection: AdConnection) => {
    const label = connection.accountName || connection.externalAccountId;
    const confirmed = await confirm({
      title: `Desconectar "${label}"?`,
      description:
        'A importação diária dessa conta para. O histórico já importado é mantido — nada é apagado.',
      confirmLabel: 'Desconectar',
      destructive: true,
    });
    if (!confirmed) return;
    setRemovingId(connection.id);
    try {
      const res = await metaAdsService.remove(connection.id);
      toast.success(res.message || 'Conexão removida');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao desconectar');
    } finally {
      setRemovingId(null);
    }
  };

  const busy = connecting || creatingAccountId !== null;

  return (
    <div>
      <SettingsPageHeader
        title="Meta Ads"
        description="Conecte uma conta de anúncios da Meta para importar o desempenho por anúncio automaticamente, todos os dias."
      />

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="mt-6 space-y-4">
          {!IS_CONFIGURED && (
            <section className="flex items-start gap-2 rounded-xl bg-warning-wash p-4 text-sm text-warning-ink">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Esta tela precisa de <code className="break-all font-mono text-xs font-semibold">NEXT_PUBLIC_META_ADS_APP_ID</code>
                {' '}e <code className="break-all font-mono text-xs font-semibold">NEXT_PUBLIC_META_ADS_CONFIG_ID</code>,
                configurados no momento da publicação do site. Sem eles, não é possível conectar uma conta — fale com o time técnico para corrigir a publicação.
              </p>
            </section>
          )}

          {picker ? (
            <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
              <div>
                <p className="text-sm font-medium text-foreground">Escolha a conta de anúncios</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Encontramos {picker.accounts.length} conta{picker.accounts.length === 1 ? '' : 's'} que essa conta Meta pode gerenciar.
                </p>
              </div>
              <div className="space-y-2">
                {picker.accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => selectAccount(account)}
                    disabled={busy}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{account.name || account.id}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {account.id}
                        {account.currency ? ` · ${account.currency}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {creatingAccountId === account.id ? 'Conectando…' : 'Selecionar'}
                    </span>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setPicker(null)} disabled={busy}>
                Cancelar
              </Button>
            </section>
          ) : (
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-soft">
              <div>
                <p className="text-sm font-medium text-foreground">Conectar conta de anúncios</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Você fará login com a Meta e escolherá qual conta de anúncios conectar.
                </p>
              </div>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                title={!IS_CONFIGURED ? 'Integração não configurada' : undefined}
                className="shrink-0"
              >
                <Plug aria-hidden="true" className="h-4 w-4" /> {connecting ? 'Conectando…' : 'Conectar'}
              </Button>
            </section>
          )}

          {connections && connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map((connection) => (
                <ConnectionRow
                  key={connection.id}
                  connection={connection}
                  syncing={syncingId === connection.id}
                  removing={removingId === connection.id}
                  onSync={() => handleSync(connection)}
                  onRemove={() => handleRemove(connection)}
                />
              ))}
            </div>
          ) : (
            !picker && (
              <section className="rounded-xl border border-border bg-card shadow-soft">
                <EmptyState
                  size="sm"
                  icon={Megaphone}
                  title="Nenhuma conta de anúncios conectada"
                  description="Use o botão Conectar acima para entrar com a Meta e escolher a conta."
                />
              </section>
            )
          )}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

function ConnectionRow({
  connection,
  syncing,
  removing,
  onSync,
  onRemove,
}: {
  connection: AdConnection;
  syncing: boolean;
  removing: boolean;
  onSync: () => void;
  onRemove: () => void;
}) {
  const status = statusMeta[connection.status];
  const busy = syncing || removing;
  const isBroken = connection.status === 'INVALID_TOKEN' || connection.status === 'REVOKED';

  return (
    <section
      className={`rounded-xl border bg-card p-5 shadow-soft ${isBroken ? 'border-urgent/40' : 'border-border'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {connection.accountName || connection.externalAccountId}
            </p>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {connection.externalAccountId}
            {connection.currency ? ` · ${connection.currency}` : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {connection.lastSyncAt
              ? `Última sincronização em ${new Date(connection.lastSyncAt).toLocaleString('pt-BR')}`
              : 'Ainda não sincronizou'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSync} disabled={busy}>
            <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />{' '}
            {syncing ? 'Atualizando…' : 'Atualizar'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={busy}
            className="text-urgent-ink hover:bg-urgent-wash"
          >
            <Unplug aria-hidden="true" className="h-3.5 w-3.5" /> {removing ? 'Desconectando…' : 'Desconectar'}
          </Button>
        </div>
      </div>

      {connection.lastSyncError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-urgent-wash p-3 text-xs text-urgent-ink">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="break-all font-mono">{connection.lastSyncError}</span>
        </div>
      )}
    </section>
  );
}
