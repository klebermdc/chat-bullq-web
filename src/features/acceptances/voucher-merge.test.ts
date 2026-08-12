import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergeVoucherItems, stripSource } from './voucher-merge';

describe('mergeVoucherItems', () => {
  it('mantém os itens do rascunho quando o voucher não traz nada', () => {
    const draft = [{ description: 'Magic Kingdom' }];

    expect(mergeVoucherItems(draft, [])).toEqual(draft);
  });

  it('a fonte de maior precedência sobrescreve os campos que ela traz', () => {
    const draft = [{ description: 'Magic Kingdom', qty: 2 }];
    const fromVoucher = [
      { description: 'magic  kingdom', qty: 3, ref: 'JTT-1', note: 'Válido até 31/12' },
    ];

    expect(mergeVoucherItems(draft, fromVoucher)).toEqual([
      {
        description: 'magic  kingdom',
        qty: 3,
        ref: 'JTT-1',
        note: 'Válido até 31/12',
        source: 'pdf',
      },
    ]);
  });

  it('trata acento e caixa como o mesmo item', () => {
    const draft = [{ description: 'Ingresso Único' }];
    const fromVoucher = [{ description: 'ingresso unico', qty: 1 }];

    expect(mergeVoucherItems(draft, fromVoucher)).toHaveLength(1);
  });

  it('não funde itens com a mesma descrição e datas diferentes', () => {
    const draft = [{ description: 'Universal', date: '14/09/2026' }];
    const fromVoucher = [{ description: 'Universal', date: '15/09/2026' }];

    expect(mergeVoucherItems(draft, fromVoucher)).toHaveLength(2);
  });

  it('acrescenta item novo preservando a ordem do rascunho primeiro', () => {
    const draft = [{ description: 'A' }];
    const fromVoucher = [{ description: 'B' }];

    expect(mergeVoucherItems(draft, fromVoucher).map((i) => i.description)).toEqual(['A', 'B']);
  });

  // Regressão: o cliente recebeu dois ingressos do mesmo parque no mesmo dia,
  // cada um com seu localizador, e assinou um aceite que mostrava só um deles.
  // Nenhum item do voucher pode ser engolido por outro item do voucher.
  it('preserva os dois localizadores quando o voucher traz o mesmo item duas vezes', () => {
    const draft = [{ description: 'Magic Kingdom', date: '15/09/2026' }];
    const fromVoucher = [
      { description: 'Magic Kingdom', date: '15/09/2026', ref: 'JTT-1' },
      { description: 'magic  kingdom', date: '15/09/2026', ref: 'JTT-2' },
    ];

    expect(mergeVoucherItems(draft, fromVoucher).map((i) => i.ref)).toEqual(['JTT-1', 'JTT-2']);
  });

  it('funde item sem data do rascunho com o item datado do voucher', () => {
    const draft = [{ description: 'Universal', qty: 2 }];
    const fromVoucher = [{ description: 'Universal', qty: 2, date: '15/09/2026', ref: 'UNI-9' }];

    expect(mergeVoucherItems(draft, fromVoucher)).toEqual([
      { description: 'Universal', qty: 2, date: '15/09/2026', ref: 'UNI-9', source: 'pdf' },
    ]);
  });

  it('mantém a ordem: rascunho primeiro, depois o resto do voucher na ordem original', () => {
    const draft = [{ description: 'A' }, { description: 'B' }];
    const fromVoucher = [
      { description: 'C' },
      { description: 'B', ref: 'B-1' },
      { description: 'D' },
    ];

    const merged = mergeVoucherItems(draft, fromVoucher);

    expect(merged.map((i) => i.description)).toEqual(['A', 'B', 'C', 'D']);
    expect(merged[1].ref).toBe('B-1');
  });

  it('não muta os arrays recebidos', () => {
    const draft = [{ description: 'A' }];
    const fromVoucher = [{ description: 'B' }];

    mergeVoucherItems(draft, fromVoucher);

    expect(draft).toEqual([{ description: 'A' }]);
    expect(fromVoucher).toEqual([{ description: 'B' }]);
  });

  it('devolve cópias: editar o item devolvido não escreve na entrada', () => {
    // Os três caminhos de saída: item do rascunho sem par, item que veio do
    // voucher por empate, e item novo do voucher. O retorno vai para um form
    // editável — nenhum deles pode ser a mesma referência da entrada.
    const draft = [{ description: 'A' }, { description: 'B' }];
    const fromVoucher = [
      { description: 'B', ref: 'B-1' },
      { description: 'C', ref: 'C-1' },
    ];

    const merged = mergeVoucherItems(draft, fromVoucher);
    expect(merged.map((i) => i.description)).toEqual(['A', 'B', 'C']);

    merged[0].description = 'A editado';
    merged[1].ref = 'B-editado';
    merged[2].ref = 'C-editado';

    expect(draft).toEqual([{ description: 'A' }, { description: 'B' }]);
    expect(fromVoucher).toEqual([
      { description: 'B', ref: 'B-1' },
      { description: 'C', ref: 'C-1' },
    ]);
  });

  it('marca o item novo com a fonte que o trouxe', () => {
    const merged = mergeVoucherItems([], [{ description: 'Universal' }], 'texto');

    expect(merged).toEqual([{ description: 'Universal', source: 'texto' }]);
  });
});

