import { describe, expect, it } from 'vitest';
import { parseImportFile, planImport } from './quick-reply-import';

const MEMBERS = [
  { user: { id: 'u-suelen', name: 'Suelen Reame' } },
  { user: { id: 'u-carol', name: 'Carolina Lemos' } },
  { user: { id: 'u-rafa', name: 'Rafael Souza' } },
  { user: { id: 'u-rafa2', name: 'Rafael Lima' } },
];

describe('parseImportFile', () => {
  it('lê a lista e ignora campos extras', () => {
    const json = JSON.stringify([
      { shortcut: 'pix', title: 'Pix', content: 'x', category: 'Pagamento', owner: null, umbler: ['1'] },
    ]);
    expect(parseImportFile(json)).toEqual([
      { shortcut: 'pix', title: 'Pix', content: 'x', category: 'Pagamento', owner: null },
    ]);
  });

  it('recusa arquivo que não é lista ou item sem atalho/título/texto', () => {
    expect(() => parseImportFile('{"a":1}')).toThrow(/lista/);
    expect(() => parseImportFile('nada')).toThrow(/JSON/);
    expect(() => parseImportFile('[{"shortcut":"pix","title":"","content":"x"}]')).toThrow(/item 1/);
  });
});

describe('planImport', () => {
  const item = (shortcut: string, owner: string | null = null) => ({
    shortcut,
    title: shortcut,
    content: 'texto',
    category: 'Geral',
    owner,
  });

  it('liga ao vendedor pelo nome completo, sem acento nem caixa', () => {
    const plan = planImport([item('a', 'suelen reame'), item('b')], [], MEMBERS);
    expect(plan.toCreate).toEqual([
      { shortcut: 'a', title: 'a', content: 'texto', category: 'Geral', ownerUserId: 'u-suelen' },
      { shortcut: 'b', title: 'b', content: 'texto', category: 'Geral', ownerUserId: null },
    ]);
  });

  it('aceita só o primeiro nome quando ele é único na equipe', () => {
    const plan = planImport([item('a', 'Carolina')], [], MEMBERS);
    expect(plan.toCreate[0].ownerUserId).toBe('u-carol');
  });

  it('não vira "da equipe" quando o vendedor não é achado ou é ambíguo', () => {
    const plan = planImport([item('a', 'Gabriela Marcato'), item('b', 'Rafael')], [], MEMBERS);
    expect(plan.toCreate).toEqual([]);
    expect(plan.unknownOwners).toEqual([
      { shortcut: 'a', owner: 'Gabriela Marcato' },
      { shortcut: 'b', owner: 'Rafael' },
    ]);
  });

  it('pula atalho que já existe (inclusive repetido no arquivo)', () => {
    const plan = planImport([item('pix'), item('novo'), item('NOVO')], ['pix'], MEMBERS);
    expect(plan.toCreate.map((x) => x.shortcut)).toEqual(['novo']);
    expect(plan.existing).toEqual(['pix', 'novo']);
  });
});
