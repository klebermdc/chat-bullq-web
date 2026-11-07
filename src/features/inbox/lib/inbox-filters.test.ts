import { describe, expect, it } from 'vitest';
import {
  ASSIGNEE_ME,
  ASSIGNEE_NONE,
  DEFAULT_FILTERS,
  countActiveFilters,
  cycleTag,
  pruneUnknownTags,
  tagFilterState,
  toggleListItem,
  describeActiveFilters,
  filtersFromPreferences,
  filtersKey,
  filtersToParams,
  sameFilters,
  type FilterContext,
  type InboxFilterState,
} from './inbox-filters';

const NOW = new Date('2026-11-07T15:30:00.000Z');

function ctx(overrides: Partial<FilterContext> = {}): FilterContext {
  return {
    currentUserId: 'me-1',
    viewId: null,
    isSearching: false,
    now: NOW,
    channelTypes: null,
    ...overrides,
  };
}

function withFilters(patch: Partial<InboxFilterState>): InboxFilterState {
  return { ...DEFAULT_FILTERS, ...patch };
}

describe('DEFAULT_FILTERS', () => {
  it('começa só com individuais e nada mais ativo', () => {
    // Arrange / Act
    const count = countActiveFilters(DEFAULT_FILTERS);

    // Assert
    expect(DEFAULT_FILTERS.individualOnly).toBe(true);
    expect(DEFAULT_FILTERS.groupsOnly).toBe(false);
    expect(count).toBe(0);
  });
});

describe('countActiveFilters', () => {
  it('conta uma por etiqueta e uma por tipo de filtro', () => {
    // Arrange
    const state = withFilters({
      tagIds: ['t1', 't2'],
      excludeTagIds: ['t3'],
      unreadOnly: true,
      origin: 'ad',
    });

    // Act
    const count = countActiveFilters(state);

    // Assert
    expect(count).toBe(5);
  });

  it('conta Individual/Grupo só quando foge do padrão', () => {
    expect(countActiveFilters(withFilters({ individualOnly: false }))).toBe(1);
    expect(countActiveFilters(withFilters({ groupsOnly: true }))).toBe(1);
  });

  it('não conta "Data de" sozinho, sem intervalo escolhido', () => {
    expect(countActiveFilters(withFilters({ dateField: 'created' }))).toBe(0);
  });
});

