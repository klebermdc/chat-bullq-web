import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_SUPPLIER_COMPARE, type SupplierCompareState } from '../../lib/supplier-compare';
import { emptyDraftItem, type QuoteDraft } from '../../lib/quote-draft';
import type { StoreOffer } from '../../types';
import { QuoteSupplierCompare } from './quote-supplier-compare';
import { QuoteEditor } from './quote-editor';

const OFFER: StoreOffer = { pixTotal: 9000, installmentsTotal: 10000, installmentsCount: 10 };
const render = (value: SupplierCompareState = EMPTY_SUPPLIER_COMPARE) =>
  renderToStaticMarkup(<QuoteSupplierCompare offer={OFFER} value={value} currency="BRL" disabled={false} onChange={() => {}} />);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('QuoteSupplierCompare', () => {
  it('mostra os dois fornecedores e os campos da Azul', () => {
    const html = render();
    expect(html).toContain('Comparar fornecedores');
    expect(html).toContain('Just Travel');
    expect(html).toContain('Azul');
    expect(html).toContain('Total em 10x na Azul');
    expect(html).toContain('Pix na Azul (opcional)');
    expect(html).toMatch(/cliente não vê/);
  });

  it('sem valor da Azul, a Just Travel fica marcada nos dois', () => {
    const t = text(render());
    expect(t).toMatch(/✓ Pix: R\$\s9\.000,00 · Just Travel/);
    expect(t).toMatch(/✓ 10x: R\$\s10\.000,00 · Just Travel/);
  });

  it('com 10x menor na Azul, marca a Azul no 10x', () => {
    const t = text(render({ ...EMPTY_SUPPLIER_COMPARE, azulInstallmentsTotal: '9.500,00' }));
    expect(t).toMatch(/✓ 10x: R\$\s9\.500,00 · Azul/);
    expect(t).toMatch(/✓ Pix: R\$\s9\.000,00 · Just Travel/);
  });

  it('os valores são botões de escolha, com o escolhido pressionado', () => {
    const html = render({ ...EMPTY_SUPPLIER_COMPARE, azulInstallmentsTotal: '9.500,00' });
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(2);
    expect(html).toContain('Usar o 10x da Azul');
  });
});

describe('QuoteEditor — comparação de fornecedores', () => {
  const draft: QuoteDraft = {
    customerName: 'Ana',
    items: [emptyDraftItem('k1')],
    total: '10000,00',
    pixTotal: '9000,00',
    installmentsCount: '10',
    notes: '',
    storeUrl: '',
  };

  it('fica logo acima dos totais quando existe', () => {
    const html = renderToStaticMarkup(
      <QuoteEditor draft={draft} currency="BRL" disabled={false} onChange={() => {}} supplierCompare={<p id="cmp">cmp</p>} />,
    );
    expect(html.indexOf('id="cmp"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="cmp"')).toBeLessThan(html.indexOf('id="quote-total"'));
  });

  it('sem comparação, nada muda', () => {
    const html = renderToStaticMarkup(<QuoteEditor draft={draft} currency="BRL" disabled={false} onChange={() => {}} />);
    expect(html).not.toContain('Comparar fornecedores');
  });
});
