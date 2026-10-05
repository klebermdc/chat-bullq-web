'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, X, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentsService,
  CURATED_MODELS,
  DEFAULT_AGENT_MODEL,
  DEPARTMENTS,
  type AiAgent,
  type AgentMode,
} from '../services/ai-agents.service';
import { aiCatalogService } from '../services/ai-catalog.service';
import { channelsService } from '@/features/channels/services/channels.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls, controlSmCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { channelTypeLabel } from '@/lib/channel-labels';
import { cn } from '@/lib/utils';
import { departmentLabel } from './department-labels';

interface EditAgentDialogProps {
  agent: AiAgent | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditAgentDialog({
  agent,
  onClose,
  onSaved,
}: EditAgentDialogProps) {
  const orgId = useOrgId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_AGENT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [parentAgentId, setParentAgentId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [squad, setSquad] = useState('');
  const [operationalContext, setOperationalContext] = useState('');
  const [operationalContextUpdatedAt, setOperationalContextUpdatedAt] = useState<
    string | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelMode, setNewChannelMode] = useState<AgentMode>('AUTONOMOUS');

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
    enabled: !!agent,
  });

  // Other agents in the org for the "reports to" dropdown.
  const { data: allAgents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
    enabled: !!agent,
  });

  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setDescription(agent.description ?? '');
    setModelId(agent.modelId);
    setSystemPrompt(agent.systemPrompt);
    setTemperature(agent.temperature);
    setParentAgentId(agent.parentAgentId ?? '');
    setDepartment(agent.department ?? '');
    setSquad(agent.squad ?? '');
    setOperationalContext(agent.operationalContext ?? '');
    setOperationalContextUpdatedAt(agent.operationalContextUpdatedAt ?? null);
  }, [agent]);

  if (!agent) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await aiAgentsService.update(agent.id, {
        name,
        description,
        modelId,
        systemPrompt,
        temperature,
        parentAgentId: parentAgentId || null,
        department: department || null,
        squad: squad.trim() || null,
        operationalContext: operationalContext.trim() || null,
      });
      toast.success('Agente atualizado');
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Excluir "${agent.name}"?`,
      description:
        'O agente para de responder nos canais vinculados. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!isConfirmed) return;
    try {
      await aiAgentsService.remove(agent.id);
      toast.success('Agente excluído');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao excluir'));
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelId) return;
    try {
      await aiAgentsService.assignChannel(agent.id, {
        channelId: newChannelId,
        mode: newChannelMode,
      });
      toast.success('Canal vinculado');
      setShowAddChannel(false);
      setNewChannelId('');
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao vincular canal'));
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    try {
      await aiAgentsService.unassignChannel(agent.id, channelId);
      toast.success('Canal removido do agente');
      onSaved();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao desvincular'));
    }
  };

  const availableChannels = (channels ?? []).filter(
    (c) => !agent.channels?.some((ac) => ac.channelId === c.id),
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title="Editar agente"
      size="xl"
      dismissible={false}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="mr-auto text-urgent-ink hover:bg-urgent-wash hover:text-urgent-ink"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Excluir
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-agent-1" className="block text-xs font-medium text-foreground">
              Nome
            </label>
            <input id="edit-agent-1"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(controlCls, 'mt-1 w-full')}
            />
          </div>

          <div>
            <label htmlFor="edit-agent-2" className="block text-xs font-medium text-foreground">
              Descrição
            </label>
            <input id="edit-agent-2"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(controlCls, 'mt-1 w-full')}
            />
          </div>

          <div>
            <label htmlFor="edit-agent-3" className="block text-xs font-medium text-foreground">
              Modelo
            </label>
            <select id="edit-agent-3"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className={cn(controlCls, 'mt-1 w-full')}
            >
              {CURATED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.badge}
                </option>
              ))}
              {!CURATED_MODELS.some((m) => m.id === modelId) && (
                <option value={modelId}>{modelId} (personalizado)</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="edit-agent-4" className="block text-xs font-medium text-foreground">
              Prompt do sistema
            </label>
            <textarea id="edit-agent-4"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className={cn(controlCls, 'mt-1 h-auto w-full py-2 font-mono text-xs')}
            />
          </div>

          <div className="rounded-lg border border-warning/40 bg-warning-wash/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                <label
                  htmlFor="edit-agent-operational-context"
                  className="block text-xs font-medium uppercase tracking-wider text-warning-ink"
                >
                  Contexto operacional do dia
                </label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Memória viva injetada no prompt — atualize quando rodar
                  campanha, der aula, mudar oferta. Ex: &quot;Hoje 20h teve aula
                  de Skills. Pra quem responder feedback positivo, ofereça
                  Dominando Claude Code R$ 1.497 (link X).&quot;
                </p>
              </div>
              {operationalContextUpdatedAt && (
                <span className="shrink-0 text-[11px] text-warning-ink">
                  Atualizado{' '}
                  {formatRelative(operationalContextUpdatedAt)}
                </span>
              )}
            </div>
            <textarea
              id="edit-agent-operational-context"
              value={operationalContext}
              onChange={(e) => setOperationalContext(e.target.value)}
              rows={4}
              placeholder="Deixe vazio se hoje não tem nada operacional…"
              maxLength={8000}
              className={cn(controlCls, 'mt-3 h-auto w-full py-2 text-xs')}
            />
            <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
              {operationalContext.length}/8000
            </p>
          </div>

          <div>
            <label htmlFor="edit-agent-5" className="block text-xs font-medium text-foreground">
              Criatividade ({temperature.toFixed(2)})
            </label>
            <input id="edit-agent-5"
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </div>

          {/* Organograma matricial ágil */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Organograma
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Define a hierarquia (chefia direta), o departamento e o squad.
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="edit-agent-6" className="block text-xs font-medium text-foreground">
                  Reporta a (chefe direto)
                </label>
                <select id="edit-agent-6"
                  value={parentAgentId}
                  onChange={(e) => setParentAgentId(e.target.value)}
                  className={cn(controlCls, 'mt-1 w-full')}
                >
                  <option value="">— Raiz / sem chefe (CEO virtual) —</option>
                  {(allAgents ?? [])
                    .filter((a) => a.id !== agent.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}{' '}
                        {a.kind === 'ORCHESTRATOR' ? '(Orquestrador)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-agent-7" className="block text-xs font-medium text-foreground">
                    Departamento
                  </label>
                  <select id="edit-agent-7"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className={cn(controlCls, 'mt-1 w-full')}
                  >
                    <option value="">— Não definido —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {departmentLabel(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-agent-8" className="block text-xs font-medium text-foreground">
                    Squad ágil
                  </label>
                  <input id="edit-agent-8"
                    type="text"
                    value={squad}
                    onChange={(e) => setSquad(e.target.value)}
                    placeholder="Ex.: Inbound B2C"
                    className={cn(controlCls, 'mt-1 w-full')}
                  />
                </div>
              </div>
            </div>
          </div>

          {agent && (
            <AgentSkillsAndTools agentId={agent.id} />
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                Canais
              </h4>
              {!showAddChannel && availableChannels.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowAddChannel(true)}>
                  <Plus aria-hidden="true" className="h-3 w-3" /> Vincular canal
                </Button>
              )}
            </div>
            {showAddChannel && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Canal"
                  value={newChannelId}
                  onChange={(e) => setNewChannelId(e.target.value)}
                  className={cn(controlSmCls, 'min-w-0 flex-1 basis-40')}
                >
                  <option value="">Selecione um canal…</option>
                  {availableChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({channelTypeLabel(c.type)})
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Modo de atuação"
                  value={newChannelMode}
                  onChange={(e) => setNewChannelMode(e.target.value as AgentMode)}
                  className={controlSmCls}
                >
                  <option value="AUTONOMOUS">Autônomo</option>
                  <option value="COPILOT">Copiloto</option>
                  <option value="DISABLED">Desativado</option>
                </select>
                <Button variant="secondary" size="sm" onClick={handleAddChannel}>
                  Vincular
                </Button>
                <button
                  type="button"
                  onClick={() => setShowAddChannel(false)}
                  aria-label="Cancelar vínculo de canal"
                  title="Cancelar"
                  className={iconBtnCls}
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {(agent.channels ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0 text-sm">
                    <span className="font-medium text-foreground">
                      {c.channel.name}
                    </span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {channelTypeLabel(c.channel.type)} · {AGENT_MODE_LABELS[c.mode] ?? c.mode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChannel(c.channelId)}
                    aria-label={`Desvincular ${c.channel.name}`}
                    title="Desvincular canal"
                    className={cn(iconBtnCls, 'hover:bg-urgent-wash hover:text-urgent-ink')}
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(agent.channels ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum canal vinculado. O agente não vai responder ninguém ainda.
                </p>
              )}
            </div>
          </div>
        </div>

        {confirmDialog}
    </Dialog>
  );
}

const iconBtnCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const AGENT_MODE_LABELS: Record<string, string> = {
  AUTONOMOUS: 'Autônomo',
  COPILOT: 'Copiloto',
  DISABLED: 'Desativado',
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const ageMs = Date.now() - d.getTime();
  const ageHours = Math.floor(ageMs / 3_600_000);
  if (ageHours < 1) return 'há minutos';
  if (ageHours < 24) return `há ${ageHours} h`;
  const ageDays = Math.floor(ageHours / 24);
  if (ageDays < 30) return `há ${ageDays} ${ageDays === 1 ? 'dia' : 'dias'}`;
  return `há ${Math.floor(ageDays / 30)} meses`;
}

function AgentSkillsAndTools({ agentId }: { agentId: string }) {
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const queryClient = useQueryClient();

  const { data: skills } = useQuery({
    queryKey: ['ai-skills'],
    queryFn: () => aiCatalogService.listSkills(),
  });

  // Bindings (agent, skill) carregam o estado de `requiresApproval` por
  // skill já atribuída. Refetch agressivo porque mudança aqui é raríssima
  // mas crítica (define se executa direto ou cria PendingAction).
  const { data: bindings } = useQuery({
    queryKey: ['ai-agent-skills', agentId],
    queryFn: () => aiAgentsService.listAgentSkills(agentId),
    enabled: !!agentId,
  });

  const approvalByskillId = new Map(
    (bindings ?? []).map((b) => [b.skillId, b.requiresApproval]),
  );

  useEffect(() => {
    if (!skills) return;
    const ids = skills
      .filter((s) => (s.agents ?? []).some((a) => a.agent.id === agentId))
      .map((s) => s.id);
    setSkillIds(ids);
  }, [skills, agentId]);

  const toggleSkill = (id: string) =>
    setSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSaveSkills = async () => {
    setSavingSkills(true);
    try {
      await aiCatalogService.setAgentSkills(agentId, skillIds);
      // Recarrega bindings — skills atribuídas mudaram, requiresApproval
      // de skills novas é false por padrão.
      await queryClient.invalidateQueries({
        queryKey: ['ai-agent-skills', agentId],
      });
      toast.success('Skills atualizadas');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro'));
    } finally {
      setSavingSkills(false);
    }
  };

  const toggleApproval = async (skillId: string, next: boolean) => {
    try {
      await aiAgentsService.setSkillApproval(agentId, skillId, next);
      await queryClient.invalidateQueries({
        queryKey: ['ai-agent-skills', agentId],
      });
      toast.success(
        next
          ? 'Skill agora exige aprovação humana antes de executar'
          : 'Skill volta a executar automaticamente',
      );
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            Skills atribuídas ({skillIds.length})
          </h4>
          <Button variant="secondary" size="sm" onClick={handleSaveSkills} loading={savingSkills}>
            Salvar skills
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Cada skill é uma função que o agente pode chamar (ex.: /resetPassword),
          ligada à sua tool (conexão). As essenciais (responder, transferir,
          etiquetar) já vêm incluídas.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Skills marcadas com <ShieldCheck aria-hidden="true" className="inline h-3 w-3 text-warning-ink" />{' '}
          exigem aprovação humana pela caixa de entrada antes de executar — útil para ações
          irreversíveis (liberar acesso, redefinir senha). Padrão: executa direto.
        </p>
        <div className="mt-2 max-h-72 overflow-y-auto">
          {(skills ?? []).map((s) => {
            const checked = skillIds.includes(s.id);
            const requiresApproval = approvalByskillId.get(s.id) ?? false;
            return (
              <div
                key={s.id}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-background ${
                  checked ? 'bg-background' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSkill(s.id)}
                  aria-label={`Atribuir skill ${s.name}`}
                  className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {s.name}
                    </span>
                    {s.category && (
                      <Badge variant="neutral" className="font-medium">{s.category}</Badge>
                    )}
                    <Badge variant="neutral" className="font-mono font-medium">{s.source}</Badge>
                    {checked && (
                      <button
                        type="button"
                        aria-pressed={requiresApproval}
                        onClick={() => toggleApproval(s.id, !requiresApproval)}
                        className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          requiresApproval
                            ? 'bg-warning-wash text-warning-ink hover:opacity-80'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                        title={
                          requiresApproval
                            ? 'Clique para desligar — a skill volta a executar automaticamente'
                            : 'Clique para ligar — a skill vai exigir aprovação humana antes de executar'
                        }
                      >
                        <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                        {requiresApproval ? 'Com aprovação' : 'Automática'}
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                    {s.description}
                    {s.tool && (
                      <>
                        {' · via '}
                        <code className="font-mono">{s.tool.name}</code>
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          {(skills ?? []).length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              Nenhuma skill cadastrada. Crie em Jarvis › Skills.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
