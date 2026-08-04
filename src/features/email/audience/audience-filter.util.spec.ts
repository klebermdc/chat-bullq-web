import { describe, it, expect } from 'vitest';
import {
  audienceFiltersEqual,
  emptyFilterFormState,
  filterFormStateFromFilter,
  isAudienceFilterEmpty,
  toAudienceFilterPayload,
} from './audience-filter.util';

describe('emptyFilterFormState', () => {
  it('começa com todos os campos vazios', () => {
    expect(emptyFilterFormState()).toEqual({
      tagIds: [],
      categories: [],
      suppliers: [],
      purchasedSince: '',
      purchasedUntil: '',
      minSpent: '',
      minOrders: '',
    });
  });
});

describe('toAudienceFilterPayload', () => {
  it('estado vazio vira filtro vazio — "toda a base inscrita"', () => {
    expect(toAudienceFilterPayload(emptyFilterFormState())).toEqual({});
  });

  it('inclui tagIds só quando há seleção', () => {
    expect(toAudienceFilterPayload({ ...emptyFilterFormState(), tagIds: ['t1', 't2'] })).toEqual({
      tagIds: ['t1', 't2'],
    });
  });

  it('inclui categorias selecionadas', () => {
    expect(
      toAudienceFilterPayload({ ...emptyFilterFormState(), categories: ['ingresso', 'hotel'] }),
    ).toEqual({ categories: ['ingresso', 'hotel'] });
  });

  it('normaliza fornecedores digitados — apara espaço e minusculiza', () => {
    expect(
      toAudienceFilterPayload({ ...emptyFilterFormState(), suppliers: [' Just Travel ', 'OFP'] }),
    ).toEqual({ suppliers: ['just travel', 'ofp'] });
  });

  it('descarta fornecedor vazio ou só espaço', () => {
    expect(
      toAudienceFilterPayload({ ...emptyFilterFormState(), suppliers: ['  ', 'ofp'] }),
    ).toEqual({ suppliers: ['ofp'] });
  });

  it('converte purchasedSince para o início do dia em ISO', () => {
    expect(
      toAudienceFilterPayload({ ...emptyFilterFormState(), purchasedSince: '2026-01-01' }),
    ).toEqual({ purchasedSince: '2026-01-01T00:00:00.000Z' });
  });

  it('converte purchasedUntil para o FIM do dia em ISO — dia inteiro incluído', () => {
    expect(
      toAudienceFilterPayload({ ...emptyFilterFormState(), purchasedUntil: '2026-06-30' }),
    ).toEqual({ purchasedUntil: '2026-06-30T23:59:59.999Z' });
  });

  it('ignora data em formato inválido em vez de mandar lixo pra API', () => {
    expect(
      toAudienceFilterPayload({ ...emptyFilterFormState(), purchasedSince: 'não é data' }),
    ).toEqual({});
  });

  it('converte minSpent em número', () => {
    expect(toAudienceFilterPayload({ ...emptyFilterFormState(), minSpent: '100.5' })).toEqual({
      minSpent: 100.5,
    });
  });

  it('descarta minSpent negativo — a API recusa', () => {
    expect(toAudienceFilterPayload({ ...emptyFilterFormState(), minSpent: '-5' })).toEqual({});
  });

  it('descarta minSpent não numérico', () => {
    expect(toAudienceFilterPayload({ ...emptyFilterFormState(), minSpent: 'abc' })).toEqual({});
  });

  it('converte minOrders em número inteiro', () => {
    expect(toAudienceFilterPayload({ ...emptyFilterFormState(), minOrders: '3' })).toEqual({
      minOrders: 3,
    });
  });

  it('descarta minOrders negativo', () => {
    expect(toAudienceFilterPayload({ ...emptyFilterFormState(), minOrders: '-1' })).toEqual({});
  });

  it('combina todos os critérios preenchidos ao mesmo tempo', () => {
    expect(
      toAudienceFilterPayload({
        tagIds: ['t1'],
        categories: ['ingresso'],
        suppliers: ['ofp'],
        purchasedSince: '2026-01-01',
        purchasedUntil: '2026-06-30',
        minSpent: '500',
        minOrders: '2',
      }),
    ).toEqual({
      tagIds: ['t1'],
      categories: ['ingresso'],
      suppliers: ['ofp'],
      purchasedSince: '2026-01-01T00:00:00.000Z',
      purchasedUntil: '2026-06-30T23:59:59.999Z',
      minSpent: 500,
      minOrders: 2,
    });
  });
});

describe('filterFormStateFromFilter', () => {
  it('filtro vazio ou nulo vira estado vazio', () => {
    expect(filterFormStateFromFilter({})).toEqual(emptyFilterFormState());
    expect(filterFormStateFromFilter(null)).toEqual(emptyFilterFormState());
    expect(filterFormStateFromFilter(undefined)).toEqual(emptyFilterFormState());
  });

  it('recupera arrays como estão', () => {
    const state = filterFormStateFromFilter({ tagIds: ['t1'], categories: ['hotel'] });
    expect(state.tagIds).toEqual(['t1']);
    expect(state.categories).toEqual(['hotel']);
  });

  it('recupera a data em ISO como só a parte do dia, para o <input type=date>', () => {
    const state = filterFormStateFromFilter({
      purchasedSince: '2026-01-01T00:00:00.000Z',
      purchasedUntil: '2026-06-30T23:59:59.999Z',
    });
    expect(state.purchasedSince).toBe('2026-01-01');
    expect(state.purchasedUntil).toBe('2026-06-30');
  });

  it('recupera números como texto', () => {
    const state = filterFormStateFromFilter({ minSpent: 500, minOrders: 2 });
    expect(state.minSpent).toBe('500');
    expect(state.minOrders).toBe('2');
  });

  it('é o inverso de toAudienceFilterPayload para um filtro que ele mesmo produziu', () => {
    const original = toAudienceFilterPayload({
      tagIds: ['t1'],
      categories: ['ingresso', 'hotel'],
      suppliers: ['ofp'],
      purchasedSince: '2026-01-01',
      purchasedUntil: '2026-06-30',
      minSpent: '500',
      minOrders: '2',
    });
    const roundTripped = toAudienceFilterPayload(filterFormStateFromFilter(original));
    expect(roundTripped).toEqual(original);
  });
});

describe('isAudienceFilterEmpty', () => {
  it('vazio é vazio', () => {
    expect(isAudienceFilterEmpty({})).toBe(true);
  });

  it('qualquer critério presente não é vazio', () => {
    expect(isAudienceFilterEmpty({ minSpent: 1 })).toBe(false);
  });
});

describe('audienceFiltersEqual', () => {
  it('dois filtros vazios são iguais', () => {
    expect(audienceFiltersEqual({}, {})).toBe(true);
  });

  it('mesma lista em ordem diferente ainda é igual — a ordem não é critério', () => {
    expect(
      audienceFiltersEqual({ categories: ['ingresso', 'hotel'] }, { categories: ['hotel', 'ingresso'] }),
    ).toBe(true);
  });

  it('valores diferentes não são iguais', () => {
    expect(audienceFiltersEqual({ minSpent: 100 }, { minSpent: 200 })).toBe(false);
  });

  it('um critério a mais já basta para não ser igual', () => {
    expect(audienceFiltersEqual({ minSpent: 100 }, { minSpent: 100, minOrders: 1 })).toBe(false);
  });
});
