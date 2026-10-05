'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, RotateCcw } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { controlSmCls } from '@/components/ui/control';

interface ChatSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
}

interface SimMessage {
  from: 'bot' | 'user';
  text: string;
}

export function ChatSimulator({ nodes, edges, onClose }: ChatSimulatorProps) {
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [ended, setEnded] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const getNode = (id: string) => nodes.find((n) => n.id === id);
  const getEdgesFrom = (id: string) => edges.filter((e) => e.source === id);

  const processNode = (nodeId: string, userInput?: string) => {
    const node = getNode(nodeId);
    if (!node) { setEnded(true); return; }
    const data = node.data as Record<string, any>;
    const outEdges = getEdgesFrom(nodeId);

    switch (node.type) {
      case 'START': {
        const next = outEdges[0]?.target;
        if (next) setTimeout(() => processNode(next), 300);
        else setEnded(true);
        break;
      }
      case 'MESSAGE': {
        const text = (data.message || '').replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => variables[k] ?? `{{${k}}}`);
        setMessages((prev) => [...prev, { from: 'bot', text }]);
        const next = outEdges[0]?.target;
        if (next) setTimeout(() => processNode(next), 500);
        else setEnded(true);
        break;
      }
      case 'MENU': {
        if (!userInput) {
          const opts = data.options || [];
          const menuText = [data.title || 'Escolha:', '', ...opts.map((o: any, i: number) => `${i + 1}. ${o.label}`)].join('\n');
          setMessages((prev) => [...prev, { from: 'bot', text: menuText }]);
          setCurrentNodeId(nodeId);
          setWaitingForInput(true);
        } else {
          const opts = data.options || [];
          const idx = parseInt(userInput, 10) - 1;
          const sel = opts[idx] || opts.find((o: any) => o.label.toLowerCase() === userInput.toLowerCase());
          if (!sel) {
            setMessages((prev) => [...prev, { from: 'bot', text: 'Opção inválida. Tente novamente.' }]);
            setWaitingForInput(true);
          } else {
            setVariables((v) => ({ ...v, lastMenuSelection: sel.value }));
            const matchEdge = outEdges.find((e) => e.sourceHandle === `output-${opts.indexOf(sel)}`);
            const next = matchEdge?.target || outEdges[0]?.target;
            if (next) setTimeout(() => processNode(next), 300);
            else setEnded(true);
          }
        }
        break;
      }
      case 'CONDITION': {
        const actual = String(variables[data.variable] ?? '');
        let result = false;
        if (data.operator === 'equals') result = actual === data.value;
        else if (data.operator === 'contains') result = actual.includes(data.value);
        const next = result ? outEdges[0]?.target : (outEdges[1]?.target || outEdges[0]?.target);
        if (next) setTimeout(() => processNode(next), 200);
        else setEnded(true);
        break;
      }
      case 'WAIT': {
        if (!userInput) {
          if (data.prompt) setMessages((prev) => [...prev, { from: 'bot', text: data.prompt }]);
          setCurrentNodeId(nodeId);
          setWaitingForInput(true);
        } else {
          if (data.saveAs) setVariables((v) => ({ ...v, [data.saveAs]: userInput }));
          const next = outEdges[0]?.target;
          if (next) setTimeout(() => processNode(next), 300);
          else setEnded(true);
        }
        break;
      }
      case 'TRANSFER': {
        setMessages((prev) => [...prev, { from: 'bot', text: data.message || 'Transferindo para atendente...' }]);
        setEnded(true);
        break;
      }
      case 'END_FLOW': {
        setEnded(true);
        break;
      }
    }
  };

  const start = () => {
    setMessages([]);
    setVariables({});
    setEnded(false);
    setWaitingForInput(false);
    const startNode = nodes.find((n) => n.type === 'START');
    if (startNode) processNode(startNode.id);
  };

  useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !waitingForInput || !currentNodeId) return;
    setMessages((prev) => [...prev, { from: 'user', text: input.trim() }]);
    setWaitingForInput(false);
    const nodeId = currentNodeId;
    setInput('');
    setTimeout(() => processNode(nodeId, input.trim()), 300);
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 flex h-[480px] max-h-[calc(100%-2rem)] w-[340px] max-w-[calc(100%-2rem)] flex-col rounded-2xl border border-border bg-card shadow-overlay">
      <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3">
        <span className="text-sm font-semibold text-primary-foreground">Simulador do bot</span>
        <div className="flex gap-1">
          <button type="button" onClick={start} aria-label="Recomeçar simulação" title="Recomeçar simulação" className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"><RotateCcw aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" onClick={onClose} aria-label="Fechar simulador" title="Fechar simulador" className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs ${
              msg.from === 'user'
                ? 'rounded-br-md bg-primary text-primary-foreground'
                : 'rounded-bl-md bg-muted text-foreground'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {ended && (
          <div className="py-2 text-center text-[11px] text-muted-foreground">— Fluxo encerrado —</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={!waitingForInput || ended}
            placeholder={ended ? 'Fluxo encerrado' : waitingForInput ? 'Digite…' : 'Aguarde o bot…'}
            aria-label="Sua resposta ao bot"
            className={`${controlSmCls} min-w-0 flex-1`}
          />
          <button
            onClick={handleSend}
            disabled={!waitingForInput || ended || !input.trim()}
            aria-label="Enviar"
            title="Enviar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Send aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