describe('mergeVoucherItems — mescla campo a campo', () => {
  // É este teste que justifica a mescla campo a campo existir. Antes, o item
  // do texto colado SUBSTITUÍA o do PDF e o localizador sumia do documento que
  // o cliente assina.
  it('o localizador lido do PDF sobrevive ao texto colado que não o traz', () => {
    const doPdf = mergeVoucherItems(
      [],
      [{ description: 'Magic Kingdom', ref: 'JTT-1', date: '15/09/2026' }],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      doPdf,
      [{ description: 'Magic Kingdom', qty: 2 }],
      'texto',
    );

    expect(comTexto).toHaveLength(1);
    expect(comTexto[0]).toMatchObject({
      description: 'Magic Kingdom',
      ref: 'JTT-1',
      date: '15/09/2026',
      qty: 2,
      source: 'texto',
    });
  });

  it('texto colado ganha do PDF no campo em que os dois falam', () => {
    const doPdf = mergeVoucherItems([], [{ description: 'Universal', qty: 3 }], 'pdf');

    const comTexto = mergeVoucherItems(doPdf, [{ description: 'Universal', qty: 2 }], 'texto');

    expect(comTexto[0].qty).toBe(2);
  });

  it('PDF que chega depois não sobrescreve o que o texto colado curou', () => {
    // A ordem em que o atendente mexe no modal não pode mudar quem manda:
    // colar o texto e SÓ ENTÃO anexar o PDF é um caminho normal.
    const doTexto = mergeVoucherItems(
      [],
      [{ description: 'Universal', qty: 2 }],
      'texto',
    );

    const comPdf = mergeVoucherItems(
      doTexto,
      [{ description: 'Universal', qty: 3, ref: 'UNI-9' }],
      'pdf',
    );

    // A fonte fraca perde o campo disputado, mas ainda preenche o que faltava.
    expect(comPdf[0]).toMatchObject({ qty: 2, ref: 'UNI-9', source: 'texto' });
  });

  it('PDF ganha do rascunho da Ficha do Pedido', () => {
    const daFicha = [{ description: 'Magic Kingdom', qty: 4 }];

    const comPdf = mergeVoucherItems(daFicha, [{ description: 'Magic Kingdom', qty: 2 }], 'pdf');

    expect(comPdf[0].qty).toBe(2);
  });

  it('campo vazio ou em branco nunca apaga um valor que já existe', () => {
    const base = mergeVoucherItems(
      [],
      [{ description: 'Magic Kingdom', ref: 'JTT-1', note: 'Válido até 31/12', qty: 2 }],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      base,
      [{ description: 'Magic Kingdom', ref: '   ', note: '', qty: undefined }],
      'texto',
    );

    expect(comTexto[0]).toMatchObject({
      ref: 'JTT-1',
      note: 'Válido até 31/12',
      qty: 2,
    });
  });

  it('atravessa campo que este módulo não conhece em vez de descartá-lo', () => {
    // As duas pontas sobem juntas, mas a API pode ganhar um campo novo antes
    // deste arquivo saber dele. Melhor deixar passar que sumir com o dado.
    const merged = mergeVoucherItems(
      [{ description: 'Universal' }],
      [{ description: 'Universal', gate: 'Portão 3' } as never],
      'texto',
    );

    expect(merged[0]).toMatchObject({ gate: 'Portão 3' });
  });
});

