'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ActionDefinition,
  ActionType,
  Automation,
  AutomationMeta,
  AutomationTrigger,
  ConditionOperator,
  ConditionRoot,
  ConditionRule,
  CreateAutomationPayload,
  automationsService,
} from '../services/automations.service';
import {
  ACTION_LABELS,
  FIELD_LABELS,
  OPERATOR_LABELS,
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
  operatorsForField,
} from '../utils/labels';
import {
  AutomationLookups,
  useAutomationLookups,
} from '../hooks/use-lookups';
import { BROADCAST_RISK_MESSAGE, isBroadcastRisk } from '../utils/broadcast-risk';
import { Button } from '@/components/ui/button';
import { controlCls, controlSmCls } from '@/components/ui/control';
import { useDrawerDialog } from '@/components/layout/use-drawer-dialog';
import { roleLabel } from '@/lib/role-labels';
import { cn } from '@/lib/utils';

interface BuilderProps {
  meta: AutomationMeta;
  initial?: Automation;
  onClose: () => void;
  onSaved: () => void;
}

// Conversation status enum mirrors the backend ConversationStatus.
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'BOT', label: 'No bot' },
  { value: 'OPEN', label: 'Aberta' },
  { value: 'WAITING', label: 'Aguardando' },
  { value: 'CLOSED', label: 'Fechada' },
];

const MESSAGE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'TEXT', label: 'Texto' },
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'AUDIO', label: 'Áudio' },
  { value: 'VIDEO', label: 'Vídeo' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'STICKER', label: 'Figurinha' },
  { value: 'LOCATION', label: 'Localização' },
];

