'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, RefreshCw, Trash2, AlertTriangle, Plug } from 'lucide-react';
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

const APP_ID = process.env.NEXT_PUBLIC_META_ADS_APP_ID || '';
const CONFIG_ID = process.env.NEXT_PUBLIC_META_ADS_CONFIG_ID || '';
const IS_CONFIGURED = Boolean(APP_ID && CONFIG_ID);

const statusMeta: Record<AdConnectionStatus, { label: string; cls: string }> = {
  ACTIVE: { label: 'Ativa', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DISABLED: { label: 'Desativada', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  INVALID_TOKEN: { label: 'Token expirado — reconecte', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  REVOKED: { label: 'Acesso revogado — reconecte', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function MetaAdsPage() {
  const queryClient = useQueryClient();
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
    if (!confirm(`Desconectar "${label}"? O histórico já importado é mantido — só a sincronização futura para.`)) return;
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
      <div className="flex items-start gap-2">
        <Megaphone className="mt-1 h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Meta Ads</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Conecte uma conta de anúncios da Meta para importar o desempenho por anúncio automaticamente, todos os dias.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 h-64 animate-pulse rounded-xl border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
      ) : (
        <div className="mt-6 space-y-5">
          {!IS_CONFIGURED && (
            <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Esta tela precisa de <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/40">NEXT_PUBLIC_META_ADS_APP_ID</code>
                {' '}e <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/40">NEXT_PUBLIC_META_ADS_CONFIG_ID</code>,
                configurados no momento do build do site. Sem eles, não é possível conectar uma conta — fale com o time técnico para corrigir o deploy.
              </p>
            </section>
          )}

          {picker ? (
            <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Escolha a conta de anúncios</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Encontramos {picker.accounts.length} conta{picker.accounts.length === 1 ? '' : 's'} que essa conta Meta pode gerenciar.
                </p>
              </div>
              <div className="space-y-2">
                {picker.accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => selectAccount(account)}
                    disabled={busy}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm hover:border-primary hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{account.name || account.id}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {account.id}
                        {account.currency ? ` · ${account.currency}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-primary">
                      {creatingAccountId === account.id ? 'Conectando…' : 'Selecionar'}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPicker(null)}
                disabled={busy}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-60 dark:hover:text-zinc-300"
              >
                Cancelar
              </button>
            </section>
          ) : (
            <section className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Conectar conta de anúncios</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Você fará login com a Meta e escolherá qual conta de anúncios conectar.
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                title={!IS_CONFIGURED ? 'Integração não configurada' : undefined}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Plug className="h-4 w-4" /> {connecting ? 'Conectando…' : 'Conectar'}
              </button>
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
              <section className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <Megaphone className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-2 text-sm text-zinc-500">Nenhuma conta de anúncios conectada ainda.</p>
              </section>
            )
          )}
        </div>
      )}
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
      className={`rounded-xl border p-5 dark:bg-zinc-900 ${
        isBroken ? 'border-red-300 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10' : 'border-zinc-200 bg-white dark:border-zinc-800'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {connection.accountName || connection.externalAccountId}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {connection.externalAccountId}
            {connection.currency ? ` · ${connection.currency}` : ''}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {connection.lastSyncAt
              ? `Última sincronização em ${new Date(connection.lastSyncAt).toLocaleString('pt-BR')}`
              : 'Ainda não sincronizou'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onSync}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {syncing ? 'Atualizando…' : 'Atualizar'}
          </button>
          <button
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> {removing ? 'Desconectando…' : 'Desconectar'}
          </button>
        </div>
      </div>

      {connection.lastSyncError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="font-mono">{connection.lastSyncError}</span>
        </div>
      )}
    </section>
  );
}