describe('filtersToParams', () => {
  it('no inbox padrão sem filtros esconde arquivadas e grupos', () => {
    // Act
    const params = filtersToParams(DEFAULT_FILTERS, ctx());

    // Assert
    expect(params).toEqual({ archived: 'exclude', groups: 'exclude' });
  });

  it('abre arquivadas durante a busca e mantém "only" quando marcado', () => {
    expect(filtersToParams(DEFAULT_FILTERS, ctx({ isSearching: true })).archived).toBe('any');
    expect(
      filtersToParams(withFilters({ archivedOnly: true }), ctx({ isSearching: true })).archived,
    ).toBe('only');
  });

  it('dentro de view não manda archived nem groups=exclude', () => {
    // Act
    const params = filtersToParams(DEFAULT_FILTERS, ctx({ viewId: 'v1' }));

    // Assert
    expect(params.archived).toBeUndefined();
    expect(params.groups).toBeUndefined();
  });

  it('dentro de view só sobrescreve para grupos', () => {
    const params = filtersToParams(
      withFilters({ individualOnly: false, groupsOnly: true }),
      ctx({ viewId: 'v1' }),
    );
    expect(params.groups).toBe('only');
  });

  it('nenhum dos dois marcados mostra tudo', () => {
    const params = filtersToParams(withFilters({ individualOnly: false }), ctx());
    expect(params.groups).toBeUndefined();
  });

  it('setor força grupos e ignora o canal', () => {
    // Arrange
    const state = withFilters({ segmentId: 's1', channelIds: ['c1'] });

    // Act
    const params = filtersToParams(state, ctx({ channelTypes: 'INSTAGRAM' }));

    // Assert
    expect(params.segmentId).toBe('s1');
    expect(params.groups).toBe('only');
    expect(params.channelId).toBeUndefined();
    expect(params.channelTypes).toBeUndefined();
  });

  it('projeto força grupos e resolve "Meus projetos" para o usuário', () => {
    const params = filtersToParams(
      withFilters({ projectStatus: 'Ativo', mineProjects: true }),
      ctx(),
    );
    expect(params).toMatchObject({
      projectStatus: 'Ativo',
      responsibleUserId: 'me-1',
      groups: 'only',
    });
  });

  it('um canal vai como channelId, vários como channelIds', () => {
    expect(filtersToParams(withFilters({ channelIds: ['c1'] }), ctx()).channelId).toBe('c1');
    const many = filtersToParams(withFilters({ channelIds: ['c1', 'c2'] }), ctx());
    expect(many.channelIds).toBe('c1,c2');
    expect(many.channelId).toBeUndefined();
  });

  it('repassa channelTypes da página', () => {
    expect(filtersToParams(DEFAULT_FILTERS, ctx({ channelTypes: 'INSTAGRAM' })).channelTypes).toBe(
      'INSTAGRAM',
    );
  });

  it('resolve "Eu" e "Sem atendente" no atendente', () => {
    // Arrange
    const state = withFilters({ assignees: [ASSIGNEE_ME, ASSIGNEE_NONE, 'u2'] });

    // Act
    const params = filtersToParams(state, ctx());

    // Assert
    expect(params.assignedToId).toBe('me-1,none,u2');
  });

  it('descarta "Eu" quando não há usuário logado', () => {
    const params = filtersToParams(withFilters({ assignees: [ASSIGNEE_ME] }), ctx({ currentUserId: null }));
    expect(params.assignedToId).toBeUndefined();
  });

  it('dentro de view só manda atendente quando é um usuário só', () => {
    const multi = filtersToParams(
      withFilters({ assignees: [ASSIGNEE_NONE, 'u2'] }),
      ctx({ viewId: 'v1' }),
    );
    const single = filtersToParams(withFilters({ assignees: ['u2'] }), ctx({ viewId: 'v1' }));
    expect(multi.assignedToId).toBeUndefined();
    expect(single.assignedToId).toBe('u2');
  });

  it('manda vários status, etiquetas, exclusões e etapas', () => {
    // Arrange
    const state = withFilters({
      statuses: ['OPEN', 'WAITING'],
      tagIds: ['t1', 't2'],
      tagMatch: 'all',
      excludeTagIds: ['t3'],
      stageIds: ['st1'],
    });

    // Act
    const params = filtersToParams(state, ctx());

    // Assert
    expect(params).toMatchObject({
      status: 'OPEN,WAITING',
      tagIds: 't1,t2',
      tagMode: 'all',
      excludeTagIds: 't3',
      stageIds: 'st1',
    });
  });

  it('não manda tagMode sem etiquetas incluídas', () => {
    expect(filtersToParams(withFilters({ tagMatch: 'all' }), ctx()).tagMode).toBeUndefined();
  });

  it('só manda motivos de perda com "Só perdidas"', () => {
    const only = filtersToParams(withFilters({ lost: 'only', lostReasons: ['PRICE'] }), ctx());
    const excl = filtersToParams(withFilters({ lost: 'exclude', lostReasons: ['PRICE'] }), ctx());
    expect(only).toMatchObject({ lost: 'only', lostReasons: 'PRICE' });
    expect(excl.lost).toBe('exclude');
    expect(excl.lostReasons).toBeUndefined();
  });

  it('manda origem e horas parado', () => {
    const params = filtersToParams(withFilters({ origin: 'organic', idleHours: 24 }), ctx());
    expect(params).toMatchObject({ origin: 'organic', idleHours: '24' });
  });

  it('resolve 7 dias a partir de agora', () => {
    const params = filtersToParams(withFilters({ dateRange: '7D' }), ctx());
    expect(params.dateFrom).toBe('2026-10-31T15:30:00.000Z');
    expect(params.dateTo).toBeUndefined();
  });

  it('resolve o intervalo e manda dateField=created quando pedido', () => {
    // Arrange
    const state = withFilters({
      dateRange: 'RANGE',
      dateFrom: '2026-11-01',
      dateTo: '2026-11-05',
      dateField: 'created',
    });

    // Act
    const params = filtersToParams(state, ctx());

    // Assert
    expect(params.dateFrom).toBe(new Date('2026-11-01T00:00:00').toISOString());
    expect(params.dateTo).toBe(new Date('2026-11-05T23:59:59.999').toISOString());
    expect(params.dateField).toBe('created');
  });

  it('não manda dateField sem data', () => {
    expect(filtersToParams(withFilters({ dateField: 'created' }), ctx()).dateField).toBeUndefined();
  });

  it('manda unread=true', () => {
    expect(filtersToParams(withFilters({ unreadOnly: true }), ctx()).unread).toBe('true');
  });
});