export function AutomationBuilder({
  meta,
  initial,
  onClose,
  onSaved,
}: BuilderProps) {
  const lookups = useAutomationLookups();
  const { panelProps, titleId } = useDrawerDialog(onClose);

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    initial?.trigger ?? 'MESSAGE_RECEIVED',
  );
  const [conditions, setConditions] = useState<ConditionRoot>(() => {
    const c = initial?.conditions as ConditionRoot | undefined;
    if (!c || !('groups' in c)) {
      return { match: 'OR', groups: [] };
    }
    return c;
  });
  const [actions, setActions] = useState<ActionDefinition[]>(
    initial?.actions ?? [],
  );
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(
    initial?.rateLimitPerMinute ?? 10,
  );
  const [saving, setSaving] = useState(false);

  const triggerFields = useMemo(
    () => meta.triggers.find((t) => t.value === trigger)?.fields ?? [],
    [meta, trigger],
  );

  useEffect(() => {
    if (!initial) return;
    if (trigger !== initial.trigger) {
      setConditions({ match: 'OR', groups: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  // All conditions mutators use callback form so React 19's automatic
  // batching can compose multiple updates correctly. Without this, two
  // updates fired in the same tick (e.g. field+value change) would race.
  const addGroup = () => {
    setConditions((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        {
          match: 'AND',
          rules: [{ field: triggerFields[0] ?? '', op: 'equals', value: '' }],
        },
      ],
    }));
  };

  const removeGroup = (gi: number) => {
    setConditions((prev) => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== gi),
    }));
  };

  const updateRule = (gi: number, ri: number, patch: Partial<ConditionRule>) => {
    setConditions((prev) => ({
      ...prev,
      groups: prev.groups.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              rules: g.rules.map((r, j) =>
                j === ri ? ({ ...r, ...patch } as ConditionRule) : r,
              ),
            },
      ),
    }));
  };

  const addRule = (gi: number) => {
    setConditions((prev) => ({
      ...prev,
      groups: prev.groups.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              rules: [
                ...g.rules,
                {
                  field: triggerFields[0] ?? '',
                  op: 'equals' as ConditionOperator,
                  value: '',
                },
              ],
            },
      ),
    }));
  };

  const removeRule = (gi: number, ri: number) => {
    setConditions((prev) => ({
      ...prev,
      groups: prev.groups.map((g, i) =>
        i !== gi ? g : { ...g, rules: g.rules.filter((_, j) => j !== ri) },
      ),
    }));
  };

  const addAction = (type: ActionType) => {
    setActions([...actions, { type, params: defaultActionParams(type) }]);
  };

  const updateAction = (i: number, patch: Partial<ActionDefinition>) => {
    // Callback form so two updates fired in the same tick (e.g. clearing
    // stageId right after picking a pipeline) compose correctly. The
    // closure-captured `actions` would otherwise be stale and the second
    // setState would overwrite the first.
    setActions((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    );
  };

  const updateActionParam = (i: number, key: string, value: unknown) => {
    setActions((prev) =>
      prev.map((a, idx) =>
        idx === i ? { ...a, params: { ...a.params, [key]: value } } : a,
      ),
    );
  };

  // Patch multiple params atomically — used for things like "pick pipeline,
  // also clear stage" where doing two separate updateActionParam calls
  // races the closure.
  const updateActionParams = (i: number, patch: Record<string, unknown>) => {
    setActions((prev) =>
      prev.map((a, idx) =>
        idx === i ? { ...a, params: { ...a.params, ...patch } } : a,
      ),
    );
  };

  const removeAction = (i: number) => {
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Dê um nome para a automação');
      return;
    }
    if (actions.length === 0) {
      toast.error('Pelo menos uma ação é obrigatória');
      return;
    }
    // Block save if any action is missing required refs. The backend
    // would 400 anyway, but better UX to catch here with a friendly msg.
    const missing = actions.findIndex((a) => !isActionConfigured(a));
    if (missing >= 0) {
      toast.error(
        `Configure os campos da ação ${missing + 1} (${ACTION_LABELS[actions[missing].type]})`,
      );
      return;
    }
    if (enabled && isBroadcastRisk({ trigger, conditions, actions })) {
      toast.error(BROADCAST_RISK_MESSAGE);
      return;
    }
    const payload: CreateAutomationPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger,
      conditions: conditions.groups.length > 0 ? conditions : {},
      actions,
      enabled,
      rateLimitPerMinute,
    };
    setSaving(true);
    try {
      if (initial) {
        await automationsService.update(initial.id, payload);
        toast.success('Automação atualizada');
      } else {
        await automationsService.create(payload);
        toast.success('Automação criada');
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Erro ao salvar automação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* O fundo fecha no clique; no teclado, Esc ou o botão Fechar. */}
      <div aria-hidden="true" className="flex-1 bg-zinc-950/50" onClick={onClose} />
      <div
        {...panelProps}
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-overlay focus:outline-none"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {initial ? 'Editar automação' : 'Nova automação'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Quando algo acontece → executa uma sequência de ações
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar"
            title="Fechar"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          {/* Basic */}
          <section className="space-y-3">
            <Label htmlFor="automation-name">Nome</Label>
            <input
              id="automation-name"
              className={fieldCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Notificar João quando a tag VIP for adicionada"
              maxLength={120}
            />
            <Label htmlFor="automation-description">Descrição (opcional)</Label>
            <textarea
              id="automation-description"
              className={textareaCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </section>

          {/* Trigger */}
          <section className="space-y-3">
            <SectionTitle index={1} title="Quando" />
            <div className="grid gap-2">
              {meta.triggers.map((t) => (
                <label
                  key={t.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    trigger === t.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="trigger"
                    value={t.value}
                    checked={trigger === t.value}
                    onChange={() => setTrigger(t.value)}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <div className="font-medium text-foreground">{TRIGGER_LABELS[t.value]}</div>
                    <div className="text-xs text-muted-foreground">
                      {TRIGGER_DESCRIPTIONS[t.value]}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Conditions */}
          <section className="space-y-3">
            <SectionTitle
              index={2}
              title="Condições"
              hint="Sem condições = roda em todos os eventos do gatilho"
            />
            {conditions.groups.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <label htmlFor="automation-groups-match">Combinar grupos com:</label>
                <select
                  id="automation-groups-match"
                  value={conditions.match}
                  onChange={(e) =>
                    setConditions({
                      ...conditions,
                      match: e.target.value as 'AND' | 'OR',
                    })
                  }
                  className={controlSmCls}
                >
                  <option value="OR">Qualquer um (OU)</option>
                  <option value="AND">Todos (E)</option>
                </select>
              </div>
            )}
            {conditions.groups.map((group, gi) => (
              <div
                key={gi}
                className="space-y-2 rounded-lg border border-border bg-muted/50 p-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-muted-foreground">
                    Grupo {gi + 1}
                    <select
                      aria-label={`Como combinar as regras do grupo ${gi + 1}`}
                      value={group.match}
                      onChange={(e) => {
                        const groups = conditions.groups.map((g, i) =>
                          i === gi
                            ? { ...g, match: e.target.value as 'AND' | 'OR' }
                            : g,
                        );
                        setConditions({ ...conditions, groups });
                      }}
                      className={controlSmCls}
                    >
                      <option value="AND">Todas as regras</option>
                      <option value="OR">Qualquer regra</option>
                    </select>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    aria-label={`Remover grupo ${gi + 1}`}
                    title="Remover grupo"
                    className={removeBtnCls}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                {group.rules.map((rule, ri) => (
                  <RuleRow
                    key={ri}
                    rule={rule}
                    fields={triggerFields}
                    lookups={lookups}
                    onChange={(patch) => updateRule(gi, ri, patch)}
                    onRemove={() => removeRule(gi, ri)}
                  />
                ))}
                <button
                  onClick={() => addRule(gi)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Adicionar regra ao grupo
                </button>
              </div>
            ))}
            <button
              onClick={addGroup}
              className="flex min-h-10 items-center gap-1 rounded-lg border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus aria-hidden="true" className="h-4 w-4" /> Adicionar grupo de condições
            </button>
          </section>

          {/* Actions */}
          <section className="space-y-3">
            <SectionTitle index={3} title="Ações" hint="Executadas em ordem" />
            {actions.map((action, i) => (
              <ActionRow
                key={i}
                index={i}
                action={action}
                lookups={lookups}
                onChange={(patch) => updateAction(i, patch)}
                onParamChange={(key, value) =>
                  updateActionParam(i, key, value)
                }
                onParamsChange={(patch) => updateActionParams(i, patch)}
                onRemove={() => removeAction(i)}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              {meta.actions.map((a) => (
                <button
                  key={a.type}
                  onClick={() => addAction(a.type)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  + {ACTION_LABELS[a.type]}
                </button>
              ))}
            </div>
          </section>

          {/* Settings */}
          <section className="space-y-3 border-t border-border pt-4">
            <Label htmlFor="automation-rate-limit">Limite por minuto (por conversa)</Label>
            <input
              id="automation-rate-limit"
              type="number"
              min={0}
              max={120}
              value={rateLimitPerMinute}
              onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
              className={`${controlCls} w-32 tabular-nums`}
            />
            <p className="text-xs text-muted-foreground">
              Máximo de execuções por minuto na mesma conversa. Acima desse
              limite, as execuções são ignoradas.
            </p>

            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm text-foreground">Ativar imediatamente</span>
            </label>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-4 sm:px-6">
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="lg" onClick={handleSave} loading={saving}>
            {saving ? 'Salvando…' : initial ? 'Salvar' : 'Criar'}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function SectionTitle({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary"
      >
        {index}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-foreground">
      {children}
    </label>
  );
}

const fieldCls = `${controlCls} w-full`;
const textareaCls = cn(controlCls, 'h-auto w-full py-2');
const removeBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// Tipo da etapa do funil como o time fala, em vez do enum do banco.
const STAGE_TYPE_LABELS: Record<string, string> = { WON: 'Ganho', LOST: 'Perdido' };

function stageTypeSuffix(type: string): string {
  if (type === 'NORMAL') return '';
  return ` (${STAGE_TYPE_LABELS[type] ?? type.toLowerCase()})`;
}

// Renders the value side of a condition rule based on which field is
// selected. Maps every ID-bearing field to a real-data dropdown so a
// non-technical user never has to know an ID exists.
function ConditionValueInput({
  field,
  value,
  onChange,
  lookups,
}: {
  field: string;
  value: ConditionRule['value'];
  onChange: (v: ConditionRule['value']) => void;
  lookups: AutomationLookups;
}) {
  switch (field) {
    case 'tagId':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione uma tag…</option>
          {lookups.tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      );
    case 'channelId':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione um canal…</option>
          {lookups.channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      );
    case 'fromAssigneeId':
    case 'toAssigneeId':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione um agente…</option>
          {lookups.members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user?.name ?? m.user?.email ?? m.userId}
            </option>
          ))}
        </select>
      );
    case 'fromStatus':
    case 'toStatus':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione um status…</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      );
    case 'target':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? 'conversation'}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="conversation">Conversa</option>
          <option value="contact">Contato</option>
        </select>
      );
    case 'type':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione um tipo…</option>
          {MESSAGE_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      );
    case 'storyKind':
      return (
        <select
          className={fieldCls}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecione…</option>
          <option value="reply">Respondeu a um Story</option>
          <option value="mention">Mencionou em um Story</option>
        </select>
      );
    case 'isReply':
      return (
        <select
          className={fieldCls}
          value={String(value ?? false)}
          onChange={(e) => onChange(e.target.value === 'true')}
        >
          <option value="true">Sim, é resposta a outro comentário</option>
          <option value="false">Não, é comentário no post</option>
        </select>
      );
    case 'hasAttachment':
      return (
        <select
          className={fieldCls}
          value={String(value ?? false)}
          onChange={(e) => onChange(e.target.value === 'true')}
        >
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      );
    default:
      return (
        <input
          className={fieldCls}
          value={(value as string | number | undefined)?.toString() ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Valor"
          placeholder="Valor"
        />
      );
  }
}

function RuleRow({
  rule,
  fields,
  lookups,
  onChange,
  onRemove,
}: {
  rule: ConditionRule;
  fields: string[];
  lookups: AutomationLookups;
  onChange: (patch: Partial<ConditionRule>) => void;
  onRemove: () => void;
}) {
  const ops = operatorsForField(rule.field);
  const needsValue = rule.op !== 'is_set' && rule.op !== 'is_not_set';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Campo"
        value={rule.field}
        onChange={(e) =>
          // Field change: clear the value because the previous one was
          // probably for a different lookup type (e.g. a tag id is
          // meaningless if user just switched to channelId).
          onChange({ field: e.target.value, value: '' })
        }
        className={`${controlCls} min-w-0 max-w-full`}
      >
        {fields.map((f) => (
          <option key={f} value={f}>
            {FIELD_LABELS[f] ?? f}
          </option>
        ))}
      </select>
      <select
        aria-label="Operador"
        value={rule.op}
        onChange={(e) => onChange({ op: e.target.value as ConditionOperator })}
        className={`${controlCls} min-w-0 max-w-full`}
      >
        {ops.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>
      {needsValue && (
        <div className="min-w-0 flex-1 basis-40">
          <ConditionValueInput
            field={rule.field}
            value={rule.value}
            onChange={(v) => onChange({ value: v })}
            lookups={lookups}
          />
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className={removeBtnCls}
        aria-label="Remover regra"
        title="Remover regra"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

function ActionRow({
  index,
  action,
  lookups,
  onChange,
  onParamChange,
  onParamsChange,
  onRemove,
}: {
  index: number;
  action: ActionDefinition;
  lookups: AutomationLookups;
  onChange: (patch: Partial<ActionDefinition>) => void;
  onParamChange: (key: string, value: unknown) => void;
  onParamsChange: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          <span className="tabular-nums">{index + 1}.</span> {ACTION_LABELS[action.type]}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ação ${index + 1}`}
          title="Remover ação"
          className={removeBtnCls}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <ActionParams
        action={action}
        lookups={lookups}
        onParamChange={onParamChange}
        onParamsChange={onParamsChange}
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={action.continueOnError ?? false}
          onChange={(e) => onChange({ continueOnError: e.target.checked })}
          className="h-3.5 w-3.5 rounded accent-primary"
        />
        Continuar se essa ação falhar
      </label>
    </div>
  );
}

function ActionParams({
  action,
  lookups,
  onParamChange,
  onParamsChange,
}: {
  action: ActionDefinition;
  lookups: AutomationLookups;
  onParamChange: (key: string, value: unknown) => void;
  // Atomic multi-key update — required when picking a pipeline because
  // we also need to clear the dependent stageId in the same render.
  onParamsChange: (patch: Record<string, unknown>) => void;
}) {
  switch (action.type) {
    case 'add_tag':
    case 'remove_tag':
      return (
        <div className="space-y-2">
          <select
            className={fieldCls}
            value={(action.params.tagId as string) ?? ''}
            onChange={(e) => onParamChange('tagId', e.target.value)}
          >
            <option value="">Selecione uma tag…</option>
            {lookups.tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className={fieldCls}
            value={(action.params.target as string) ?? 'conversation'}
            onChange={(e) => onParamChange('target', e.target.value)}
          >
            <option value="conversation">Aplicar à conversa</option>
            <option value="contact">Aplicar ao contato</option>
          </select>
        </div>
      );
    case 'add_to_pipeline': {
      const pipelineId = (action.params.pipelineId as string) ?? '';
      const stages = lookups.stagesOf(pipelineId);
      return (
        <div className="space-y-2">
          <select
            className={fieldCls}
            value={pipelineId}
            onChange={(e) =>
              // Atomic: clearing stage in a separate setState would race
              // the pipelineId update and revert it.
              onParamsChange({ pipelineId: e.target.value, stageId: '' })
            }
          >
            <option value="">Selecione um funil…</option>
            {lookups.pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {pipelineId && stages.length > 0 && (
            <select
              className={fieldCls}
              value={(action.params.stageId as string) ?? ''}
              onChange={(e) => onParamChange('stageId', e.target.value)}
            >
              <option value="">Primeira etapa (padrão)</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {stageTypeSuffix(s.type)}
                </option>
              ))}
            </select>
          )}
        </div>
      );
    }
    case 'move_pipeline_stage': {
      const pipelineId = (action.params.pipelineId as string) ?? '';
      const stages = lookups.stagesOf(pipelineId);
      return (
        <div className="space-y-2">
          <select
            className={fieldCls}
            value={pipelineId}
            onChange={(e) =>
              onParamsChange({
                pipelineId: e.target.value,
                toStageId: '',
              })
            }
          >
            <option value="">Selecione um funil…</option>
            {lookups.pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {pipelineId && (
            <select
              className={fieldCls}
              value={(action.params.toStageId as string) ?? ''}
              onChange={(e) => onParamChange('toStageId', e.target.value)}
            >
              <option value="">Selecione a etapa de destino…</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {stageTypeSuffix(s.type)}
                </option>
              ))}
            </select>
          )}
        </div>
      );
    }
    case 'assign_user':
      return (
        <select
          className={fieldCls}
          value={(action.params.userId as string) ?? ''}
          onChange={(e) => onParamChange('userId', e.target.value)}
        >
          <option value="">Selecione um agente…</option>
          {lookups.members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user?.name ?? m.user?.email ?? m.userId}
              {m.role !== 'AGENT' ? ` · ${roleLabel(m.role)}` : ''}
            </option>
          ))}
        </select>
      );
    case 'send_message':
      return (
        <textarea
          placeholder="Texto da mensagem (responde no mesmo canal da conversa)"
          className={textareaCls}
          rows={3}
          maxLength={4096}
          value={(action.params.body as string) ?? ''}
          onChange={(e) => onParamChange('body', e.target.value)}
        />
      );
    case 'send_private_reply':
      return (
        <textarea
          placeholder="Texto da DM (a Meta permite UMA por comentário, dentro de 7 dias)"
          className={textareaCls}
          rows={3}
          maxLength={1000}
          value={(action.params.message as string) ?? ''}
          onChange={(e) => onParamChange('message', e.target.value)}
        />
      );
    case 'reply_public_comment':
      return (
        <textarea
          placeholder="Texto da resposta pública — fica visível para todos"
          className={textareaCls}
          rows={2}
          maxLength={1000}
          value={(action.params.message as string) ?? ''}
          onChange={(e) => onParamChange('message', e.target.value)}
        />
      );
  }
}

function defaultActionParams(type: ActionType): Record<string, unknown> {
  switch (type) {
    case 'add_tag':
    case 'remove_tag':
      return { tagId: '', target: 'conversation' };
    case 'add_to_pipeline':
      return { pipelineId: '', stageId: '' };
    case 'move_pipeline_stage':
      return { pipelineId: '', toStageId: '' };
    case 'assign_user':
      return { userId: '' };
    case 'send_message':
      return { body: '' };
    case 'send_private_reply':
    case 'reply_public_comment':
      return { message: '' };
  }
}

// Pre-flight check: every action must have its required refs filled in.
// Mirrors the backend's per-handler validateParams. Run before save so
// the user gets a friendly toast instead of an HTTP 400.
function isActionConfigured(action: ActionDefinition): boolean {
  switch (action.type) {
    case 'add_tag':
    case 'remove_tag':
      return !!action.params.tagId;
    case 'add_to_pipeline':
      return !!action.params.pipelineId;
    case 'move_pipeline_stage':
      return !!action.params.pipelineId && !!action.params.toStageId;
    case 'assign_user':
      return !!action.params.userId;
    case 'send_message':
      return (
        typeof action.params.body === 'string' &&
        (action.params.body as string).trim().length > 0
      );
    case 'send_private_reply':
    case 'reply_public_comment':
      return (
        typeof action.params.message === 'string' &&
        (action.params.message as string).trim().length > 0
      );
  }
}
