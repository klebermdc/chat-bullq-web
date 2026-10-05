'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiCatalogService,
  type AiSkill,
  type AiTool,
} from '../../services/ai-catalog.service';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { controlCls, controlSmCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  skill: AiSkill | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ParamRow { name: string; source: string; }

const DEFAULT_PARAMS = `{
  "type": "object",
  "required": ["email"],
  "properties": {
    "email": {
      "type": "string",
      "description": "E-mail do cliente"
    }
  }
}`;

export function SkillDialog({ open, skill, onClose, onSaved }: Props) {
  // common
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [promptInstructions, setPromptInstructions] = useState('');
  const [parameters, setParameters] = useState(DEFAULT_PARAMS);
  const [toolId, setToolId] = useState<string>('');
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [changeNote, setChangeNote] = useState('');
  const [saving, setSaving] = useState(false);

  // HTTP
  const [httpMethod, setHttpMethod] = useState('POST');
  const [httpPath, setHttpPath] = useState('');
  const [headersExtraJson, setHeadersExtraJson] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('{"email": "{{input.email}}"}');
  const [responseMap, setResponseMap] = useState('');

  // SQL
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users WHERE email = $1 LIMIT 1');
  const [sqlParams, setSqlParams] = useState<ParamRow[]>([
    { name: 'email', source: 'input.email' },
  ]);
  const [sqlReadOnly, setSqlReadOnly] = useState(true);
  const [sqlMaxRows, setSqlMaxRows] = useState(50);

  const { data: tools } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: () => aiCatalogService.listTools(),
    enabled: open,
  });

  const selectedTool = useMemo(
    () => (tools ?? []).find((t) => t.id === toolId),
    [tools, toolId],
  );
  // Source da skill é determinado pelo source da tool (HTTP ↔ CUSTOM_HTTP)
  const skillSource: 'HTTP' | 'SQL' | null = !selectedTool
    ? null
    : selectedTool.source === 'CUSTOM_HTTP'
      ? 'HTTP'
      : 'SQL';

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description);
      setCategory(skill.category ?? '');
      setPromptInstructions(skill.promptInstructions ?? '');
      setParameters(JSON.stringify(skill.parameters ?? {}, null, 2));
      setToolId(skill.toolId ?? '');
      setTimeoutMs(skill.timeoutMs);
      setChangeNote('');
      setHttpMethod(skill.httpMethod ?? 'POST');
      setHttpPath(skill.httpPath ?? '');
      setHeadersExtraJson(
        skill.httpHeadersExtra ? JSON.stringify(skill.httpHeadersExtra, null, 2) : '',
      );
      setBodyTemplate(skill.httpBodyTemplate ?? '');
      setResponseMap(
        skill.responseMap ? JSON.stringify(skill.responseMap, null, 2) : '',
      );
      setSqlQuery(skill.sqlQuery ?? '');
      setSqlParams(
        Array.isArray(skill.sqlParamMap) && skill.sqlParamMap.length > 0
          ? skill.sqlParamMap.map((p) => ({ name: p.name ?? '', source: p.source }))
          : [],
      );
      setSqlReadOnly(skill.sqlReadOnly);
      setSqlMaxRows(skill.sqlMaxRows);
    } else {
      setName('');
      setDescription('');
      setCategory('');
      setPromptInstructions('');
      setParameters(DEFAULT_PARAMS);
      setToolId('');
      setTimeoutMs(15000);
      setChangeNote('');
      setHttpMethod('POST');
      setHttpPath('');
      setHeadersExtraJson('');
      setBodyTemplate('{"email": "{{input.email}}"}');
      setResponseMap('');
      setSqlQuery('SELECT * FROM users WHERE email = $1 LIMIT 1');
      setSqlParams([{ name: 'email', source: 'input.email' }]);
      setSqlReadOnly(true);
      setSqlMaxRows(50);
    }
  }, [skill, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!skillSource) {
      toast.error('Selecione uma tool');
      return;
    }

    let parsedParams: Record<string, unknown>;
    try {
      parsedParams = JSON.parse(parameters);
    } catch {
      toast.error('Parameters: JSON inválido');
      return;
    }

    const payload: any = {
      name,
      description,
      category: category.trim() || undefined,
      promptInstructions: promptInstructions.trim() || undefined,
      source: skillSource,
      parameters: parsedParams,
      toolId,
      timeoutMs,
      isActive: true,
      changeNote: changeNote.trim() || undefined,
    };

    if (skillSource === 'HTTP') {
      let parsedHeadersExtra: Record<string, string> | undefined;
      let parsedResponseMap: Record<string, string> | undefined;
      if (headersExtraJson.trim()) {
        try { parsedHeadersExtra = JSON.parse(headersExtraJson); }
        catch { toast.error('Headers extra: JSON inválido'); return; }
      }
      if (responseMap.trim()) {
        try { parsedResponseMap = JSON.parse(responseMap); }
        catch { toast.error('Response map: JSON inválido'); return; }
      }
      Object.assign(payload, {
        httpMethod,
        httpPath,
        httpHeadersExtra: parsedHeadersExtra,
        httpBodyTemplate: bodyTemplate || undefined,
        responseMap: parsedResponseMap,
      });
    } else {
      Object.assign(payload, {
        sqlQuery,
        sqlParamMap: sqlParams.filter((p) => p.source.trim()),
        sqlReadOnly,
        sqlMaxRows,
      });
    }

    setSaving(true);
    try {
      if (skill) {
        await aiCatalogService.updateSkill(skill.id, payload);
        toast.success(`Skill atualizada (v${skill.currentVersion + 1})`);
      } else {
        await aiCatalogService.createSkill(payload);
        toast.success('Skill criada');
      }
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  // SQL params helpers
  const addParam = () => setSqlParams([...sqlParams, { name: '', source: '' }]);
  const updateParam = (i: number, patch: Partial<ParamRow>) =>
    setSqlParams(sqlParams.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removeParam = (i: number) =>
    setSqlParams(sqlParams.filter((_, idx) => idx !== i));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={skill ? `Editar skill (v${skill.currentVersion} → v${skill.currentVersion + 1})` : 'Nova skill'}
      description="Skill é a função que o modelo chama (resetPassword etc.), ligada a uma tool."
      size="2xl"
      dismissible={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!name || !description || !toolId}>
            {saving ? (
              'Salvando…'
            ) : (
              <>
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                {skill ? 'Salvar nova versão' : 'Criar'}
              </>
            )}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da função" hint="Só letras, dígitos e underscore">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="resetPassword"
                className={cn(controlCls, 'w-full font-mono')}
              />
            </Field>
            <Field label="Categoria">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="pos-venda"
                className={cn(controlCls, 'w-full')}
              />
            </Field>
          </div>

          <Field label="Descrição (para o modelo)" hint="O modelo lê isto para decidir quando chamar a skill">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gera nova senha aleatória e envia por e-mail. Use quando o cliente esqueceu/perdeu a senha."
              className={cn(controlCls, 'h-auto w-full py-2')}
            />
          </Field>

          <Field
            label="Tool (conexão)"
            hint="A conexão que esta skill usa. Cadastre em “Tools” antes."
          >
            <select
              value={toolId}
              onChange={(e) => setToolId(e.target.value)}
              className={cn(controlCls, 'w-full')}
            >
              <option value="">Selecione…</option>
              {(tools ?? []).map((t: AiTool) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.source === 'CUSTOM_HTTP' ? 'HTTP' : 'SQL'})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Parâmetros (JSON Schema)" mono>
            <textarea
              rows={6}
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
            />
          </Field>

          {skillSource === 'HTTP' && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Chamada HTTP
              </p>
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <Field label="Método">
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value)}
                    className={cn(controlCls, 'w-full')}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Caminho"
                  hint={selectedTool?.httpBaseUrl ? `Acrescentado a: ${selectedTool.httpBaseUrl}` : 'Caminho relativo à URL base da tool'}
                >
                  <input
                    value={httpPath}
                    onChange={(e) => setHttpPath(e.target.value)}
                    placeholder="/admin/actions/reset-password"
                    className={cn(controlCls, 'w-full font-mono text-xs')}
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field
                  label="Cabeçalhos extras (opcional, JSON)"
                  hint="Cabeçalhos ALÉM dos da tool. Geralmente vazio."
                  mono
                >
                  <textarea
                    rows={2}
                    value={headersExtraJson}
                    onChange={(e) => setHeadersExtraJson(e.target.value)}
                    className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
                  />
                </Field>
              </div>

              {httpMethod !== 'GET' && httpMethod !== 'DELETE' && (
                <div className="mt-3">
                  <Field label="Modelo do corpo" hint="Variáveis: {{input.x}}, {{ctx.x}}, {{env.X}}" mono>
                    <textarea
                      rows={4}
                      value={bodyTemplate}
                      onChange={(e) => setBodyTemplate(e.target.value)}
                      className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
                    />
                  </Field>
                </div>
              )}

              <div className="mt-3">
                <Field label="Mapeamento da resposta (opcional)" hint='JSONPath: {"ok": "$.success"}' mono>
                  <textarea
                    rows={2}
                    value={responseMap}
                    onChange={(e) => setResponseMap(e.target.value)}
                    className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
                  />
                </Field>
              </div>
            </div>
          )}

          {skillSource === 'SQL' && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Consulta SQL
              </p>
              <Field label="Consulta" hint="Use $1, $2… para os parâmetros" mono>
                <textarea
                  rows={5}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
                />
              </Field>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="block text-xs font-medium text-foreground">
                    Parâmetros (na ordem $1, $2…)
                  </p>
                  <Button variant="outline" size="sm" onClick={addParam}>
                    <Plus aria-hidden="true" className="h-3 w-3" /> Adicionar
                  </Button>
                </div>
                <div className="mt-1 space-y-1.5">
                  {sqlParams.map((p, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <span className="w-8 text-center font-mono text-xs text-muted-foreground">
                        ${i + 1}
                      </span>
                      <input
                        value={p.name}
                        onChange={(e) => updateParam(i, { name: e.target.value })}
                        placeholder="nome"
                        aria-label={`Nome do parâmetro $${i + 1}`}
                        className={cn(controlSmCls, 'w-32')}
                      />
                      <input
                        value={p.source}
                        onChange={(e) => updateParam(i, { source: e.target.value })}
                        placeholder="input.email | ctx.x | literal:foo"
                        aria-label={`Origem do parâmetro $${i + 1}`}
                        className={cn(controlSmCls, 'min-w-0 flex-1 basis-40 font-mono')}
                      />
                      <button
                        type="button"
                        onClick={() => removeParam(i)}
                        aria-label={`Remover parâmetro $${i + 1}`}
                        title="Remover parâmetro"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Máx. de linhas">
                  <input
                    type="number"
                    value={sqlMaxRows}
                    onChange={(e) => setSqlMaxRows(parseInt(e.target.value, 10) || 50)}
                    className={cn(controlCls, 'w-full')}
                  />
                </Field>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={sqlReadOnly}
                      onChange={(e) => setSqlReadOnly(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-foreground">
                      Somente leitura (recomendado)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <Field
            label="Instruções extras (opcional, entram no prompt do sistema)"
            hint="Regras que o agente deve seguir quando esta skill estiver ativa"
          >
            <textarea
              rows={3}
              value={promptInstructions}
              onChange={(e) => setPromptInstructions(e.target.value)}
              placeholder="Sempre rode checkPurchase antes de prometer ações…"
              className={cn(controlCls, 'h-auto w-full py-2 font-mono text-xs')}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Timeout (ms)">
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10) || 15000)}
                className={cn(controlCls, 'w-full')}
              />
            </Field>
            {skill && (
              <Field label="Nota da mudança" hint="Fica no histórico de versões">
                <input
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Ajustei o prompt…"
                  className={cn(controlCls, 'w-full')}
                />
              </Field>
            )}
          </div>
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
