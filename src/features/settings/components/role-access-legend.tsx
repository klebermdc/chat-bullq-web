'use client';

import { useState } from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Legenda estática (só leitura) de quem acessa o quê por cargo. Espelha o
 * feature-map do backend na mão — não lê permissions dinamicamente, é só
 * documentação visual pra quem está gerenciando membros.
 */
const ROWS: Array<{ area: string; owner: string; admin: string; operador: string }> = [
  { area: 'Inbox (conversas atribuídas)', owner: '✓', admin: '✓', operador: 'só as dele' },
  { area: 'Pipelines', owner: '✓', admin: '✓', operador: 'só os dele' },
  { area: 'Contatos', owner: '✓', admin: '✓', operador: '✓' },
  { area: 'Dashboard', owner: '✓', admin: '✓', operador: 'só a linha dele' },
  { area: 'Relatórios de Vendas', owner: '✓', admin: '✓', operador: 'só os dele' },
  { area: 'Ligar/desligar IA da conversa', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Ações em massa', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Excluir arquivo da Biblioteca', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Gerir funis e etapas', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Relatórios (CRM)', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Automações / Projetos / Inatividade', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Jarvis / Chatbot / Copiloto', owner: '✓', admin: '✓', operador: '—' },
  { area: 'Configurações (todas as abas)', owner: '✓', admin: '✓', operador: '—' },
];

const PANEL_ID = 'role-access-legend-panel';

/** "✓" e "—" viram ícone com texto para leitor de tela; o resto é texto. */
function AccessCell({ value }: { value: string }) {
  if (value === '✓') {
    return (
      <>
        <Check aria-hidden="true" className="h-4 w-4 text-success-ink" />
        <span className="sr-only">Tem acesso</span>
      </>
    );
  }
  if (value === '—') {
    return (
      <>
        <Minus aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">Sem acesso</span>
      </>
    );
  }
  return <span className="text-muted-foreground">{value}</span>;
}

export function RoleAccessLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>
          <span className="block text-sm font-medium text-foreground">O que cada cargo acessa</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Compare Proprietário, Admin e Operador antes de convidar alguém.
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={PANEL_ID} className="overflow-x-auto border-t border-border px-5 pb-4">
          <table aria-label="O que cada cargo acessa" className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="py-3 pr-4 font-medium">Área</th>
                <th scope="col" className="py-3 pr-4 font-medium">Proprietário</th>
                <th scope="col" className="py-3 pr-4 font-medium">Admin</th>
                <th scope="col" className="py-3 font-medium">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {ROWS.map((r) => (
                <tr key={r.area}>
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-foreground">{r.area}</th>
                  <td className="py-2 pr-4"><AccessCell value={r.owner} /></td>
                  <td className="py-2 pr-4"><AccessCell value={r.admin} /></td>
                  <td className="py-2"><AccessCell value={r.operador} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