describe('mergeVoucherItems — passageiros', () => {
  it('o elenco é da fonte vencedora; a perdedora só completa o que falta', () => {
    const doPdf = mergeVoucherItems(
      [],
      [
        {
          description: 'Magic Kingdom',
          passengers: [
            { name: 'MARIA SILVA', birthDate: '10/03/1990' },
            { name: 'JOÃO SILVA', birthDate: '02/07/2015' },
          ],
        },
      ],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      doPdf,
      [
        {
          description: 'Magic Kingdom',
          passengers: [{ name: 'Maria Silva' }, { name: 'Joana Silva' }],
        },
      ],
      'texto',
    );

    // Duas listas para o mesmo item são duas VERSÕES do mesmo elenco: quem
    // manda é o texto (2 nomes, na grafia dele), não a união (que mostraria 3).
    expect(comTexto[0].passengers).toEqual([
      { name: 'Maria Silva', birthDate: '10/03/1990' },
      { name: 'Joana Silva' },
    ]);
  });

  it('a fonte perdedora ainda completa o nascimento que a vencedora não trouxe', () => {
    const doTexto = mergeVoucherItems(
      [],
      [{ description: 'Universal', passengers: [{ name: 'Maria Silva' }] }],
      'texto',
    );

    const comPdf = mergeVoucherItems(
      doTexto,
      [
        {
          description: 'Universal',
          passengers: [{ name: 'MARIA SILVA', birthDate: '10/03/1990' }],
        },
      ],
      'pdf',
    );

    expect(comPdf[0].passengers).toEqual([
      { name: 'Maria Silva', birthDate: '10/03/1990' },
    ]);
  });

  it('lista de passageiros vazia não apaga a que já existe', () => {
    const doPdf = mergeVoucherItems(
      [],
      [{ description: 'Universal', passengers: [{ name: 'Maria Silva' }] }],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      doPdf,
      [{ description: 'Universal', passengers: [] }],
      'texto',
    );

    expect(comTexto[0].passengers).toEqual([{ name: 'Maria Silva' }]);
  });

  it('devolve cópias dos passageiros: editar o resultado não escreve na entrada', () => {
    const fromVoucher = [
      { description: 'Universal', passengers: [{ name: 'Maria Silva' }] },
    ];

    const merged = mergeVoucherItems([{ description: 'Universal' }], fromVoucher, 'pdf');
    merged[0].passengers![0].name = 'editado';

    expect(fromVoucher[0].passengers).toEqual([{ name: 'Maria Silva' }]);
  });
});

/**
 * O modal mescla UMA VEZ POR FONTE: um `mergeVoucherItems` por PDF anexado (a
 * área de anexo aceita vários) e mais um para o texto colado. Cada chamada
 * isolada está certa — é a COSTURA entre elas que perdia dado, porque o consumo
 * por índice só protege itens que chegam na mesma leva.
 */
