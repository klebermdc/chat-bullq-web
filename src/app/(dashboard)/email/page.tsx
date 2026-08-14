'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CampaignsView } from '@/features/email/components/campaigns-view';
import { SubscribersView } from '@/features/email/components/subscribers-view';

type Aba = 'campanhas' | 'destinatarios';

const ABAS: { key: Aba; label: string }[] = [
  { key: 'campanhas', label: 'Campanhas' },
  { key: 'destinatarios', label: 'Destinatários' },
];

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

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="px-6 pt-6">
        <div className="flex gap-2">
          {ABAS.map((a) => (
            <Link
              key={a.key}
              href={`/email?aba=${a.key}`}
              aria-current={aba === a.key ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                aba === a.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {aba === 'campanhas' ? <CampaignsView /> : <SubscribersView />}
    </div>
  );
}
