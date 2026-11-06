import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Proposal } from '@/features/proposals/types';
import { QuoteUpdateOffer } from './quote-update-offer';

const quote = { id: 'q1', kind: 'QUOTE', quoteNumber: 32 } as unknown as Proposal;
const render = (isPrintUpdate: boolean) =>
  renderToStaticMarkup(
    <QuoteUpdateOffer quote={quote} onUpdate={() => {}} isPrintUpdate={isPrintUpdate} onTogglePrintUpdate={() => {}} />,
  );

describe('QuoteUpdateOffer', () => {
  it('oferece atualizar no editor e atualizar com print', () => {
    const html = render(false);
    expect(html).toContain('Esta conversa já tem a cotação nº 0032.');
    expect(html).toContain('Atualizar cotação');
    expect(html).toContain('Atualizar com print');
    expect(html.indexOf('Atualizar cotação</button>')).toBeLessThan(html.indexOf('Atualizar com print'));
  });

  it('no modo print, explica colar ou anexar abaixo e permite voltar', () => {
    const html = render(true);
    expect(html).toContain('Atualizar a cotação nº 0032 com print');
    expect(html).toContain('Cole (Ctrl+V), arraste ou anexe abaixo o print novo.');
    expect(html).toContain('Voltar');
  });
});
