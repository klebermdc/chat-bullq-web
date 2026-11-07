import { describe, expect, it } from 'vitest';
import { resolveLeadOrigin } from './lead-origin';

const cardWithTag = (name: string) =>
  ({ conversation: { tags: [{ tag: { name } }], channel: { type: 'WHATSAPP_OFFICIAL' } } }) as any;

describe('resolveLeadOrigin', () => {
  it('"Anúncio Meta" (CTWA e seletor) é origem anúncio', () => {
    expect(resolveLeadOrigin(cardWithTag('Anúncio Meta'))).toMatchObject({ key: 'AD', label: 'Anúncio Meta' });
  });

  it('a tag antiga "Anúncio" continua sendo anúncio', () => {
    expect(resolveLeadOrigin(cardWithTag('Anúncio')).key).toBe('AD');
  });

  it('"Site" é origem site', () => {
    expect(resolveLeadOrigin(cardWithTag('Site')).key).toBe('SITE');
  });
});
