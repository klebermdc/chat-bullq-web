import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyDraftItem, type QuoteDraft } from '../../lib/quote-draft';
import { QuoteEditor } from './quote-editor';

const draft: QuoteDraft = {
  customerName: 'Ana',
  items: [emptyDraftItem('k1')],
  total: '100,00',
  pixTotal: '',
  installmentsCount: '10',
  notes: '',
  storeUrl: 'https://loja.exemplo.com/carrinho/1',
};

describe('QuoteEditor — link da loja', () => {
  const html = renderToStaticMarkup(<QuoteEditor draft={draft} currency="BRL" disabled={false} onChange={() => {}} mode="update" />);

  it('mostra o campo com o texto de ajuda e o valor gravado', () => {
    expect(html).toContain('id="quote-store-url"');
    expect(html).toContain('Link da loja online (opcional)');
    expect(html).toContain('Caso você tenha um link da loja para esta cotação, coloque aqui.');
    expect(html).toContain('value="https://loja.exemplo.com/carrinho/1"');
  });

  it('é o último campo do formulário, depois da observação', () => {
    expect(html.indexOf('id="quote-store-url"')).toBeGreaterThan(html.indexOf('id="quote-notes"'));
    const afterStore = html.slice(html.indexOf('id="quote-store-url"'));
    expect(afterStore).not.toMatch(/<(input|textarea|select)\b/);
  });

  it('avisa que o cliente não vê', () => {
    expect(html).toMatch(/cliente não vê/);
  });
});

describe('QuoteEditor — adicionar item', () => {
  const render = (props: Partial<Parameters<typeof QuoteEditor>[0]> = {}) =>
    renderToStaticMarkup(<QuoteEditor draft={draft} currency="BRL" disabled={false} onChange={() => {}} mode="update" {...props} />);

  it('sempre oferece adicionar item manual', () => {
    expect(render()).toContain('Adicionar item manual');
  });

  it('com leitura de print disponível, mostra os dois botões', () => {
    const html = render({ onAddByPrint: () => {}, canAddPrints: true });
    expect(html).toContain('Adicionar item por print');
    expect(html).toContain('Adicionar item manual');
  });

  it('na atualização não promete colar ou arrastar print', () => {
    const html = render({ onAddByPrint: () => {}, canAddPrints: true });
    expect(html).not.toContain('Ctrl+V');
  });
});
