'use client';

import { useState } from 'react';
import { Database, Sparkles } from 'lucide-react';
import { CopilotChat } from '@/features/copilot/components/copilot-chat';
import { ConsultChat } from '@/features/copilot/components/consult-chat';
import { usePageTitle } from '@/components/layout/use-page-title';
import { useAuthStore } from '@/stores/auth-store';

type Mode = 'consult' | 'data';

const STAFF_ROLES = new Set(['OWNER', 'ADMIN']);
const STARTERS = [
  'Precisa de visto pro Canadá?',
  'Quais ingressos a gente vende?',
  'Como explico a diferença entre os parques?',
];

export default function CopilotoPage() {
  usePageTitle('Copiloto');
  const role = useAuthStore((s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? null);
  // Modo Dados lê o banco (vendas, funil): só Proprietário e Admin. A API também barra.
  const canSeeData = !!role && STAFF_ROLES.has(role);
  const [mode, setMode] = useState<Mode>('consult');
  const active = canSeeData ? mode : 'consult';

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <header className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <Sparkles className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Copiloto</h1>
          <p className="text-xs text-muted-foreground">
            {active === 'consult'
              ? 'Tire dúvidas com o conhecimento da Aline'
              : 'Assistente interno de vendas, clientes e funil'}
          </p>
        </div>
        {canSeeData && (
          <div role="tablist" aria-label="Modo do Copiloto" className="flex rounded-xl border border-border p-1">
            {(
              [
                { id: 'consult', label: 'Consulta', icon: Sparkles },
                { id: 'data', label: 'Dados', icon: Database },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active === id}
                onClick={() => setMode(id)}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${
                  active === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon aria-hidden="true" className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {active === 'consult' ? (
          <ConsultChat
            starters={STARTERS}
            intro={
              <>
                Oi! 👋 Pergunte sobre <b>produtos</b>, <b>regras de viagem</b> ou <b>como responder</b> um cliente.
                Dentro de uma conversa, clique com o botão direito na mensagem do cliente e escolha <b>Perguntar à IA</b>. Também dá para <b>anexar ou colar um print</b> (Ctrl+V).
              </>
            }
          />
        ) : (
          <CopilotChat embedded />
        )}
      </div>
    </div>
  );
}