describe('filtersFromPreferences', () => {
  it('sem nada salvo devolve o padrão', () => {
    expect(filtersFromPreferences({})).toEqual(DEFAULT_FILTERS);
  });

  it('migra as chaves antigas', () => {
    // Arrange
    const prefs = {
      selectedChannelId: 'c1',
      tagIds: ['t1'],
      selectedStatus: 'OPEN',
      selectedAssignedToId: '__ME__',
      dateRange: 'RANGE',
      dateFrom: '2026-11-01',
      dateTo: null,
      selectedProjectStatus: 'Ativo',
      mineProjects: true,
      unreadOnly: true,
      archivedOnly: false,
      showGroups: true,
    };

    // Act
    const state = filtersFromPreferences(prefs);

    // Assert
    expect(state).toMatchObject({
      channelIds: ['c1'],
      tagIds: ['t1'],
      statuses: ['OPEN'],
      assignees: [ASSIGNEE_ME],
      dateRange: 'RANGE',
      dateFrom: '2026-11-01',
      dateTo: '',
      projectStatus: 'Ativo',
      mineProjects: true,
      unreadOnly: true,
      individualOnly: false,
      groupsOnly: false,
    });
  });

  it('modelo de toggles independentes vence o showGroups antigo', () => {
    const state = filtersFromPreferences({ showGroups: true, groupsOnly: true });
    expect(state.individualOnly).toBe(false);
    expect(state.groupsOnly).toBe(true);
  });

  it('prefere o objeto novo e limpa valores inválidos', () => {
    // Arrange
    const prefs = {
      selectedChannelId: 'antigo',
      filters: {
        channelIds: ['c1', 42, 'c1', null],
        statuses: ['OPEN', 'HACK'],
        tagMatch: 'talvez',
        lost: 'only',
        lostReasons: ['PRICE', 'NOPE'],
        origin: 'ad',
        idleHours: -3,
        dateRange: 'ONTEM',
        dateFrom: '<script>',
        individualOnly: 'sim',
        segmentId: 7,
      },
    };

    // Act
    const state = filtersFromPreferences(prefs);

    // Assert
    expect(state.channelIds).toEqual(['c1']);
    expect(state.statuses).toEqual(['OPEN']);
    expect(state.tagMatch).toBe('any');
    expect(state.lost).toBe('only');
    expect(state.lostReasons).toEqual(['PRICE']);
    expect(state.origin).toBe('ad');
    expect(state.idleHours).toBeNull();
    expect(state.dateRange).toBe('ALL');
    expect(state.dateFrom).toBe('');
    expect(state.individualOnly).toBe(true);
    expect(state.segmentId).toBeNull();
  });

  it('ignora filters que não é objeto', () => {
    expect(filtersFromPreferences({ filters: 'oi' as never })).toEqual(DEFAULT_FILTERS);
  });
});

describe('sameFilters e filtersKey', () => {
  it('ignora a ordem das listas', () => {
    const a = withFilters({ tagIds: ['t1', 't2'], statuses: ['OPEN', 'CLOSED'] });
    const b = withFilters({ tagIds: ['t2', 't1'], statuses: ['CLOSED', 'OPEN'] });
    expect(sameFilters(a, b)).toBe(true);
    expect(filtersKey(a)).toBe(filtersKey(b));
  });

  it('diferencia estados diferentes', () => {
    expect(sameFilters(DEFAULT_FILTERS, withFilters({ unreadOnly: true }))).toBe(false);
  });
});

