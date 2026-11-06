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
