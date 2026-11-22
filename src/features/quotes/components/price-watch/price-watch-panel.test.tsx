// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PriceWatchTrends } from '../../types';
import { PriceWatchPanel } from './price-watch-panel';

const { trends, setBasket, runNow } = vi.hoisted(() => ({ trends: vi.fn(), setBasket: vi.fn(), runNow: vi.fn() }));
vi.mock('../../services/competitors.service', () => ({ competitorsService: { trends, setBasket, runNow } }));
// Recharts mede o contêiner; no jsdom ele tem 0 px — o gráfico não importa aqui.
vi.mock('recharts', async (orig) => {
  const mod = await orig<typeof import('recharts')>();
  return { ...mod, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const LINK = 'https://reservas.orlandofastpass.com.br/pt/checkout/cesta1';
const TRENDS: PriceWatchTrends = {
  basketLink: LINK,
  lastDay: '2026-11-23',
  runs: [
    {
      day: '2026-11-23',
      checkedAt: '2026-11-23T08:00:00Z',
      basketLink: LINK,
      rates: [
        { code: 'JT', value: 6.04, label: null },
        { code: 'SC', value: 6.06, label: '20 nov 2026' },
      ],
    },
  ],
  items: [
    {
      key: 'sw',
      label: 'SEAWORLD ORLANDO · 1 dia',
      points: [
        {
          day: '2026-11-23',
          ours: 577.79,
          min: 554.66,
          minStoreName: 'American Top',
          avg: 600,
          cheaperCount: 5,
          storeCount: 44,
        },
      ],
    },
  ],
  beaters: [{ storeId: 'a', storeName: 'American Top', platform: 'JUST_TRAVEL', times: 11, avgDiffPercent: -4 }],
  platforms: [{ platform: 'SUNCOAST', avgDiffPercent: 3.1, storeCount: 56, samples: 300 }],
};

let container: HTMLDivElement;
let root: Root;
const text = () => (container.textContent ?? '').replace(/\s+/g, ' ');

async function render(canManage: boolean) {
  await act(async () => root.render(<PriceWatchPanel canManage={canManage} />));
}

beforeEach(() => {
  trends.mockReset().mockResolvedValue(TRENDS);
  setBasket.mockReset().mockResolvedValue(undefined);
  runNow.mockReset().mockResolvedValue({ saved: 900 });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('PriceWatchPanel', () => {
  it('mostra a cesta, a última coleta com o câmbio dos sites, a tendência, quem nos bate e as plataformas', async () => {
    // Act
    await render(false);

    // Assert
    expect(trends).toHaveBeenCalledWith(30);
    expect(text()).toContain('Última coleta: 23/11');
    expect(text()).toMatch(/JT R\$ 6,04/);
    expect(text()).toMatch(/SC R\$ 6,06/);
    expect(text()).toContain('SEAWORLD ORLANDO · 1 dia');
    expect(text()).toContain('American Top');
    expect(text()).toContain('11 vezes');
    expect(text()).toContain('SunCoast');
    expect(container.querySelector('input')).toBeNull();
  });

  it('ADM troca a cesta e recarrega', async () => {
    await render(true);
    const input = container.querySelector('input') as HTMLInputElement;
    const novo = 'https://reservas.orlandofastpass.com.br/pt/checkout/cesta2';

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, novo);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      (
        Array.from(container.querySelectorAll('button')).find(
          (b) => b.textContent === 'Salvar cesta',
        ) as HTMLButtonElement
      ).click();
    });

    expect(setBasket).toHaveBeenCalledWith(novo);
    expect(trends).toHaveBeenCalledTimes(2);
  });

  it('sem coleta ainda, explica o que vai aparecer', async () => {
    trends.mockResolvedValue({ ...TRENDS, lastDay: null, runs: [], items: [], beaters: [], platforms: [] });

    await render(false);

    expect(text()).toContain('Ainda não há coleta');
  });
});
