'use client';

import { useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { nodeTypeLabel } from './node-types';
import { cn } from '@/lib/utils';

interface NodePropertiesPanelProps {
  node: Node;
  onUpdate: (id: string, data: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const inputCls = `${controlCls} w-full`;
const labelCls = 'mb-1 block text-xs font-medium text-muted-foreground';

export function NodePropertiesPanel({ node, onUpdate, onDelete, onClose }: NodePropertiesPanelProps) {
  const data = node.data as Record<string, any>;
  const update = useCallback(
    (key: string, value: any) => onUpdate(node.id, { ...data, [key]: value }),
    [node.id, data, onUpdate],
  );

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Propriedades</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar propriedades"
          title="Fechar"
          className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <Badge variant="neutral">{nodeTypeLabel(node.type)}</Badge>
        </div>

        {node.type === 'MESSAGE' && (
          <div>
            <label htmlFor="node-message" className={labelCls}>Mensagem</label>
            <textarea
              id="node-message"
              className={cn(inputCls, 'h-auto min-h-[80px] resize-y py-2')}
              value={data.message || ''}
              onChange={(e) => update('message', e.target.value)}
              placeholder="Olá {{name}}, como posso ajudar?"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Use {'{{variavel}}'} para inserir um valor salvo</p>
          </div>
        )}

        {node.type === 'MENU' && (
          <>
            <div>
              <label htmlFor="node-menu-title" className={labelCls}>Título do menu</label>
              <input id="node-menu-title" className={inputCls} value={data.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Escolha uma opção:" />
            </div>
            <div>
              <p className={labelCls}>Opções</p>
              {(data.options || []).map((opt: any, i: number) => (
                <div key={i} className="mt-1 flex gap-1">
                  <input
                    aria-label={`Opção ${i + 1}`}
                    className={`${controlCls} min-w-0 flex-1`}
                    value={opt.label}
                    onChange={(e) => {
                      const opts = [...(data.options || [])];
                      opts[i] = { ...opts[i], label: e.target.value };
                      update('options', opts);
                    }}
                    placeholder={`Opção ${i + 1}`}
                  />
                  <button
                    onClick={() => update('options', (data.options || []).filter((_: any, j: number) => j !== i))}
                    type="button"
                    aria-label={`Remover opção ${i + 1}`}
                    title="Remover opção"
                    className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  ><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button
                onClick={() => update('options', [...(data.options || []), { label: '', value: `opt_${Date.now()}` }])}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >+ Adicionar opção</button>
            </div>
          </>
        )}

        {node.type === 'CONDITION' && (
          <>
            <div>
              <label htmlFor="node-variable" className={labelCls}>Variável</label>
              <input id="node-variable" className={inputCls} value={data.variable || ''} onChange={(e) => update('variable', e.target.value)} placeholder="lastMenuSelection" />
            </div>
            <div>
              <label htmlFor="node-operator" className={labelCls}>Operador</label>
              <select id="node-operator" className={inputCls} value={data.operator || 'equals'} onChange={(e) => update('operator', e.target.value)}>
                <option value="equals">Igual a</option>
                <option value="not_equals">Diferente de</option>
                <option value="contains">Contém</option>
                <option value="gt">Maior que</option>
                <option value="lt">Menor que</option>
              </select>
            </div>
            <div>
              <label htmlFor="node-value" className={labelCls}>Valor</label>
              <input id="node-value" className={inputCls} value={data.value || ''} onChange={(e) => update('value', e.target.value)} />
            </div>
          </>
        )}

        {node.type === 'WAIT' && (
          <>
            <div>
              <label htmlFor="node-prompt" className={labelCls}>Mensagem de espera</label>
              <input id="node-prompt" className={inputCls} value={data.prompt || ''} onChange={(e) => update('prompt', e.target.value)} placeholder="Digite sua resposta…" />
            </div>
            <div>
              <label htmlFor="node-save-as" className={labelCls}>Salvar resposta em</label>
              <input id="node-save-as" className={inputCls} value={data.saveAs || ''} onChange={(e) => update('saveAs', e.target.value)} placeholder="lastInput" />
            </div>
          </>
        )}

        {node.type === 'TRANSFER' && (
          <div>
            <label htmlFor="node-transfer-message" className={labelCls}>Mensagem de transferência</label>
            <input id="node-transfer-message" className={inputCls} value={data.message || ''} onChange={(e) => update('message', e.target.value)} placeholder="Transferindo para um atendente…" />
          </div>
        )}

        {node.type !== 'START' && node.type !== 'END_FLOW' && (
          <div className="border-t border-border pt-4">
            <Button variant="destructive" className="w-full" onClick={() => onDelete(node.id)}>
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" /> Remover nó
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
