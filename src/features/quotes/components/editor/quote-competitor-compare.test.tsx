// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDraftItem, type QuoteDraft, type QuoteDraftItem } from '../../lib/quote-draft';
import type { CompetitorComparison } from '../../types';
import { QuoteCompetitorCompare } from './quote-competitor-compare';
import { QuoteEditor } from './quote-editor';

const { compare } = vi.hoisted(() => ({ compare: vi.fn() }));
vi.mock('../../services/competitors.service', () => ({ competitorsService: { compare } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ITEM: QuoteDraftItem = {
  ...emptyDraftItem('k1'),
  provider: 'Disney',
  title: 'Ingresso 4 dias',
  startDate: '2026-12-10',
  adults: '2',
  total: '3.000,00',
};

const RESULT: CompetitorComparison = {
  checkedAt: '2026-11-22T17:05:00Z',
  stores: [
    { id: 'a', name: 'Loja Alfa', isEstimate: false },
    { id: 'b', name: 'Loja Beta', isEstimate: true },
    { id: 'c', name: 'Loja Gama', isEstimate: false },
  ],
  items: [
    {
      index: 0,
      title: 'Ingresso 4 dias',
      ourTotal: 3000,
      match: { name: 'Disney 4-Day Ticket', days: 4 },
      reason: null,
      offers: [
        { storeId: 'a', status: 'OK', total: 2900, cashTotal: 2800, maxInstallments: 10, isEstimate: false, diff: -100, diffPercent: -3.3 },
        { storeId: 'b', status: 'OK', total: 3200, cashTotal: null, maxInstallments: null, isEstimate: true, diff: 200, diffPercent: 6.7 },
        { storeId: 'c', status: 'UNAVAILABLE', total: null, cashTotal: null, maxInstallments: null, isEstimate: false, diff: null, diffPercent: null },
      ],
    },
    { index: 1, title: 'Hotel', ourTotal: 1500, match: null, reason: 'NO_DATE', offers: [] },
  ],
  summary: ['Loja Alfa está R$ 100,00 mais barata no item 1.'],
};

let container: HTMLDivElement;
let root: Root;

/** Texto da tela com espaço entre os blocos (textContent cola um no outro). */
function flat(): string {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) parts.push(node.textContent ?? '');
  return parts.join(' ').replace(/\s+/g, ' ');
}

async function render(items: QuoteDraftItem[], disabled = false) {
  await act(async () => {
    root.render(<QuoteCompetitorCompare draft={{ items }} currency="BRL" disabled={disabled} />);
  });
}

async function clickCompare() {
  const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Comparar com a concorrência'));
  await act(async () => {
    button?.click();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  compare.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('QuoteCompetitorCompare', () => {
  it('envia só os itens convertidos e mostra a tabela de lojas', async () => {
    // Arrange
    compare.mockResolvedValue(RESULT);
    await render([ITEM, { ...emptyDraftItem('k2'), title: ' Hotel ' }]);

    // Act
    await clickCompare();

    // Assert
    expect(compare).toHaveBeenCalledWith({
      items: [
        { provider: 'Disney', title: 'Ingresso 4 dias', startDate: '2026-12-10', adults: 2, children: 0, total: 3000 },
        { provider: '', title: 'Hotel', startDate: null, adults: 0, children: 0, total: 0 },
      ],
    });
    const text = flat();
    expect(text).toContain('Loja Alfa está R$ 100,00 mais barata no item 1.');
    expect(text).toContain('Comparado: Disney 4-Day Ticket');
    expect(text).toMatch(/Loja Alfa R\$\s2\.900,00 R\$\s100,00 mais barato \(3,3%\) Pix R\$\s2\.800,00 · até 10x/);
    expect(text).toMatch(/Loja Beta estimado a partir de R\$\s3\.200,00 R\$\s200,00 mais caro \(6,7%\)/);
    expect(text).toContain('Loja Gama Sem disponibilidade na data');
    expect(text).toContain('a partir de = menor preço publicado');
    expect(text).toContain('Consultado às 14:05');
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('item não comparado mostra o motivo', async () => {
    compare.mockResolvedValue(RESULT);
    await render([ITEM]);
    await clickCompare();
    expect(flat()).toContain('Sem data: preencha a data inicial para comparar.');
  });

  it('itens mudaram depois da comparação: avisa e mantém o resultado', async () => {
    // Arrange
    compare.mockResolvedValue(RESULT);
    await render([ITEM]);
    await clickCompare();
    expect(flat()).not.toContain('Os itens mudaram');

    // Act
    await render([{ ...ITEM, adults: '3' }]);

    // Assert
    expect(flat()).toContain('Os itens mudaram depois da comparação. Compare de novo.');
    expect(flat()).toContain('Loja Alfa');
  });

  it('erro da API vira mensagem amigável', async () => {
    compare.mockImplementationOnce(async () => {
      throw new Error('timeout');
    });
    await render([ITEM]);
    await clickCompare();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Não consegui comparar agora. Tente de novo em instantes.');
  });

  it('editor desabilitado desabilita o botão', async () => {
    await render([ITEM], true);
    const button = container.querySelector('button');
    expect(button?.disabled).toBe(true);
  });
});

describe('QuoteEditor — comparação com a concorrência', () => {
  const draft: QuoteDraft = {
    customerName: 'Ana',
    items: [ITEM],
    total: '3000,00',
    pixTotal: '',
    installmentsCount: '10',
    notes: '',
    storeUrl: '',
  };

  it('fica logo depois da comparação de fornecedores e antes dos totais', () => {
    const html = renderToStaticMarkup(
      <QuoteEditor draft={draft} currency="BRL" disabled={false} onChange={() => {}} supplierCompare={<p id="cmp">cmp</p>} />,
    );
    const panel = html.indexOf('quote-competitor-compare-title');
    expect(panel).toBeGreaterThan(html.indexOf('id="cmp"'));
    expect(panel).toBeLessThan(html.indexOf('id="quote-total"'));
  });

  it('aparece também na atualização da cotação', () => {
    const html = renderToStaticMarkup(<QuoteEditor draft={draft} currency="BRL" disabled={false} onChange={() => {}} mode="update" />);
    expect(html).toContain('Comparar com a concorrência');
  });
});