describe('describeActiveFilters', () => {
  const lookups = {
    channels: [{ id: 'c1', name: 'Vendas' }],
    segments: [{ id: 's1', name: 'Grupos VIP' }],
    members: [{ id: 'u2', name: 'Bárbara' }],
    tags: [
      { id: 't1', name: 'Quente', color: '#f00' },
      { id: 't3', name: 'VIP', color: '#0f0' },
    ],
    stages: [{ id: 'st1', name: 'Proposta' }],
  };

  it('gera rótulos em português para cada filtro', () => {
    // Arrange
    const state = withFilters({
      channelIds: ['c1'],
      assignees: [ASSIGNEE_NONE, 'u2'],
      excludeTagIds: ['t3'],
      stageIds: ['st1'],
      lost: 'only',
      lostReasons: ['PRICE'],
      origin: 'ad',
      idleHours: 24,
    });

    // Act
    const labels = describeActiveFilters(state, lookups).map((c) => c.label);

    // Assert
    expect(labels).toEqual(
      expect.arrayContaining([
        'Canal: Vendas',
        'Sem atendente',
        'Atendente: Bárbara',
        'Sem etiqueta: VIP',
        'Etapa: Proposta',
        'Venda perdida: Preço / fora do orçamento',
        'Veio de anúncio',
        'Parado há +24h',
      ]),
    );
  });

  it('mostra dias quando passa de 24h', () => {
    const [chip] = describeActiveFilters(withFilters({ idleHours: 72 }), lookups);
    expect(chip.label).toBe('Parado há +3 dias');
  });

  it('cada chip limpa só o próprio filtro, sem mexer no original', () => {
    // Arrange
    const state = withFilters({ tagIds: ['t1', 't3'], unreadOnly: true });
    const chips = describeActiveFilters(state, lookups);
    const tagChip = chips.find((c) => c.key === 'tag:t1');

    // Act
    const next = tagChip!.clear(state);

    // Assert
    expect(next.tagIds).toEqual(['t3']);
    expect(next.unreadOnly).toBe(true);
    expect(state.tagIds).toEqual(['t1', 't3']);
  });

  it('a quantidade de chips bate com countActiveFilters', () => {
    const state = withFilters({
      statuses: ['OPEN'],
      groupsOnly: true,
      dateRange: 'TODAY',
      projectStatus: 'Ativo',
    });
    expect(describeActiveFilters(state, lookups)).toHaveLength(countActiveFilters(state));
  });

  it('usa um rótulo genérico quando o item não existe mais', () => {
    const [chip] = describeActiveFilters(withFilters({ channelIds: ['sumiu'] }), lookups);
    expect(chip.label).toBe('Canal: selecionado');
  });
});

describe('toggleListItem e cycleTag', () => {
  it('liga e desliga um item sem mexer na lista original', () => {
    const list = ['a'];
    expect(toggleListItem(list, 'b')).toEqual(['a', 'b']);
    expect(toggleListItem(list, 'a')).toEqual([]);
    expect(list).toEqual(['a']);
  });

  it('etiqueta gira: nada → incluir → excluir → nada', () => {
    // Arrange
    const start = DEFAULT_FILTERS;

    // Act
    const included = cycleTag(start, 't1');
    const excluded = cycleTag(included, 't1');
    const cleared = cycleTag(excluded, 't1');

    // Assert
    expect(tagFilterState(included, 't1')).toBe('include');
    expect(included.tagIds).toEqual(['t1']);
    expect(tagFilterState(excluded, 't1')).toBe('exclude');
    expect(excluded.tagIds).toEqual([]);
    expect(excluded.excludeTagIds).toEqual(['t1']);
    expect(tagFilterState(cleared, 't1')).toBe('none');
    expect(cleared.excludeTagIds).toEqual([]);
  });

  it('volta para "qualquer uma" quando sobra menos de duas incluídas', () => {
    const state = withFilters({ tagIds: ['t1', 't2'], tagMatch: 'all' });
    expect(cycleTag(state, 't1').tagMatch).toBe('any');
  });
});

describe('pruneUnknownTags', () => {
  it('tira etiquetas apagadas das duas listas', () => {
    const state = withFilters({ tagIds: ['t1', 'velha'], excludeTagIds: ['outra'] });
    const next = pruneUnknownTags(state, new Set(['t1']));
    expect(next.tagIds).toEqual(['t1']);
    expect(next.excludeTagIds).toEqual([]);
  });

  it('devolve o mesmo objeto quando nada muda', () => {
    const state = withFilters({ tagIds: ['t1'] });
    expect(pruneUnknownTags(state, new Set(['t1']))).toBe(state);
  });
});
