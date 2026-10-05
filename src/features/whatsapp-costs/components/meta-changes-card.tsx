'use client';

import { useId, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MD_UP_QUERY, useMediaQuery } from '../hooks/use-media-query';

// As ressalvas ("anuncia", "vem informando", "é uma estimativa") são de
// propósito: a tela mostra o que a Meta informa, não o que ela vai faturar.
const CHANGES = [
  'Desde 1º/07/2025 a Meta cobra por mensagem, não por conversa. Templates de marketing sempre são cobrados.',
  'A documentação da Meta anuncia que, a partir de 1º/10/2026, mensagens de atendimento (texto livre) e templates de utilidade dentro da janela de 24h passam a ser cobrados. Na documentação, atendimento custa o mesmo que utilidade.',
  'Mensagens para leads de anúncio (Click-to-WhatsApp) continuam grátis durante a gratuidade do anúncio. A documentação fala em 72 horas; desde 28/09/2026 a Meta vem informando 7 dias para esta conta.',
  'Os números desta tela vêm do que a Meta informa em cada mensagem entregue. O custo é uma estimativa: vale a fatura da Meta.',
];

const LINKS = [
  {
    label: 'Preços do WhatsApp Business',
    href: 'https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing',
  },
  {
    label: 'Cobrança de mensagens de atendimento',
    href: 'https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages',
  },
];

/** Cartão recolhível: fechado no celular e aberto no desktop, até a pessoa mexer. */
export function MetaChangesCard() {
  const panelId = useId();
  const isDesktop = useMediaQuery(MD_UP_QUERY);
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const isOpen = userChoice ?? isDesktop;

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card shadow-soft">
      <h2>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setUserChoice(!isOpen)}
          className={cn(
            'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left sm:px-5',
            'text-sm font-semibold text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          O que mudou na Meta
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
          />
        </button>
      </h2>
      <div id={panelId} hidden={!isOpen} className="border-t border-border px-4 py-4 sm:px-5">
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground marker:text-muted-foreground">
          {CHANGES.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
