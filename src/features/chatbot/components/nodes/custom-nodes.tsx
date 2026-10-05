'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import { NODE_TYPE_META } from '../node-types';

const { START, MESSAGE, MENU, CONDITION, WAIT, TRANSFER, END_FLOW } = NODE_TYPE_META;

// Mesmos operadores do painel de propriedades, em texto corrido.
const OPERATOR_LABELS: Record<string, string> = {
  equals: 'igual a',
  not_equals: 'diferente de',
  contains: 'contém',
  gt: 'maior que',
  lt: 'menor que',
};

export const StartNode = memo(({ selected }: NodeProps) => (
  <BaseNode label={START.label} icon={START.icon} color={START.color} selected={selected} hasInput={false}>
    <p className="italic opacity-60">Ponto de entrada do fluxo</p>
  </BaseNode>
));
StartNode.displayName = 'StartNode';

export const MessageNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode label={MESSAGE.label} icon={MESSAGE.icon} color={MESSAGE.color} selected={selected}>
    <p className="line-clamp-2">{(data as any).message || 'Texto da mensagem…'}</p>
  </BaseNode>
));
MessageNode.displayName = 'MessageNode';

export const MenuNode = memo(({ data, selected }: NodeProps) => {
  const options = (data as any).options || [];
  return (
    <BaseNode label={MENU.label} icon={MENU.icon} color={MENU.color} selected={selected} outputCount={Math.max(options.length, 1)}>
      <p className="font-medium text-foreground">{(data as any).title || 'Menu de opções'}</p>
      {options.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {options.map((opt: any, i: number) => (
            <li key={i} className="flex items-center gap-1">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular-nums text-foreground">{i + 1}</span>
              <span className="truncate">{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </BaseNode>
  );
});
MenuNode.displayName = 'MenuNode';

export const ConditionNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode label={CONDITION.label} icon={CONDITION.icon} color={CONDITION.color} selected={selected} outputCount={2}>
    <p>{(data as any).variable || 'variável'} {OPERATOR_LABELS[(data as any).operator] ?? (data as any).operator ?? 'igual a'} {(data as any).value || '?'}</p>
    <div className="mt-1 flex gap-2 text-[11px]">
      <span className="rounded bg-success-wash px-1 text-success-ink">Sim ↓</span>
      <span className="rounded bg-urgent-wash px-1 text-urgent-ink">Não ↓</span>
    </div>
  </BaseNode>
));
ConditionNode.displayName = 'ConditionNode';

export const WaitNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode label={WAIT.label} icon={WAIT.icon} color={WAIT.color} selected={selected}>
    <p>{(data as any).prompt || 'Aguardando resposta do usuário…'}</p>
    {(data as any).saveAs && <p className="mt-1 opacity-50">Salvar em: {(data as any).saveAs}</p>}
  </BaseNode>
));
WaitNode.displayName = 'WaitNode';

export const TransferNode = memo(({ data, selected }: NodeProps) => (
  <BaseNode label={TRANSFER.label} icon={TRANSFER.icon} color={TRANSFER.color} selected={selected} hasOutput={false}>
    <p>{(data as any).message || 'Transferindo para atendente…'}</p>
  </BaseNode>
));
TransferNode.displayName = 'TransferNode';

export const EndNode = memo(({ selected }: NodeProps) => (
  <BaseNode label={END_FLOW.label} icon={END_FLOW.icon} color={END_FLOW.color} selected={selected} hasOutput={false}>
    <p className="italic opacity-60">Fluxo encerrado</p>
  </BaseNode>
));
EndNode.displayName = 'EndNode';

export const nodeTypes = {
  START: StartNode,
  MESSAGE: MessageNode,
  MENU: MenuNode,
  CONDITION: ConditionNode,
  WAIT: WaitNode,
  TRANSFER: TransferNode,
  END_FLOW: EndNode,
};
