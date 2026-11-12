import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { STORE_LINK_ERROR } from '../lib/store-link';
import { ProposalStoreLinkField } from './proposal-store-link-field';

const LINK = 'https://reservas.orlandofastpass.com.br/pt/checkout/abc123';
const render = (value: string, isBlockedByPrints = false) =>
  renderToStaticMarkup(
    <ProposalStoreLinkField value={value} disabled={false} isBlockedByPrints={isBlockedByPrints} onChange={() => {}} />,
  );

describe('ProposalStoreLinkField', () => {
  it('mostra o rótulo e aceita o texto todo da loja', () => {
    const html = render('');
    expect(html).toContain('Link da Just Travel (carrinho da loja)');
    expect(html).toContain('Pode colar o texto todo copiado da loja');
    expect(html).not.toContain(STORE_LINK_ERROR);
  });

  it('texto colado com o link: mostra o link encontrado', () => {
    const html = render(`Seu carrinho:\n${LINK}\n1x Magic Kingdom`);
    expect(html).toContain(`Link encontrado: ${LINK}`);
    expect(html).not.toContain('aria-invalid');
  });

  it('texto sem o link: erro na hora, ligado ao campo', () => {
    const html = render('Magic Kingdom R$ 900,00');
    expect(html).toContain(STORE_LINK_ERROR);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('proposal-store-link-error');
  });

  it('com print anexado, fica travado e explica por quê', () => {
    const html = render('', true);
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toContain('tire os prints anexados');
  });
});
