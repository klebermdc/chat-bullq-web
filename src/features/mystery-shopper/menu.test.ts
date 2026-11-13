import { describe, expect, it } from 'vitest';
import { withMysteryShopperItem } from './menu';

describe('withMysteryShopperItem', () => {
  const items = ['inbox', 'crm'];

  it('acrescenta o item quando liberado, sem mutar a lista', () => {
    expect(withMysteryShopperItem(items, true, 'oculto')).toEqual(['inbox', 'crm', 'oculto']);
    expect(items).toEqual(['inbox', 'crm']);
  });

  it('não acrescenta quando não liberado', () => {
    expect(withMysteryShopperItem(items, false, 'oculto')).toEqual(['inbox', 'crm']);
  });
});
