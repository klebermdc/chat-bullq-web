'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, KeyRound, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiKeysService, type ApiKey, type CreatedApiKey } from '@/features/settings/services/api-keys.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  SettingsPageHeader,
  settingsCardCls,
  settingsCardTitleCls,
} from '@/features/settings/components/settings-page-header';

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function SettingsApiKeysPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const orgId = useOrgId();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys', orgId],
    queryFn: () => apiKeysService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await apiKeysService.create({ name: newName.trim() });
      setCreatedKey(created);
      setNewName('');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar chave');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (key: ApiKey) => {
    const confirmed = await confirm({
      title: `Revogar a chave "${key.name}"?`,
      description:
        'Integrações e scripts que usam essa chave perdem o acesso na hora. Não dá para desfazer: será preciso gerar uma chave nova e trocar em cada lugar.',
      confirmLabel: 'Revogar',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await apiKeysService.revoke(key.id);
      toast.success('Chave revogada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao revogar');
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setCreatedKey(null);
    setCopied(false);
  };

  return (
    <div>
      <SettingsPageHeader
        title="Chaves de API"
        description="Chaves de acesso para integrações, scripts e MCP. A chave só é mostrada uma única vez, na criação."
      />

      <section className={`mt-6 ${settingsCardCls}`}>
        <h3 className={settingsCardTitleCls}>Nova chave</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="api-key-name" className="mb-1 block text-sm font-medium text-foreground">
              Nome da chave
            </label>
            <input
              id="api-key-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Ex.: Claude Code MCP, script de backup, Zapier…"
              className={`${controlCls} w-full`}
            />
          </div>
          <Button onClick={handleCreate} disabled={!newName.trim() || creating} className="w-full sm:w-auto">
            <Plus aria-hidden="true" className="h-4 w-4" /> {creating ? 'Criando…' : 'Gerar chave'}
          </Button>
        </div>
      </section>

      <div className="mt-4 rounded-xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !keys?.length ? (
          <EmptyState
            size="sm"
            icon={KeyRound}
            title="Nenhuma chave criada"
            description="Gere uma chave acima para conectar o MCP no Claude Code ou outra integração."
          />
        ) : (
          <ul className="divide-y divide-border">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{key.name}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {key.prefix}…
                    </code>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Criada por {key.user.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      em <span className="font-mono tabular-nums">{new Date(key.createdAt).toLocaleDateString('pt-BR')}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    {key.lastUsedAt ? (
                      <span>
                        Último uso{' '}
                        <span className="font-mono tabular-nums">{new Date(key.lastUsedAt).toLocaleString('pt-BR')}</span>
                      </span>
                    ) : (
                      <span>Nunca usada</span>
                    )}
                    {key.expiresAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          Expira em{' '}
                          <span className="font-mono tabular-nums">{new Date(key.expiresAt).toLocaleDateString('pt-BR')}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(key)}
                  className={`${iconBtnCls} hover:bg-urgent-wash hover:text-urgent-ink`}
                  title="Revogar chave"
                  aria-label={`Revogar a chave ${key.name}`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fechar perde a chave para sempre: só fecha pelo X ou pelo "Pronto". */}
      <Dialog
        open={!!createdKey}
        onClose={closeModal}
        title="Chave criada"
        size="lg"
        dismissible={false}
        footer={<Button onClick={closeModal}>Pronto</Button>}
      >
        {createdKey && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-warning-wash p-3 text-warning-ink">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs">
                Copie a chave agora. Por segurança, ela <b>não será exibida novamente</b>. Se perder, será necessário
                gerar uma nova.
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">{createdKey.name}</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {createdKey.rawKey}
                </code>
                <Button variant="outline" onClick={handleCopy} className="shrink-0">
                  {copied ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs font-medium text-foreground">Conectar ao Claude Code (MCP)</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed text-zinc-100">
{`claude mcp add chat-bullq \\
  -e CHAT_BULLQ_API_KEY=${createdKey.rawKey} \\
  -- node /path/to/chat-bullq-mcp/dist/index.js`}
              </pre>
            </div>
          </div>
        )}
      </Dialog>

      {confirmDialog}
    </div>
  );
}