describe('mergeVoucherItems — sequência de mesclas (uma chamada por fonte)', () => {
  // Regressão: a operadora manda um voucher POR ARQUIVO, então dois PDFs do
  // mesmo parque no mesmo dia é o caso comum, não a exceção. O segundo casava
  // com o primeiro e sobrescrevia o localizador — o cliente assinava um aceite
  // com um dos dois ingressos faltando. É o mesmo incidente que o teste da
  // leva única cobre, entrando pela porta ao lado.
  it('dois PDFs em chamadas separadas: os dois localizadores sobrevivem', () => {
    const doPrimeiroPdf = mergeVoucherItems(
      [],
      [
        {
          description: 'Magic Kingdom',
          date: '15/09/2026',
          ref: 'JTT-1',
          passengers: [{ name: 'Maria Silva' }],
        },
      ],
      'pdf',
    );

    const doSegundoPdf = mergeVoucherItems(
      doPrimeiroPdf,
      [
        {
          description: 'magic  kingdom',
          date: '15/09/2026',
          ref: 'JTT-2',
          passengers: [{ name: 'João Silva' }],
        },
      ],
      'pdf',
    );

    expect(doSegundoPdf.map((i) => i.ref)).toEqual(['JTT-1', 'JTT-2']);
    expect(doSegundoPdf.map((i) => i.passengers?.map((p) => p.name))).toEqual([
      ['Maria Silva'],
      ['João Silva'],
    ]);
  });

  it('texto colado com outro localizador não engole o item do PDF', () => {
    const doPdf = mergeVoucherItems(
      [],
      [
        {
          description: 'Universal',
          date: '20/09/2026',
          ref: 'UNI-1',
          passengers: [{ name: 'Maria Silva' }],
        },
      ],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      doPdf,
      [
        {
          description: 'Universal',
          date: '20/09/2026',
          ref: 'UNI-2',
          passengers: [{ name: 'João Silva' }],
        },
      ],
      'texto',
    );

    // Vencer a disputa de um campo é uma coisa; engolir o ingresso do lado é
    // outra. Localizador diferente = ingresso diferente, e os dois foram
    // entregues.
    expect(comTexto).toHaveLength(2);
    expect(comTexto.map((i) => i.ref)).toEqual(['UNI-1', 'UNI-2']);
    expect(comTexto[0].passengers).toEqual([{ name: 'Maria Silva' }]);
  });

  it('mesmo localizador dos dois lados continua sendo UM item, mesclado campo a campo', () => {
    // O outro extremo: o mesmo ingresso lido duas vezes (o atendente anexou o
    // PDF e colou o texto do MESMO voucher) não pode virar linha duplicada.
    const doPdf = mergeVoucherItems(
      [],
      [{ description: 'Universal', date: '20/09/2026', ref: 'UNI-9', note: 'Portão 3' }],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      doPdf,
      [
        {
          description: 'Universal',
          date: '20/09/2026',
          ref: 'UNI-9',
          qty: 2,
          passengers: [{ name: 'Maria Silva' }],
        },
      ],
      'texto',
    );

    expect(comTexto).toHaveLength(1);
    expect(comTexto[0]).toMatchObject({
      ref: 'UNI-9',
      note: 'Portão 3',
      qty: 2,
      passengers: [{ name: 'Maria Silva' }],
      source: 'texto',
    });
  });

  it('localizador só de um lado não separa: segue casando e o ref sobrevive', () => {
    // O localizador só é chave de identidade quando os DOIS lados têm um para
    // comparar — mesma regra da data. Senão, o texto colado sem localizador
    // (o caso comum) viraria uma linha nova em vez de completar a do PDF.
    const doPdf = mergeVoucherItems(
      [],
      [{ description: 'Magic Kingdom', date: '15/09/2026', ref: 'JTT-1' }],
      'pdf',
    );

    const comTexto = mergeVoucherItems(
      doPdf,
      [{ description: 'Magic Kingdom', date: '15/09/2026', qty: 2 }],
      'texto',
    );

    expect(comTexto).toHaveLength(1);
    expect(comTexto[0]).toMatchObject({ ref: 'JTT-1', qty: 2 });
  });
});

