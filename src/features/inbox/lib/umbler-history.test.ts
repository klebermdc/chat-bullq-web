import { describe, expect, it } from 'vitest';
import {
  formatMonthYear,
  isUmblerConversationBoundary,
  isUmblerNewDay,
  mergeOlderUmblerPage,
  oldestUmblerCursor,
  umblerButtonLabel,
  umblerMediaKind,
  umblerSide,
} from './umbler-history';

/** Data local no meio do dia: não vira o dia trocando o fuso do teste. */
function localIso(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month, day, hour).toISOString();
}

describe('umblerSide', () => {
  it('mensagem do cliente vai pro lado de quem recebe', () => {
    expect(umblerSide('Contact')).toBe('received');
  });

  it('atendente e robô são o nosso lado', () => {
    expect(umblerSide('Member')).toBe('sent');
    expect(umblerSide('Bot')).toBe('sent');
  });

  it('ignora maiúsculas e minúsculas na origem', () => {
    expect(umblerSide('contact')).toBe('received');
  });

  it('origem desconhecida fica do nosso lado', () => {
    expect(umblerSide('Sistema')).toBe('sent');
  });
});

describe('mergeOlderUmblerPage', () => {
  it('coloca a página mais antiga na frente', () => {
    expect(mergeOlderUmblerPage([{ id: 'b' }], [{ id: 'a' }])).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  it('descarta mensagem repetida na emenda das páginas', () => {
    expect(
      mergeOlderUmblerPage([{ id: 'b' }, { id: 'c' }], [{ id: 'a' }, { id: 'b' }]),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('primeira página entra inteira na lista vazia', () => {
    expect(mergeOlderUmblerPage([], [{ id: 'a' }])).toEqual([{ id: 'a' }]);
  });
});

describe('oldestUmblerCursor', () => {
  it('usa data e id da mensagem mais antiga carregada', () => {
    expect(
      oldestUmblerCursor([
        { id: 'a', sentAt: '2025-01-01T10:00:00Z' },
        { id: 'b', sentAt: '2025-01-02T10:00:00Z' },
      ]),
    ).toEqual({ beforeAt: '2025-01-01T10:00:00Z', beforeId: 'a' });
  });

  it('lista vazia não tem cursor — pede a página mais recente', () => {
    expect(oldestUmblerCursor([])).toBeNull();
  });
});

describe('isUmblerConversationBoundary', () => {
  const messages = [
    { conversationId: 'c1' },
    { conversationId: 'c1' },
    { conversationId: 'c2' },
  ];

  it('a primeira mensagem sempre abre uma conversa', () => {
    expect(isUmblerConversationBoundary(messages, 0)).toBe(true);
  });

  it('não marca no meio da mesma conversa', () => {
    expect(isUmblerConversationBoundary(messages, 1)).toBe(false);
  });

  it('marca na troca de conversa', () => {
    expect(isUmblerConversationBoundary(messages, 2)).toBe(true);
  });
});

describe('isUmblerNewDay', () => {
  const messages = [
    { sentAt: localIso(2025, 2, 10, 9) },
    { sentAt: localIso(2025, 2, 10, 18) },
    { sentAt: localIso(2025, 2, 11, 9) },
  ];

  it('a primeira mensagem sempre abre um dia', () => {
    expect(isUmblerNewDay(messages, 0)).toBe(true);
  });

  it('mesmo dia não repete o separador', () => {
    expect(isUmblerNewDay(messages, 1)).toBe(false);
  });

  it('virou o dia, separador novo', () => {
    expect(isUmblerNewDay(messages, 2)).toBe(true);
  });
});

describe('formatMonthYear', () => {
  it('escreve mês por extenso e ano', () => {
    expect(formatMonthYear(localIso(2025, 2, 15))).toBe('março de 2025');
  });

  it('sem data ou data inválida não escreve nada', () => {
    expect(formatMonthYear(null)).toBeNull();
    expect(formatMonthYear('ontem')).toBeNull();
  });
});

describe('umblerButtonLabel', () => {
  it('mostra quantidade e desde quando', () => {
    expect(umblerButtonLabel(1234, localIso(2024, 10, 15))).toBe(
      'Ver histórico da Umbler · 1.234 mensagens desde novembro de 2024',
    );
  });

  it('singular quando é uma mensagem só', () => {
    expect(umblerButtonLabel(1, localIso(2024, 10, 15))).toBe(
      'Ver histórico da Umbler · 1 mensagem desde novembro de 2024',
    );
  });

  it('sem data mais antiga omite o "desde"', () => {
    expect(umblerButtonLabel(3, null)).toBe('Ver histórico da Umbler · 3 mensagens');
  });
});

describe('umblerMediaKind', () => {
  const file = { url: 'https://s3.example.com/a', name: null, mimeType: null };

  it('sem arquivo é texto', () => {
    expect(umblerMediaKind({ type: 'Image', file: null })).toBe('none');
  });

  it('reconhece os tipos da Umbler', () => {
    expect(umblerMediaKind({ type: 'Image', file })).toBe('image');
    expect(umblerMediaKind({ type: 'Sticker', file })).toBe('image');
    expect(umblerMediaKind({ type: 'Audio', file })).toBe('audio');
    expect(umblerMediaKind({ type: 'Video', file })).toBe('video');
    expect(umblerMediaKind({ type: 'File', file })).toBe('file');
  });

  it('tipo desconhecido usa o mimeType do arquivo', () => {
    expect(
      umblerMediaKind({ type: 'Outro', file: { ...file, mimeType: 'audio/ogg' } }),
    ).toBe('audio');
    expect(
      umblerMediaKind({ type: 'Outro', file: { ...file, mimeType: 'image/png' } }),
    ).toBe('image');
  });

  it('tipo desconhecido sem mimeType vira anexo', () => {
    expect(umblerMediaKind({ type: 'Outro', file })).toBe('file');
  });

  it('arquivo sem url é tratado como texto', () => {
    expect(umblerMediaKind({ type: 'Image', file: { ...file, url: '' } })).toBe('none');
  });
});
