import { describe, expect, it } from 'vitest';
import {
  MAX_PRINT_BYTES,
  MAX_PROPOSAL_PRINTS,
  acceptPrints,
  pasteIsRichText,
  textHasLink,
} from './print-intake';

/** File de mentira: a regra só olha nome, tipo e tamanho. */
function fakeFile(name: string, type: string, size = 1024): File {
  return { name, type, size } as File;
}

describe('acceptPrints', () => {
  it('aceita png, jpeg e webp', () => {
    const files = [
      fakeFile('a.png', 'image/png'),
      fakeFile('b.jpg', 'image/jpeg'),
      fakeFile('c.webp', 'image/webp'),
    ];

    const result = acceptPrints(files, 0);

    expect(result.accepted).toEqual(files);
    expect(result.rejected).toEqual([]);
  });

  it('recusa o que não é imagem aceita', () => {
    const files = [
      fakeFile('cotacao.pdf', 'application/pdf'),
      fakeFile('anim.gif', 'image/gif'),
      fakeFile('sem-tipo', ''),
    ];

    const result = acceptPrints(files, 0);

    expect(result.accepted).toEqual([]);
    expect(result.rejected.map((r) => r.name)).toEqual(['cotacao.pdf', 'anim.gif', 'sem-tipo']);
    expect(result.rejected[0].reason).toMatch(/PNG, JPG ou WebP/);
  });

  it('recusa imagem acima de 10MB e aceita a que está no limite', () => {
    const atLimit = fakeFile('limite.png', 'image/png', MAX_PRINT_BYTES);
    const tooBig = fakeFile('grande.png', 'image/png', MAX_PRINT_BYTES + 1);

    const result = acceptPrints([atLimit, tooBig], 0);

    expect(result.accepted).toEqual([atLimit]);
    expect(result.rejected).toEqual([{ name: 'grande.png', reason: 'passa de 10MB' }]);
  });

  it('recusa arquivo vazio', () => {
    const result = acceptPrints([fakeFile('vazio.png', 'image/png', 0)], 0);

    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([{ name: 'vazio.png', reason: 'está vazio' }]);
  });

  it('limita a 4 contando os prints já anexados', () => {
    const files = [
      fakeFile('1.png', 'image/png'),
      fakeFile('2.png', 'image/png'),
      fakeFile('3.png', 'image/png'),
    ];

    const result = acceptPrints(files, MAX_PROPOSAL_PRINTS - 2);

    expect(result.accepted.map((f) => f.name)).toEqual(['1.png', '2.png']);
    expect(result.rejected).toEqual([
      { name: '3.png', reason: 'o limite é 4 prints por proposta' },
    ]);
  });

  it('não aceita nada quando o limite já foi atingido', () => {
    const result = acceptPrints([fakeFile('1.png', 'image/png')], MAX_PROPOSAL_PRINTS);

    expect(result.accepted).toEqual([]);
    expect(result.rejected).toHaveLength(1);
  });

  it('arquivo recusado por tipo ou tamanho não gasta vaga', () => {
    const files = [
      fakeFile('doc.pdf', 'application/pdf'),
      fakeFile('grande.jpg', 'image/jpeg', MAX_PRINT_BYTES + 1),
      fakeFile('ok.png', 'image/png'),
    ];

    const result = acceptPrints(files, MAX_PROPOSAL_PRINTS - 1);

    expect(result.accepted.map((f) => f.name)).toEqual(['ok.png']);
    expect(result.rejected.map((r) => r.name)).toEqual(['doc.pdf', 'grande.jpg']);
  });

  it('relata cada recusa com o nome do arquivo e o motivo', () => {
    const files = [
      fakeFile('doc.pdf', 'application/pdf'),
      fakeFile('', 'image/png', MAX_PRINT_BYTES + 1),
    ];

    const result = acceptPrints(files, 0);

    expect(result.rejected).toEqual([
      { name: 'doc.pdf', reason: 'só aceito imagem PNG, JPG ou WebP' },
      { name: 'arquivo', reason: 'passa de 10MB' },
    ]);
  });

  it('não altera a lista recebida', () => {
    const files = [fakeFile('a.png', 'image/png'), fakeFile('b.pdf', 'application/pdf')];
    const snapshot = [...files];

    acceptPrints(files, 0);

    expect(files).toEqual(snapshot);
  });
});

describe('textHasLink', () => {
  it('reconhece http e https em qualquer ponto do texto', () => {
    expect(textHasLink('https://reservas.orlandofastpass.com.br/pt/checkout/abc')).toBe(true);
    expect(textHasLink('DISNEY 4 PARKS\nHTTP://exemplo.com/x')).toBe(true);
  });

  it('texto sem link ou vazio não conta', () => {
    expect(textHasLink('DISNEY 4 PARKS [4 dias]\n3 Adultos')).toBe(false);
    expect(textHasLink('   ')).toBe(false);
    expect(textHasLink('')).toBe(false);
  });
});

describe('pasteIsRichText', () => {
  it('texto formatado com imagem de brinde (planilha, Word) é texto', () => {
    expect(pasteIsRichText(['text/plain', 'text/html', 'Files'])).toBe(true);
    expect(pasteIsRichText(['text/plain', 'text/rtf', 'Files'])).toBe(true);
  });

  it('print e "copiar imagem" do navegador não são texto', () => {
    expect(pasteIsRichText(['Files'])).toBe(false);
    expect(pasteIsRichText(['text/html', 'Files'])).toBe(false);
  });

  it('arquivo copiado do Finder (só o nome em texto puro) não é texto', () => {
    expect(pasteIsRichText(['text/plain', 'Files'])).toBe(false);
  });
});
