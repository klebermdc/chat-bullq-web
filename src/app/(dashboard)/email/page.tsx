'use client';

import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { CampaignsView } from '@/features/email/components/campaigns-view';
import { SubscribersView } from '@/features/email/components/subscribers-view';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader, PageShell } from '@/components/layout/page-shell';

type Aba = 'campanhas' | 'destinatarios';

const ABAS: { key: Aba; label: string }[] = [
  { key: 'campanhas', label: 'Campanhas' },
  { key: 'destinatarios', label: 'Destinatários' },
];

const HEADERS: Record<Aba, { title: string; description: ReactNode }> = {
  campanhas: {
    title: 'Campanhas de email',
    description: 'Crie e acompanhe envios de email marketing para seus destinatários.',
  },
  destinatarios: {
    title: 'Destinatários de email',
    description: (
      <span className="block max-w-2xl">
        Quem se descadastra, tem o email recusado (endereço inválido) ou marca uma
        mensagem como spam nunca mais recebe email — isso é permanente e protege
        a reputação do remetente.
      </span>
    ),
  },
};

/**
 * Email numa página só: Campanhas e Destinatários dividem a mesma rota e
 * trocam por pílulas, em vez de serem dois destinos na sidebar.
 *
 * A aba vive na URL (`?aba=`) e não em estado local, pra que a pílula
 * escolhida sobreviva a reload e possa ser linkada. As sub-rotas de
 * campanha (/email/campanhas/<id>, /nova, /editar) continuam páginas
 * próprias — só a listagem veio pra cá.
 */
export default function EmailPage() {
  const searchParams = useSearchParams();
  const raw = searchParams.get('aba');
  const aba: Aba = raw === 'destinatarios' ? 'destinatarios' : 'campanhas';
  const header = HEADERS[aba];

  return (
    <PageShell>
      <PageHeader
        title={header.title}
        description={header.description}
        actions={
          aba === 'campanhas' ? (
            <Link href="/email/campanhas/nova" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nova campanha
            </Link>
          ) : undefined
        }
      />

      <nav className="mt-6 flex gap-2" aria-label="Seções de email">
        {ABAS.map((a) => (
          <Link
            key={a.key}
            href={`/email?aba=${a.key}`}
            aria-current={aba === a.key ? 'page' : undefined}
            className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              aba === a.key
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {a.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">{aba === 'campanhas' ? <CampaignsView /> : <SubscribersView />}</div>
    </PageShell>
  );
}
