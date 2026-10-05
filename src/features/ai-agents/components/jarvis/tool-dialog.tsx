'use client';

import { useEffect, useState } from 'react';
import { Globe, Database } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiTool,
  type ToolSource,
} from '../../services/ai-catalog.service';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  tool: AiTool | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ToolDialog({ open, tool, onClose, onSaved }: Props) {
  const [source, setSource] = useState<ToolSource>('CUSTOM_HTTP');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [httpBaseUrl, setHttpBaseUrl] = useState('');
  const [headersJson, setHeadersJson] = useState('{}');
  const [sqlConnectionRef, setSqlConnectionRef] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tool) {
      setSource(tool.source);
      setName(tool.name);
      setDescription(tool.description);
      setHttpBaseUrl(tool.httpBaseUrl ?? '');
      setHeadersJson(JSON.stringify(tool.httpHeaders ?? {}, null, 2));
      setSqlConnectionRef(tool.sqlConnectionRef ?? '');
    } else {
      setSource('CUSTOM_HTTP');
      setName('');
      setDescription('');
      setHttpBaseUrl('');
      setHeadersJson('{}');
      setSqlConnectionRef('');
    }
  }, [tool, open]);

  if (!open) return null;

  const handleSave = async () => {
    const payload: any = {
      name,
      description,
      source,
      isActive: true,
    };

    if (source === 'CUSTOM_HTTP') {
      let parsedHeaders: Record<string, string>;
      try {
        parsedHeaders = headersJson.trim() ? JSON.parse(headersJson) : {};
      } catch {
        toast.error('Cabeçalhos: JSON inválido');
        return;
      }
      payload.httpBaseUrl = httpBaseUrl;
      payload.httpHeaders = parsedHeaders;
    } else {
      payload.sqlConnectionRef = sqlConnectionRef;
    }

    setSaving(true);
    try {
      if (tool) {
        await aiCatalogService.updateTool(tool.id, payload);
        toast.success('Tool atualizada');
      } else {
        await aiCatalogService.createTool(payload);
        toast.success('Tool criada');
      }
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tool ? 'Editar tool' : 'Nova tool (conexão)'}
      description="Conexão reutilizável entre várias skills"
      size="lg"
      dismissible={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!name || !description}>
            {saving ? 'Salvando…' : tool ? 'Salvar' : 'Criar'}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          {!tool && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSource('CUSTOM_HTTP')}
                aria-pressed={source === 'CUSTOM_HTTP'}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  source === 'CUSTOM_HTTP'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <Globe aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">API HTTP</p>
                  <p className="text-[11px] text-muted-foreground">REST com autenticação</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSource('CUSTOM_SQL')}
                aria-pressed={source === 'CUSTOM_SQL'}
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  source === 'CUSTOM_SQL'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <Database aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">SQL (Postgres)</p>
                  <p className="text-[11px] text-muted-foreground">Consulta em um banco</p>
                </div>
              </button>
            </div>
          )}

          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={source === 'CUSTOM_SQL' ? 'Hotwebinar' : 'Trivapp'}
              className={cn(controlCls, 'w-full')}
            />
          </Field>

          <Field label="Descrição">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                source === 'CUSTOM_SQL'
                  ? 'Banco do funil de vendas. Read-only.'
                  : 'Plataforma da área de membros. Server-to-server admin endpoints.'
              }
              className={cn(controlCls, 'h-auto w-full py-2')}
            />
          </Field>

          {source === 'CUSTOM_HTTP' ? (
            <>
              <Field
                label="URL base"
                hint="URL base da API. As skills acrescentam o caminho."
              >
                <input
                  value={httpBaseUrl}
                  onChange={(e) => setHttpBaseUrl(e.target.value)}
                  placeholder="https://api.trivapp.com.br/api/v1"
                  className={cn(controlCls, 'w-full font-mono text-xs')}
                />
              </Field>

              <Field
                label="Cabeçalhos padrão (JSON)"
                hint="Autenticação e content-type enviados em TODAS as skills desta tool. Variáveis: {{env.X}}."
                mono
              >
                <textarea
                  rows={5}
                  value={headersJson}
                  onChange={(e) => setHeadersJson(e.target.value)}
                  placeholder='{"x-admin-api-key":"{{env.MEMBERS_ADMIN_KEY}}","x-tenant-id":"{{env.MEMBERS_TENANT_BRAVY}}","Content-Type":"application/json"}'
                  className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
                />
              </Field>
            </>
          ) : (
            <Field
              label="Referência da conexão (variável de ambiente)"
              hint="Nome da variável de ambiente no servidor com a string de conexão. Ex.: HOTWEBINAR_DB_URL"
            >
              <input
                value={sqlConnectionRef}
                onChange={(e) => setSqlConnectionRef(e.target.value)}
                placeholder="HOTWEBINAR_DB_URL"
                className={cn(controlCls, 'w-full font-mono')}
              />
            </Field>
          )}
        </div>

    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-foreground">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
