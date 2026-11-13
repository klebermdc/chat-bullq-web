import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ShopperTabs } from './shopper-tabs';

describe('ShopperTabs', () => {
  const html = renderToStaticMarkup(<ShopperTabs value="ranking" onChange={() => {}} />);

  it('renderiza 4 abas (com Simulador) e só uma selecionada', () => {
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toContain('Simulador');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it('liga cada aba ao seu painel', () => {
    expect(html).toContain('id="shopper-tab-ranking"');
    expect(html).toContain('aria-controls="shopper-panel-ranking"');
  });
});
