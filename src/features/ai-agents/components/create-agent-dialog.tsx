'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  aiAgentsService,
  CURATED_MODELS,
  DEFAULT_AGENT_MODEL,
  DEPARTMENTS,
  type AgentKind,
} from '../services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { departmentLabel } from './department-labels';

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DEFAULT_PROMPT = `Você é o(a) atendente da empresa. Sua missão é responder os clientes com simpatia, agilidade e clareza.

Regras:
- Use apenas as informações que você sabe com certeza.
- Se o cliente pedir algo fora do seu conhecimento, transfira para um humano.
- Mantenha tom natural e direto, sem rebuscar.`;

export function CreateAgentDialog({
  open,
  onClose,
  onCreated,
}: CreateAgentDialogProps) {
  const orgId = useOrgId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<AgentKind>('WORKER');
  const [category, setCategory] = useState('');
  const [modelId, setModelId] = useState(DEFAULT_AGENT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [parentAgentId, setParentAgentId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [squad, setSquad] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing agents for the "reports to" dropdown.
  // Only enabled while dialog is open to avoid unnecessary fetches.
  const { data: agents } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
    enabled: open,
  });

  useEffect(() => {
    // When user picks ORCHESTRATOR, default parent to none and department
    // to leave the org root unconstrained — orchestrators usually report
    // straight to the human owner, not another agent.
    if (kind === 'ORCHESTRATOR' && parentAgentId) {
      setParentAgentId('');
    }
  }, [kind, parentAgentId]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('Nome e prompt do sistema são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await aiAgentsService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        kind,
        category: category.trim() || undefined,
        modelId,
        systemPrompt: systemPrompt.trim(),
        temperature,
        parentAgentId: parentAgentId || null,
        department: department || null,
        squad: squad.trim() || null,
      });
      toast.success('Agente criado');
      reset();
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(
        getErrorMessage(err, 'Erro ao criar'),
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setName('');
    setDescription('');
    setKind('WORKER');
    setCategory('');
    setModelId(DEFAULT_AGENT_MODEL);
    setSystemPrompt(DEFAULT_PROMPT);
    setTemperature(0.7);
    setParentAgentId('');
    setDepartment('');
    setSquad('');
  };

  // Eligible parents: any agent in the org (the list endpoint already
  // filters soft-deleted ones). Workers can report to workers (multi-level).
  const eligibleParents = agents ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo agente"
      size="xl"
      dismissible={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {saving ? 'Criando…' : 'Criar agente'}
          </Button>
        </>
      }
    >
        <div className="space-y-4">
          <div>
            <label htmlFor="create-agent-1" className="block text-xs font-medium text-foreground">
              Nome *
            </label>
            <input id="create-agent-1"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Vendas Bravy"
              className={cn(controlCls, 'mt-1 w-full')}
            />
          </div>

          <div>
            <label htmlFor="create-agent-2" className="block text-xs font-medium text-foreground">
              Descrição (interna)
            </label>
            <input id="create-agent-2"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Responde dúvidas sobre planos e fecha matrícula"
              className={cn(controlCls, 'mt-1 w-full')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="create-agent-3" className="block text-xs font-medium text-foreground">
                Tipo
              </label>
              <select id="create-agent-3"
                value={kind}
                onChange={(e) => setKind(e.target.value as AgentKind)}
                className={cn(controlCls, 'mt-1 w-full')}
              >
                <option value="WORKER">Agente (atende o cliente)</option>
                <option value="ORCHESTRATOR">
                  Orquestrador (distribui para os agentes)
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="create-agent-4" className="block text-xs font-medium text-foreground">
                Categoria
              </label>
              <input id="create-agent-4"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="vendas / suporte / cobrança"
                className={cn(controlCls, 'mt-1 w-full')}
              />
            </div>
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
                <label htmlFor="create-agent-5" className="block text-xs font-medium text-foreground">
                  Reporta a (chefe direto)
                </label>
                <select id="create-agent-5"
                  value={parentAgentId}
                  onChange={(e) => setParentAgentId(e.target.value)}
                  className={cn(controlCls, 'mt-1 w-full')}
                >
                  <option value="">— Raiz / sem chefe (CEO virtual) —</option>
                  {eligibleParents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.kind === 'ORCHESTRATOR' ? '(Orquestrador)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-agent-6" className="block text-xs font-medium text-foreground">
                    Departamento
                  </label>
                  <select id="create-agent-6"
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
                  <label htmlFor="create-agent-7" className="block text-xs font-medium text-foreground">
                    Squad ágil
                  </label>
                  <input id="create-agent-7"
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

          <div>
            <label htmlFor="create-agent-8" className="block text-xs font-medium text-foreground">
              Modelo *
            </label>
            <select id="create-agent-8"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className={cn(controlCls, 'mt-1 w-full')}
            >
              {CURATED_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.badge}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sugestão: Fugu Ultra para conversas; Fugu para tarefas internas simples.
            </p>
          </div>

          <div>
            <label htmlFor="create-agent-9" className="block text-xs font-medium text-foreground">
              Prompt do sistema *
            </label>
            <textarea id="create-agent-9"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className={cn(controlCls, 'mt-1 h-auto w-full py-2 font-mono text-xs')}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Você não precisa repetir contexto da empresa — o sistema injeta nome, canal, hora, dados do contato e memória automaticamente.
            </p>
          </div>

          <div>
            <label htmlFor="create-agent-10" className="block text-xs font-medium text-foreground">
              Criatividade ({temperature.toFixed(2)})
            </label>
            <input id="create-agent-10"
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Determinístico</span>
              <span>Criativo</span>
            </div>
          </div>
        </div>

    </Dialog>
  );
}
