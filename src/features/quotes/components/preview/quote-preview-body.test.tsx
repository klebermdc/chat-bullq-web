import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findQuoteFixture } from '../../fixtures/quote-fixtures';
import { draftFromPreview } from '../../lib/quote-draft';
import { previewFromDraft } from '../../lib/quote-preview-view';
import { QuotePreviewBody } from './quote-preview-body';

const NOW = new Date('2026-11-12T15:00:00.000Z');

/** Rascunho a partir da cotação completa das fixtures, com uma edição do atendente. */
function editedView() {
  const fixture = findQuoteFixture('dev-fixture-cotacao-completa')!;
  let seq = 0;
  const draft = draftFromPreview({ preview: true, quote: fixture.quote, customerName: fixture.customerName }, () => `k${++seq}`);
  const edited = { ...draft, items: draft.items.map((it, i) => (i === 0 ? { ...it, title: 'Ingresso editado pelo atendente' } : it)) };
  const result = previewFromDraft(edited, 'BRL', { now: NOW, sellerName: 'Ana Paula Ribeiro' });
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.view;
}

describe('QuotePreviewBody', () => {
  const render = (device: 'phone' | 'desktop' = 'phone') =>
    renderToStaticMarkup(<QuotePreviewBody view={editedView()} now={NOW} device={device} fontClassName="fonts" />);

  it('avisa que é prévia e que o cliente ainda não recebeu nada', () => {
    expect(render()).toContain('Prévia — o cliente ainda não recebeu nada');
  });

  it('mostra a página real com a edição do rascunho', () => {
    const html = render();
    expect(html).toContain('qt-page');
    expect(html).toContain('Ingresso editado pelo atendente');
    expect(html).toContain('Mariana');
    expect(html).toContain('A magia começa aqui!');
    expect(html).toContain('Cotação #nova');
  });

  it('não oferece o PDF (a cotação ainda não existe)', () => {
    expect(render()).not.toContain('Baixar PDF');
  });

  it('os botões do cliente ficam sem ação', () => {
    expect(render()).toContain('data-quote-preview="inert"');
  });

  it('no modo celular a página fica na largura de um telefone', () => {
    expect(render('phone')).toContain('max-w-[390px]');
    expect(render('desktop')).not.toContain('max-w-[390px]');
  });
});
