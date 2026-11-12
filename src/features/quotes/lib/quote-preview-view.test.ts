import { describe, expect, it } from 'vitest';
import { emptyDraftItem, validateQuoteDraft, type QuoteDraft } from './quote-draft';
import { PREVIEW_QUOTE_CODE, previewFromDraft } from './quote-preview-view';
import { QUOTE_COMPANY } from './quote-company';

const NOW = new Date('2026-11-12T15:00:00.000Z');

const draft: QuoteDraft = {
  customerName: 'Mariana Souza',
  items: [
    {
      ...emptyDraftItem('k1'),
      provider: 'Universal Orlando Resort',
      title: 'Ingresso 2 Parques 1 Dia',
      startDate: '2027-01-20',
      endDate: '2027-01-20',
      adults: '2',
      children: '1',
      total: '9.289,31',
    },
  ],
  total: '9.289,31',
  pixTotal: '8.900,00',
  installmentsCount: '10',
  notes: 'Valores para data marcada.',
  storeUrl: 'https://loja.exemplo.com/carrinho/interno-123',
};

describe('previewFromDraft', () => {
  it('monta a página com o rascunho atual, ativa e válida por 24h a partir de agora', () => {
    const result = previewFromDraft(draft, 'BRL', { now: NOW, sellerName: 'Ana Paula Ribeiro' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { view } = result;
    expect(view.status).toBe('ACTIVE');
    expect(view.code).toBe(PREVIEW_QUOTE_CODE);
    expect(view.customerName).toBe('Mariana Souza');
    expect(view.seller.name).toBe('Ana Paula Ribeiro');
    expect(view.createdAt).toBe(NOW.toISOString());
    expect(view.updatedAt).toBeNull();
    expect(view.expiresAt).toBe('2026-11-13T15:00:00.000Z');
    expect(view.quote.items[0].title).toBe('Ingresso 2 Parques 1 Dia');
    expect(view.quote.total).toBe(9289.31);
    expect(view.quote.pixTotal).toBe(8900);
    expect(view.quote.installments).toEqual({ count: 10, value: 928.93 });
  });

  it('usa os dados da empresa e o aviso de câmbio que a API manda para a página', () => {
    const result = previewFromDraft(draft, 'BRL', { now: NOW, sellerName: 'Ana' });

    if (!result.ok) throw new Error('rascunho deveria ser válido');
    expect(result.view.company).toEqual(QUOTE_COMPANY);
    expect(result.view.company?.tagline).toBe('A magia começa aqui!');
    expect(result.view.terms?.exchangeNotice).toMatch(/câmbio do dia/);
  });

  it('nunca leva o link da loja para a página', () => {
    const result = previewFromDraft(draft, 'BRL', { now: NOW, sellerName: 'Ana' });

    if (!result.ok) throw new Error('rascunho deveria ser válido');
    expect(JSON.stringify(result.view)).not.toContain('loja.exemplo.com');
  });

  it('sem nome do atendente, fala em nome da empresa (como a API)', () => {
    const result = previewFromDraft(draft, 'BRL', { now: NOW, sellerName: '  ' });

    if (!result.ok) throw new Error('rascunho deveria ser válido');
    expect(result.view.seller.name).toBe(QUOTE_COMPANY.name);
  });

  it('na atualização mantém o nº e a data de criação, e marca a atualização de agora', () => {
    const result = previewFromDraft(draft, 'BRL', {
      now: NOW,
      sellerName: 'Ana',
      code: '0152',
      createdAt: '2026-11-10T12:00:00.000Z',
    });

    if (!result.ok) throw new Error('rascunho deveria ser válido');
    expect(result.view.code).toBe('0152');
    expect(result.view.createdAt).toBe('2026-11-10T12:00:00.000Z');
    expect(result.view.updatedAt).toBe(NOW.toISOString());
    expect(result.view.expiresAt).toBe('2026-11-13T15:00:00.000Z');
  });

  it('rascunho inválido devolve os mesmos erros do botão de enviar', () => {
    const broken: QuoteDraft = { ...draft, total: '', items: [{ ...draft.items[0], provider: '' }] };

    const result = previewFromDraft(broken, 'BRL', { now: NOW, sellerName: 'Ana' });
    const expected = validateQuoteDraft(broken, 'BRL');

    expect(result.ok).toBe(false);
    if (result.ok || expected.ok) return;
    expect(result.errors).toEqual(expected.errors);
  });
});
