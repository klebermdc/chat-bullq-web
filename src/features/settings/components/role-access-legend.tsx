'use client';

import { useState } from 'react';

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

export function RoleAccessLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        O que cada cargo acessa <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Área</th>
                <th className="py-2 pr-4">Proprietário</th>
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2">Operador</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.area} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 pr-4">{r.area}</td>
                  <td className="py-2 pr-4">{r.owner}</td>
                  <td className="py-2 pr-4">{r.admin}</td>
                  <td className="py-2">{r.operador}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