describe('stripSource', () => {
  it('tira a marca da mescla sem mexer no resto', () => {
    const items = mergeVoucherItems(
      [],
      [{ description: 'Universal', ref: 'UNI-9', passengers: [{ name: 'Maria' }] }],
      'texto',
    );

    expect(stripSource(items)).toEqual([
      { description: 'Universal', ref: 'UNI-9', passengers: [{ name: 'Maria' }] },
    ]);
  });

  it('não muta a lista recebida', () => {
    const items = mergeVoucherItems([], [{ description: 'A' }], 'texto');

    stripSource(items);

    expect(items[0].source).toBe('texto');
  });

  /**
   * O `source` é escrituração nossa; o backend não conhece esse campo e recusa
   * o corpo com 400 — o que derruba o "Pedido enviado" INTEIRO, não só a
   * mescla. E o TypeScript não protege: `SourcedItem[]` é atribuível a
   * `AcceptanceItem[]`, e o excess property check só vale para objeto literal.
   * Então a garantia tem que ser asserção, não tipo.
   */
  it('nenhum item do payload leva `source`, depois da cadeia inteira de mesclas', () => {
    // Mesma sequência do modal: rascunho da Ficha, dois PDFs, texto colado.
    const daFicha = [{ description: 'Magic Kingdom' }, { description: 'Universal' }];
    const comPdf1 = mergeVoucherItems(
      daFicha,
      [{ description: 'Magic Kingdom', ref: 'JTT-1', passengers: [{ name: 'Maria Silva' }] }],
      'pdf',
    );
    const comPdf2 = mergeVoucherItems(
      comPdf1,
      [{ description: 'Magic Kingdom', ref: 'JTT-2' }],
      'pdf',
    );
    const comTexto = mergeVoucherItems(
      comPdf2,
      [{ description: 'Universal', qty: 2, passengers: [{ name: 'João Silva' }] }],
      'texto',
    );

    // Exatamente o que o `submit` do diálogo monta.
    const payload = stripSource(comTexto.filter((x) => x.description.trim())).map((x) => ({
      ...x,
      description: x.description.trim(),
    }));

    expect(chavesDe(payload)).not.toContain('source');
    // E a mescla não foi desfeita no caminho: o payload é o dado de verdade.
    // Ordem: as linhas da Ficha onde estavam (a 1ª completada pelo 1º PDF, a 2ª
    // pelo texto), e o 2º ingresso do Magic Kingdom entrando no fim.
    expect(payload.map((i) => i.description)).toEqual([
      'Magic Kingdom',
      'Universal',
      'Magic Kingdom',
    ]);
    expect(payload.map((i) => i.ref)).toEqual(['JTT-1', undefined, 'JTT-2']);
    expect(payload.map((i) => i.passengers?.map((p) => p.name))).toEqual([
      ['Maria Silva'],
      ['João Silva'],
      undefined,
    ]);
  });
});

/** Toda chave que aparece na estrutura, em qualquer profundidade. */
function chavesDe(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(chavesDe);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [
      k,
      ...chavesDe(v),
    ]);
  }
  return [];
}

/**
 * Sentinela do FONTE, não do comportamento.
 *
 * A normalização de acento remove o intervalo U+0300–U+036F (as marcas que o
 * NFD separa da letra). Escrito com os caracteres literais o código funciona
 * igual — e é por isso que o problema é traiçoeiro: eles são INVISÍVEIS no
 * editor, já se perderam três vezes neste arquivo, e no dia em que sumirem num
 * "limpa arquivo" a normalização para de funcionar SEM ERRO NENHUM. "Ingresso
 * Único" e "ingresso unico" viram itens diferentes e o cliente assina um aceite
 * com a linha duplicada.
 *
 * Nenhum outro teste pega isso: todos passam com o literal no lugar do escape,
 * que é exatamente por que ele sobreviveu três vezes.
 */
describe('voucher-merge.ts (o fonte, não o comportamento)', () => {
  it('não guarda marca de acento literal — o intervalo tem que ser escape', () => {
    const source = readFileSync(new URL('./voucher-merge.ts', import.meta.url), 'utf8');

    const achados = source.split('\n').flatMap((line, i) => {
      const marcas = [...line].filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        return code >= 0x0300 && code <= 0x036f;
      });
      return marcas.length
        ? [
            `  linha ${i + 1}: ${marcas.length} marca(s) — ${marcas
              .map((ch) => `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`)
              .join(', ')}`,
          ]
        : [];
    });

    expect(
      achados,
      [
        '',
        'Há marca de acento LITERAL (U+0300–U+036F) dentro de voucher-merge.ts:',
        ...achados,
        '',
        'Esses caracteres são invisíveis no editor. O código funciona com eles,',
        'mas eles somem no primeiro "limpa arquivo" — e aí a normalização de',
        'acento para de funcionar calada: "Ingresso Único" e "ingresso unico"',
        'passam a ser itens DIFERENTES e o cliente assina um aceite duplicado.',
        '',
        'Conserto: escreva o intervalo como ESCAPE, nunca com os caracteres.',
        'O certo é  /[\\u0300-\\u036f]/g  — inclusive no comentário ao lado.',
        '',
      ].join('\n'),
    ).toEqual([]);
  });
});
