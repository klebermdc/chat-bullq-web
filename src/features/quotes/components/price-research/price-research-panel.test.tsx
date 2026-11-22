// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PriceResearchResult } from '../../types';
import { PriceResearchPanel } from './price-research-panel';

const { research } = vi.hoisted(() => ({ research: vi.fn() }));
vi.mock('../../services/competitors.service', () => ({ competitorsService: { research } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LINK = 'https://reservas.orlandofastpass.com.br/pt/checkout/abc123';

const RESULT: PriceResearchResult = {
  cart: {
    total: 1733.37,
    pixTotal: 1640.1,
    installments: { count: 10, value: 173.34 },
    itemCount: 1,
    comparedCount: 1,
  },
  comparison: {
    checkedAt: '2026-11-22T17:05:00Z',
    stores: [{ id: 'a', name: 'Loja Alfa', isEstimate: false, url: 'https://alfa.example/pt' }],
    items: [
      {
        index: 0,
        title: 'SEAWORLD 1 DIA',
        ourTotal: 1733.37,
        match: { name: 'SEAWORLD ORLANDO 1 E 2 DIAS', days: 1 },
        reason: null,
        offers: [
          {
            storeId: 'a',
            status: 'OK',
            total: 1700,
            cashTotal: 1600,
            maxInstallments: 12,
            isEstimate: false,
            diff: -33.37,
            diffPercent: -1.9,
          },
        ],
      },
    ],
    summary: ['SEAWORLD ORLANDO 1 E 2 DIAS: Loja Alfa está R$ 33,37 (1,9%) mais barata.'],
  },
};

let container: HTMLDivElement;
let root: Root;

const text = () => (container.textContent ?? '').replace(/\s+/g, ' ');
const input = () => container.querySelector('input') as HTMLInputElement;

function type(value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input(), value);
  input().dispatchEvent(new Event('input', { bubbles: true }));
}

async function submit() {
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  research.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PriceResearchPanel />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('PriceResearchPanel', () => {
  it('pesquisa o link do carrinho e mostra nosso total e a comparação', async () => {
    // Arrange
    research.mockResolvedValue(RESULT);

    // Act
    act(() => type(`  ${LINK}  `));
    await submit();

    // Assert
    expect(research).toHaveBeenCalledWith(LINK);
    expect(text()).toMatch(/Carrinho OFP.*R\$\s1\.733,37/);
    expect(text()).toContain('Loja Alfa está R$ 33,37 (1,9%) mais barata');
    expect(text()).toContain('SEAWORLD ORLANDO 1 E 2 DIAS');
  });

  it('não consulta com link que não é do carrinho da OFP', async () => {
    act(() => type('https://outra-loja.com/pt/checkout/x'));
    await submit();

    expect(research).not.toHaveBeenCalled();
    expect(text()).toContain('Não achei o link do carrinho');
  });

  it('mostra a mensagem da API quando a leitura falha', async () => {
    research.mockRejectedValue({ response: { data: { message: 'Não consegui ler o link da loja.' } } });

    act(() => type(LINK));
    await submit();

    expect(text()).toContain('Não consegui ler o link da loja.');
  });

  it('com muitas lojas, mostra as mais baratas primeiro e recolhe o resto', async () => {
    const stores = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      name: `Loja ${String(i).padStart(2, '0')}`,
      isEstimate: false,
    }));
    const offers = stores.map((st, i) => ({
      storeId: st.id,
      status: 'OK' as const,
      total: 2000 - i * 10,
      cashTotal: null,
      maxInstallments: 10,
      isEstimate: false,
      diff: 266.63 - i * 10,
      diffPercent: 1,
    }));
    research.mockResolvedValue({
      ...RESULT,
      comparison: { ...RESULT.comparison, stores, items: [{ ...RESULT.comparison.items[0], offers }] },
    });

    act(() => type(LINK));
    await submit();

    expect(text()).toContain('Ver todas as 12 lojas (+4)');
    expect(text().indexOf('Loja 11')).toBeLessThan(text().indexOf('Loja 10'));
    expect(text()).not.toContain('Loja 00');

    await act(async () => {
      (
        Array.from(container.querySelectorAll('button')).find((b) =>
          b.textContent?.startsWith('Ver todas'),
        ) as HTMLButtonElement
      ).click();
    });
    expect(text()).toContain('Loja 00');
  });

  it('o nome da loja abre a vitrine dela em outra aba', async () => {
    research.mockResolvedValue(RESULT);

    act(() => type(LINK));
    await submit();

    const link = Array.from(container.querySelectorAll('a')).find((a) => a.textContent?.includes('Loja Alfa'));
    expect(link?.getAttribute('href')).toBe('https://alfa.example/pt');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });
});
