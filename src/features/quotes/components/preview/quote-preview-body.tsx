'use client';

import type { MouseEvent } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicQuoteView } from '../../types';
import { QuotePage } from '../public/quote-page';

export type PreviewDevice = 'phone' | 'desktop';

interface Props {
  view: PublicQuoteView;
  now: Date;
  device: PreviewDevice;
  /** Variáveis das fontes da página pública (vêm de `next/font`, fora dos testes). */
  fontClassName: string;
}

/**
 * Nenhum link da prévia sai da tela: o atendente não pode "fechar com ele
 * mesmo" no WhatsApp nem abrir os banners. O mouse já não alcança os links
 * (pointer-events); isto pega o Enter do teclado.
 */
function blockNavigation(event: MouseEvent<HTMLDivElement>) {
  if (event.target instanceof Element && event.target.closest('a')) event.preventDefault();
}

/**
 * A página que o cliente vai abrir, com o componente de verdade (`QuotePage`)
 * e a faixa de prévia por cima. Sem o contador de visitas e sem o PDF.
 */
export function QuotePreviewBody({ view, now, device, fontClassName }: Props) {
  return (
    <div>
      <p className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-warning-wash px-5 py-2.5 text-sm font-medium text-warning-ink">
        <Eye aria-hidden="true" className="h-4 w-4 shrink-0" />
        Prévia — o cliente ainda não recebeu nada
      </p>
      <div className={cn('bg-[#17133f]', device === 'phone' && 'px-4 py-6')}>
        <div
          data-quote-preview="inert"
          onClickCapture={blockNavigation}
          className={cn(
            'qt mx-auto [&_a]:pointer-events-none',
            fontClassName,
            device === 'phone' && 'max-w-[390px] overflow-hidden rounded-[28px] ring-4 ring-white/15',
          )}
        >
          <QuotePage view={view} pdfUrl={null} now={now} />
        </div>
      </div>
    </div>
  );
}
