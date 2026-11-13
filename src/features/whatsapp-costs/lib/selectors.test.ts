import { describe, expect, it } from 'vitest';
import {
  describePerConversation,
  hasActivity,
  hasMarketingTemplates,
  marketingHint,
  marketingToServiceRatio,
  pickDefaultChannelId,
  resolveChannelId,
  sortCategoryRows,
  sortSenders,
  sortTemplates,
} from './selectors';
import { makeChannel, withCost } from './test-fixtures';

describe('pickDefaultChannelId', () => {
  it('abre no canal de maior custo', () => {
    const channels = [withCost('a', 10), withCost('b', 80), withCost('c', 30)];
    expect(pickDefaultChannelId(channels)).toBe('b');
  });

  it('ignora canal com erro quando há outro que respondeu', () => {
    const channels = [withCost('a', 5), withCost('b', 999, { status: 'error', error: 'falhou' })];
    expect(pickDefaultChannelId(channels)).toBe('a');
  });

  it('com todos em erro, abre no primeiro; sem canais, null', () => {
    const failed = { status: 'error' as const, error: 'falhou' };
    expect(pickDefaultChannelId([withCost('a', 0, failed), withCost('b', 0, failed)])).toBe('a');
    expect(pickDefaultChannelId([])).toBeNull();
  });
});

describe('resolveChannelId', () => {
  const channels = [withCost('a', 10), withCost('b', 80)];

  it('mantém o canal escolhido se ele ainda existe', () => {
    expect(resolveChannelId(channels, 'a')).toBe('a');
  });

  it('volta ao padrão quando o escolhido sumiu ou não há escolha', () => {
    expect(resolveChannelId(channels, 'z')).toBe('b');
    expect(resolveChannelId(channels, null)).toBe('b');
  });
});

describe('hasActivity', () => {
  it('conta cobradas e grátis', () => {
    expect(hasActivity(makeChannel())).toBe(false);
    expect(hasActivity(makeChannel({ totals: { cost: 0, billable: 0, free: 3, byCategory: [] } }))).toBe(true);
  });
});

describe('ordenação das tabelas', () => {
  it('categorias: cobradas por custo, depois grátis por volume, sem alterar a lista original', () => {
    const rows = [
      { category: 'SERVICE', type: 'FREE_CUSTOMER_SERVICE', volume: 10, cost: 0 },
      { category: 'SERVICE', type: 'REGULAR', volume: 900, cost: 31.5 },
      { category: 'SERVICE', type: 'FREE_ENTRY_POINT', volume: 50, cost: 0 },
      { category: 'MARKETING', type: 'REGULAR', volume: 200, cost: 64.34 },
    ];
    const snapshot = JSON.stringify(rows);

    const sorted = sortCategoryRows(rows).map((r) => `${r.category}/${r.type}`);

    expect(sorted).toEqual([
      'MARKETING/REGULAR',
      'SERVICE/REGULAR',
      'SERVICE/FREE_ENTRY_POINT',
      'SERVICE/FREE_CUSTOMER_SERVICE',
    ]);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it('vendedores: maior custo primeiro; empate decide o volume cobrado', () => {
    const base = { kind: 'agent' as const, conversations: 1, utility: 0 };
    const senders = [
      { ...base, name: 'Ana', service: 10, marketing: 0, cost: 1 },
      { ...base, name: 'Bia', service: 1, marketing: 3, cost: 5 },
      { ...base, name: 'Caio', service: 20, marketing: 0, cost: 1 },
    ];
    expect(sortSenders(senders).map((s) => s.name)).toEqual(['Bia', 'Caio', 'Ana']);
  });

  it('templates: maior custo primeiro; empate decide os envios', () => {
    const templates = [
      { name: 'a', category: 'UTILITY', sent: 5, cost: 0 },
      { name: 'b', category: 'MARKETING', sent: 2, cost: 9 },
      { name: 'c', category: null, sent: 9, cost: 0 },
    ];
    expect(sortTemplates(templates).map((t) => t.name)).toEqual(['b', 'c', 'a']);
  });
});

describe('dica de marketing', () => {
  it('reconhece template de marketing com envio', () => {
    expect(hasMarketingTemplates([{ name: 'x', category: 'MARKETING', sent: 3, cost: 1 }])).toBe(true);
    expect(hasMarketingTemplates([{ name: 'x', category: 'MARKETING', sent: 0, cost: 0 }])).toBe(false);
    expect(hasMarketingTemplates([{ name: 'x', category: 'UTILITY', sent: 3, cost: 1 }])).toBe(false);
  });

  it('calcula quantas respostas custa um template de marketing', () => {
    expect(marketingToServiceRatio({ SERVICE: 0.035, MARKETING: 0.3217 })).toBe(9);
    expect(marketingToServiceRatio({ MARKETING: 0.3217 })).toBeNull();
    expect(marketingToServiceRatio({ SERVICE: 0, MARKETING: 0.3217 })).toBeNull();
  });

  it('monta o texto com ou sem a proporção', () => {
    expect(marketingHint(9)).toBe(
      'Template de marketing custa ~9× uma resposta; se o texto for aviso/serviço, dá para recriar como Utilidade.',
    );
    expect(marketingHint(null)).toContain('custa bem mais que uma resposta');
  });
});

describe('describePerConversation', () => {
  it('descreve a conversa típica e os 10% mais longos', () => {
    const text = describePerConversation({ median: 4, p90: 12.5, max: 40, conversations: 230 });
    expect(text).toBe('Uma conversa típica gera 4 mensagens cobradas (10% passam de 12,5).');
  });

  it('usa singular para uma mensagem', () => {
    const text = describePerConversation({ median: 1, p90: 3, max: 5, conversations: 10 });
    expect(text).toBe('Uma conversa típica gera 1 mensagem cobrada (10% passam de 3).');
  });

  it('não diz nada sem conversas', () => {
    expect(describePerConversation(null)).toBeNull();
    expect(describePerConversation({ median: 0, p90: 0, max: 0, conversations: 0 })).toBeNull();
  });
});
