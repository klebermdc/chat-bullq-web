import { describe, expect, it } from 'vitest';
import {
  addDraftItem,
  appendPreviewToDraft,
  draftFromPreview,
  emptyDraftItem,
  removeDraftItem,
  sumDraftItems,
  updateDraftItem,
  validateQuoteDraft,
  MAX_QUOTE_ITEMS,
  type QuoteDraft,
} from './quote-draft';
import type { QuotePreview } from '../types';

let seq = 0;
const nextKey = () => `k${++seq}`;

const PREVIEW: QuotePreview = {
  preview: true,
  customerName: 'Maria Souza',
  quote: {
    currency: 'BRL',
    total: 17971.62,
    pixTotal: null,
    installments: { count: 10, value: 1797.16 },
    notes: null,
    items: [
      {
        provider: 'Universal Orlando Resort',
        title: 'Ingresso 2 Parques',
        startDate: '2027-01-01',
        endDate: '2027-01-01',
        description: 'Harry Potter',
        adults: 3,
        children: 1,
        priceAdult: 2500,
        priceChild: null,
        total: 9289.31,
        cancellationPolicy: null,
      },
      {
        provider: 'Walt Disney World Resort',
        title: '2 dias',
        startDate: '2027-01-05',
        endDate: '2027-01-06',
        description: null,
        adults: 3,
        children: 1,
        priceAdult: null,
        priceChild: null,
        total: 8682.31,
        cancellationPolicy: 'Não reembolsável',
      },
    ],
  },
};

function draft(): QuoteDraft {
  return draftFromPreview(PREVIEW, nextKey);
}

describe('draftFromPreview', () => {
  it('converte números para o formato digitável brasileiro', () => {
    const d = draft();

    expect(d.customerName).toBe('Maria Souza');
    expect(d.total).toBe('17971,62');
    expect(d.installmentsCount).toBe('10');
    expect(d.pixTotal).toBe('');
    expect(d.items[0]).toMatchObject({ adults: '3', total: '9289,31' });
    expect(d.items[0]).not.toHaveProperty('priceAdult');
    expect(d.items[0]).not.toHaveProperty('cancellationPolicy');
    expect(d.items[0].key).not.toBe(d.items[1].key);
  });

  it('parcelas: 10x quando o print não traz; acima de 10 vira 10', () => {
    const none = draftFromPreview({ ...PREVIEW, quote: { ...PREVIEW.quote, installments: null } }, nextKey);
    const twelve = draftFromPreview({ ...PREVIEW, quote: { ...PREVIEW.quote, installments: { count: 12, value: 1 } } }, nextKey);
    const six = draftFromPreview({ ...PREVIEW, quote: { ...PREVIEW.quote, installments: { count: 6, value: 1 } } }, nextKey);

    expect([none.installmentsCount, twelve.installmentsCount, six.installmentsCount]).toEqual(['10', '10', '6']);
  });
});

describe('sumDraftItems', () => {
  it('soma os totais dos itens em centavos exatos', () => {
    expect(sumDraftItems(draft())).toBe(17971.62);
  });

  it('ignora total vazio ou ilegível', () => {
    const base = draft();
    const empty = updateDraftItem(base, base.items[1].key, { total: '' });
    const garbage = updateDraftItem(base, base.items[1].key, { total: 'abc' });

    expect(sumDraftItems(empty)).toBe(9289.31);
    expect(sumDraftItems(garbage)).toBe(9289.31);
  });

  it('aceita "1.797,16" digitado', () => {
    const base = draft();
    const changed = updateDraftItem(base, base.items[1].key, { total: '1.000,50' });

    expect(sumDraftItems(changed)).toBe(10289.81);
  });
});

describe('adicionar e remover item', () => {
  it('adiciona um item vazio no fim sem mexer no original', () => {
    const base = draft();
    const next = addDraftItem(base, nextKey);

    expect(next.items).toHaveLength(3);
    expect(base.items).toHaveLength(2);
    expect(next.items[2]).toMatchObject({ provider: '', title: '', total: '', adults: '0' });
  });

  it('não passa de 10 itens', () => {
    let d = draft();
    for (let i = 0; i < 20; i++) d = addDraftItem(d, nextKey);

    expect(d.items).toHaveLength(MAX_QUOTE_ITEMS);
  });

  it('remove pelo key', () => {
    const base = draft();
    const next = removeDraftItem(base, base.items[0].key);

    expect(next.items.map((i) => i.title)).toEqual(['2 dias']);
    expect(base.items).toHaveLength(2);
  });

  it('não remove o último item', () => {
    const base = draft();
    const only = removeDraftItem(base, base.items[0].key);
    const final = removeDraftItem(only, only.items[0].key);

    expect(only.items).toHaveLength(1);
    expect(final.items).toHaveLength(1);
  });

  it('emptyDraftItem usa a chave dada', () => {
    expect(emptyDraftItem('abc').key).toBe('abc');
  });
});

