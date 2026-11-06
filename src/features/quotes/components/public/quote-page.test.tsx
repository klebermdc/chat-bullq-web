import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findQuoteFixture } from '../../fixtures/quote-fixtures';
import { QuotePage } from './quote-page';

describe('QuotePage — link da loja', () => {
  it('não mostra o link da loja nem se ele vier por engano na resposta', () => {
    const view = findQuoteFixture('dev-fixture-cotacao-completa')!;
    const storeUrl = 'https://loja.exemplo.com/carrinho/interno-123';
    const leaked = { ...view, quote: { ...view.quote, storeUrl } };

    const html = renderToStaticMarkup(<QuotePage view={leaked} pdfUrl="/x.pdf" now={new Date(view.createdAt)} />);

    expect(html).not.toContain(storeUrl);
    expect(html).not.toContain('loja.exemplo.com');
  });
});

describe('QuotePage — banners', () => {
  it('mostra o Planejador antes dos itens e o de Viagens depois do total', () => {
    const view = findQuoteFixture('dev-fixture-cotacao-completa')!;
    const html = renderToStaticMarkup(<QuotePage view={view} pdfUrl="/x.pdf" now={new Date(view.createdAt)} />);

    const planner = html.indexOf('qt-promo-planejador');
    const items = html.indexOf('O que está na sua cotação');
    const total = html.indexOf('Total da reserva');
    const travel = html.indexOf('qt-promo-viagens');
    expect(planner).toBeGreaterThan(-1);
    expect(planner).toBeLessThan(items);
    expect(total).toBeLessThan(travel);
    const lead = html.indexOf('Já começou a planejar a viagem?');
    expect(lead).toBeGreaterThan(-1);
    expect(lead).toBeLessThan(planner);
  });
});

describe('QuotePage — rodapé', () => {
  it('o logo Sendtur leva à página de venda (www), não ao sistema', () => {
    const view = findQuoteFixture('dev-fixture-cotacao-completa')!;
    const html = renderToStaticMarkup(<QuotePage view={view} pdfUrl="/x.pdf" now={new Date(view.createdAt)} />);
    expect(html).toContain('href="https://www.sendtur.com.br"');
    expect(html).not.toContain('href="https://sendtur.com.br"');
  });
});
