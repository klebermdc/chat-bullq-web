'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { Bot, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentsService,
  type AiAgent,
  DEPARTMENT_COLORS,
} from '../services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { CreateAgentDialog } from './create-agent-dialog';
import { EditAgentDialog } from './edit-agent-dialog';
import { AgentNode, type AgentNodeData } from './agent-node';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { CHART_GRID, CHART_MUTED, CHART_SERIES } from '@/lib/chart-theme';
import { departmentLabel } from './department-labels';

const NODE_WIDTH = 320;
const NODE_HEIGHT = 160;

const nodeTypes: NodeTypes = { agent: AgentNode };

/**
 * Computes top-down hierarchical positions for the agent organogram using
 * dagre. Nodes without a parent become roots; multiple roots stack
 * horizontally at depth 0. Department isn't fed into layout (would force
 * unrelated agents apart) — it's only a visual cue on each card.
 */
function layoutOrganogram(agents: AiAgent[]): {
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    // Espaço entre nós irmãos (horizontal). Aumentar evita as edges
    // passarem por cima umas das outras quando 1 pai tem N filhos.
    nodesep: 100,
    // Espaço vertical entre níveis. Mais alto = mais "respiro" pras
    // linhas saírem retas antes de virar lateral.
    ranksep: 120,
    // Direciona o algoritmo a posicionar cada nó no centro do seu
    // pai (organograma "cartório") em vez de empilhar à esquerda.
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(agents.map((a) => a.id));

  for (const a of agents) {
    g.setNode(a.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const a of agents) {
    // Treat unknown parent as root (orphaned ref). Avoids broken edges
    // when an agent is hard-deleted but children weren't reparented.
    if (a.parentAgentId && ids.has(a.parentAgentId)) {
      g.setEdge(a.parentAgentId, a.id);
    }
  }

  dagre.layout(g);

  const nodes: Node<AgentNodeData>[] = agents.map((a) => {
    const pos = g.node(a.id);
    return {
      id: a.id,
      type: 'agent',
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      data: {
        agent: a,
        // overwritten by AgentsList with real handlers
        onClick: () => {},
        onToggleActive: () => {},
      },
      draggable: true,
    };
  });

  const edges: Edge[] = [];
  for (const a of agents) {
    if (a.parentAgentId && ids.has(a.parentAgentId)) {
      edges.push({
        id: `${a.parentAgentId}->${a.id}`,
        source: a.parentAgentId,
        target: a.id,
        // step (sem curvas) dá um L "engineering" tradicional pra
        // organograma; smoothstep com curvas faz N edges saindo do
        // mesmo handle se cruzarem visualmente perto do source.
        type: 'step',
        animated: false,
        style: { stroke: CHART_MUTED, strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}

export function AgentsList() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AiAgent | null>(null);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['ai-agents'] });

  const handleToggleActive = async (agent: AiAgent) => {
    try {
      await aiAgentsService.update(agent.id, { isActive: !agent.isActive });
      toast.success(agent.isActive ? 'Agente desativado' : 'Agente ativado');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alternar');
    }
  };

  // Distinct departments present, in stable order, for the filter chips.
  const departments = useMemo(() => {
    if (!agents) return [];
    return [
      ...new Set(
        agents
          .map((a) => a.department)
          .filter((d): d is string => !!d),
      ),
    ].sort();
  }, [agents]);

  const filtered = useMemo(() => {
    if (!agents) return [];
    if (!deptFilter) return agents;
    return agents.filter((a) => a.department === deptFilter);
  }, [agents, deptFilter]);

  const { nodes, edges } = useMemo(() => {
    const out = layoutOrganogram(filtered);
    // inject real handlers (memoized layout doesn't know them)
    return {
      nodes: out.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onClick: setEditing,
          onToggleActive: handleToggleActive,
        },
      })),
      edges: out.edges,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const hasAgents = (agents?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">
            Organograma de agentes
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quem reporta a quem, agrupado por departamento
          </p>
        </div>
        <Button size="lg" onClick={() => setShowCreate(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Novo agente
        </Button>
      </div>

      {departments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
          <span className="text-xs font-medium text-muted-foreground">Departamento:</span>
          <button
            type="button"
            aria-pressed={deptFilter === null}
            onClick={() => setDeptFilter(null)}
            className={`min-h-8 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              deptFilter === null
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {departments.map((d) => {
            const c = DEPARTMENT_COLORS[d];
            const active = deptFilter === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => setDeptFilter(active ? null : d)}
                className={`min-h-8 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? `${c?.bg ?? 'bg-muted'} ${c?.text ?? 'text-foreground'} ring-1 ${c?.ring ?? 'ring-border'}`
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {departmentLabel(d)}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-h-[640px]">
        {isLoading ? (
          <LoadingState label="Carregando agentes…" className="h-full" />
        ) : hasAgents ? (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={1.5}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              className="bg-muted/40"
            >
              <Background gap={24} size={1} color={CHART_GRID} />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => {
                  const a = (n.data as AgentNodeData).agent;
                  if (a.kind === 'ORCHESTRATOR') return 'var(--color-primary)';
                  if (a.department === 'VENDAS') return CHART_SERIES[2];
                  if (a.department === 'SUPORTE') return CHART_SERIES[0];
                  if (a.department === 'CS') return CHART_SERIES[4];
                  return CHART_MUTED;
                }}
                className="!rounded-xl !border !border-border !bg-card"
              />
            </ReactFlow>
          </ReactFlowProvider>
        ) : (
          <EmptyState
            icon={Bot}
            title="Nenhum agente cadastrado ainda"
            description="Crie um agente, escreva o prompt do sistema e vincule a um canal — ele passa a responder automaticamente."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Criar primeiro agente
              </Button>
            }
            className="h-full"
          />
        )}
      </div>

      <CreateAgentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />
      <EditAgentDialog
        agent={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}