describe('validateQuoteDraft', () => {
  it('rascunho lido do print vira o payload do contrato', () => {
    const result = validateQuoteDraft(draft(), 'BRL');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.customerName).toBe('Maria Souza');
    expect(result.value).not.toHaveProperty('validityHours');
    expect(result.value.quote).toEqual({
      ...PREVIEW.quote,
      items: PREVIEW.quote.items.map((i) => ({ ...i, priceAdult: null, priceChild: null, cancellationPolicy: null, hotelName: null, hotel: null })),
    });
  });

  it('nome em branco vai como null', () => {
    const result = validateQuoteDraft({ ...draft(), customerName: '  ' }, 'BRL');

    expect(result.ok && result.value.customerName).toBeNull();
  });

  it('fim vazio vira o mesmo dia do início', () => {
    const base = draft();
    const d = updateDraftItem(base, base.items[0].key, { endDate: '' });
    const result = validateQuoteDraft(d, 'BRL');

    expect(result.ok && result.value.quote.items[0].endDate).toBe('2027-01-01');
  });

  it('acusa campos obrigatórios e limites com o número do item', () => {
    const base = draft();
    const d = updateDraftItem(base, base.items[1].key, {
      provider: ' ',
      title: '',
      total: '0',
      adults: '25',
      startDate: '2027-01-06',
      endDate: '2027-01-05',
    });
    const result = validateQuoteDraft(d, 'BRL');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'Item 2: informe o fornecedor.',
      'Item 2: informe o produto.',
      'Item 2: a data final é antes da inicial.',
      'Item 2: adultos vai de 0 a 20.',
      'Item 2: informe o total do item (maior que zero).',
    ]);
  });

  it('total da reserva, Pix e parcelas', () => {
    const result = validateQuoteDraft(
      { ...draft(), total: '', pixTotal: 'abc', installmentsCount: '12' },
      'BRL',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'Informe o total da reserva (maior que zero).',
      'O valor no Pix não é um número válido.',
      'Parcelas: de 1 a 10x.',
    ]);
  });

  it('parcela é o total dividido, arredondada no centavo; vazio = sem parcelas', () => {
    const ten = validateQuoteDraft({ ...draft(), total: '17971,62', installmentsCount: '10' }, 'BRL');
    const three = validateQuoteDraft({ ...draft(), total: '1000', installmentsCount: '3' }, 'BRL');
    const none = validateQuoteDraft({ ...draft(), installmentsCount: '' }, 'BRL');

    expect(ten.ok && ten.value.quote.installments).toEqual({ count: 10, value: 1797.16 });
    expect(three.ok && three.value.quote.installments).toEqual({ count: 3, value: 333.33 });
    expect(none.ok && none.value.quote.installments).toBeNull();
  });

  it('textos acima do limite', () => {
    const base = draft();
    const d = updateDraftItem(
      { ...base, notes: 'x'.repeat(601), customerName: 'y'.repeat(61) },
      base.items[0].key,
      { description: 'z'.repeat(601) },
    );
    const result = validateQuoteDraft(d, 'BRL');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      'O nome do cliente passa de 60 caracteres.',
      'Item 1: a descrição passa de 600 caracteres.',
      'A observação passa de 600 caracteres.',
    ]);
  });

  it('data de fim sem início é erro', () => {
    const base = draft();
    const d = updateDraftItem(base, base.items[0].key, { startDate: '' });
    const result = validateQuoteDraft(d, 'BRL');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(['Item 1: informe a data de início.']);
  });
});

describe('appendPreviewToDraft', () => {
  const extra: QuotePreview = {
    ...PREVIEW,
    customerName: 'Outro Nome',
    quote: { ...PREVIEW.quote, total: 500, pixTotal: 480, installments: null, items: [{ ...PREVIEW.quote.items[0], title: 'Seguro', total: 500 }] },
  };

  it('junta os itens no fim, total vira a soma e o resto da edição fica', () => {
    const base = { ...draft(), customerName: 'Maria', notes: 'oi' };
    const next = appendPreviewToDraft(base, extra, nextKey);

    expect(next.items.map((i) => i.title)).toEqual(['Ingresso 2 Parques', '2 dias', 'Seguro']);
    expect(next.total).toBe('18471,62');
    expect(next.customerName).toBe('Maria');
    expect(next.notes).toBe('oi');
    expect(base.items).toHaveLength(2);
  });

  it('Pix soma só quando os dois lados têm; senão fica vazio', () => {
    expect(appendPreviewToDraft({ ...draft(), pixTotal: '17000,00' }, extra, nextKey).pixTotal).toBe('17480,00');
    expect(appendPreviewToDraft({ ...draft(), pixTotal: '' }, extra, nextKey).pixTotal).toBe('');
    expect(
      appendPreviewToDraft({ ...draft(), pixTotal: '17000,00' }, { ...extra, quote: { ...extra.quote, pixTotal: null } }, nextKey).pixTotal,
    ).toBe('');
  });

  it('não passa de 10 itens', () => {
    const many = { ...extra, quote: { ...extra.quote, items: Array.from({ length: 12 }, () => extra.quote.items[0]) } };

    expect(appendPreviewToDraft(draft(), many, nextKey).items).toHaveLength(10);
  });
});

describe('ficha do hotel no rascunho', () => {
  const hotel = {
    id: 'lp19e6f', name: 'Hyatt Regency Grand Cypress', stars: 4, address: null, summary: 'Resort com lago privado.',
    amenities: ['Wi-Fi grátis'], checkin: '16h', checkout: '11h', photos: ['https://static.cupid.travel/hotels/1.jpg'],
  };
  const withHotel = (summary: string): QuotePreview => ({
    ...PREVIEW,
    quote: { ...PREVIEW.quote, items: [{ ...PREVIEW.quote.items[0], hotelName: 'Hyatt', hotel: { ...hotel, summary } }] },
  });

  it('leva a ficha do print até o envio, com o resumo aparado', () => {
    const result = validateQuoteDraft(draftFromPreview(withHotel('  Resort com lago privado.  '), nextKey), 'BRL');
    expect(result.ok && result.value.quote.items[0].hotel).toEqual(hotel);
    expect(result.ok && result.value.quote.items[0].hotelName).toBe('Hyatt');
  });

  it('resumo vazio pede para escrever ou tirar o hotel', () => {
    const result = validateQuoteDraft(draftFromPreview(withHotel(' '), nextKey), 'BRL');
    expect(!result.ok && result.errors.join(' ')).toMatch(/Não é este hotel/);
  });
});
