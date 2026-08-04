import { describe, it, expect } from 'vitest';
import {
  createInitialState, addBlock, removeBlock, moveBlock,
  updateBlock, updateBlockStyle, updateTheme, selectBlock,
  markSaved, toContent, contentEquals, DEFAULT_THEME,
} from './editor-state';

const comDoisBlocos = () => {
  let s = createInitialState();
  s = addBlock(s, 'heading');
  s = addBlock(s, 'text');
  return s;
};

describe('createInitialState', () => {
  it('começa vazio, limpo e sem seleção', () => {
    const s = createInitialState();
    expect(s.blocks).toHaveLength(0);
    expect(s.selectedId).toBeNull();
    expect(s.dirty).toBe(false);
    expect(s.theme).toEqual(DEFAULT_THEME);
  });

  it('aceita conteúdo existente e não nasce sujo', () => {
    const s = createInitialState({ blocks: [{ type: 'text', text: 'oi' }] });
    expect(s.blocks).toHaveLength(1);
    expect(s.dirty).toBe(false);
  });

  it('completa o tema quando o conteúdo vem sem ele (campanha da Fatia 1)', () => {
    const s = createInitialState({ blocks: [{ type: 'text', text: 'oi' }] });
    expect(s.theme).toEqual(DEFAULT_THEME);
  });
});

describe('addBlock', () => {
  it('adiciona ao fim, seleciona o novo e suja o estado', () => {
    const s = addBlock(createInitialState(), 'text');
    expect(s.blocks).toHaveLength(1);
    expect(s.selectedId).toBe(s.blocks[0].id);
    expect(s.dirty).toBe(true);
  });

  it('dá id único a cada bloco', () => {
    const s = comDoisBlocos();
    expect(s.blocks[0].id).not.toBe(s.blocks[1].id);
  });

  it('cria o bloco já preenchido com o padrão do tipo', () => {
    const s = addBlock(createInitialState(), 'spacer');
    expect(s.blocks[0]).toHaveProperty('size');
  });

  it('não muta o estado anterior', () => {
    const antes = createInitialState();
    addBlock(antes, 'text');
    expect(antes.blocks).toHaveLength(0);
  });
});

describe('moveBlock', () => {
  it('troca a ordem', () => {
    const s = moveBlock(comDoisBlocos(), 0, 1);
    expect(s.blocks[0].type).toBe('text');
    expect(s.blocks[1].type).toBe('heading');
  });

  it('mover o primeiro para cima não faz nada e não suja', () => {
    const base = { ...comDoisBlocos(), dirty: false };
    const s = moveBlock(base, 0, -1);
    expect(s.blocks[0].type).toBe('heading');
    expect(s.dirty).toBe(false);
  });

  it('mover o último para baixo não faz nada', () => {
    const base = comDoisBlocos();
    const s = moveBlock(base, 1, 2);
    expect(s.blocks[1].type).toBe('text');
  });
});

describe('removeBlock', () => {
  it('remove e limpa a seleção quando era o selecionado', () => {
    const base = comDoisBlocos();
    const s = removeBlock(base, base.blocks[1].id);
    expect(s.blocks).toHaveLength(1);
    expect(s.selectedId).toBeNull();
  });

  it('mantém a seleção quando remove outro', () => {
    let base = comDoisBlocos();
    base = selectBlock(base, base.blocks[0].id);
    const s = removeBlock(base, base.blocks[1].id);
    expect(s.selectedId).toBe(base.blocks[0].id);
  });
});

describe('updateBlock e updateBlockStyle', () => {
  it('altera só o bloco alvo', () => {
    const base = comDoisBlocos();
    const s = updateBlock(base, base.blocks[0].id, { text: 'novo' });
    expect(s.blocks[0]).toHaveProperty('text', 'novo');
    expect(s.blocks[1]).toEqual(base.blocks[1]);
  });

  it('estilo é mesclado, não substituído', () => {
    let base = comDoisBlocos();
    base = updateBlockStyle(base, base.blocks[0].id, { color: '#111111' });
    const s = updateBlockStyle(base, base.blocks[0].id, { fontSize: 20 });
    expect(s.blocks[0].style).toEqual({ color: '#111111', fontSize: 20 });
  });

  it('suja o estado', () => {
    const base = { ...comDoisBlocos(), dirty: false };
    expect(updateBlock(base, base.blocks[0].id, { text: 'x' }).dirty).toBe(true);
  });
});

describe('updateTheme', () => {
  it('mescla com o tema atual', () => {
    const s = updateTheme(createInitialState(), { primaryColor: '#ff0000' });
    expect(s.theme.primaryColor).toBe('#ff0000');
    expect(s.theme.textColor).toBe(DEFAULT_THEME.textColor);
  });
});

describe('markSaved', () => {
  it('limpa a sujeira sem mexer nos blocos', () => {
    const base = comDoisBlocos();
    const s = markSaved(base);
    expect(s.dirty).toBe(false);
    expect(s.blocks).toEqual(base.blocks);
  });
});

describe('ida e volta pela persistência', () => {
  // Este é o teste mais importante do arquivo: serialização quebrada faria o
  // operador perder o trabalho ao recarregar, e é um defeito silencioso.
  it('salvar e recarregar devolve exatamente o mesmo conteúdo', () => {
    let s = createInitialState();
    s = addBlock(s, 'logo');
    s = addBlock(s, 'heading');
    s = addBlock(s, 'offer');
    s = addBlock(s, 'social');
    s = addBlock(s, 'spacer');
    s = updateBlock(s, s.blocks[1].id, { text: 'Sentiu falta da magia?' });
    s = updateBlockStyle(s, s.blocks[1].id, { color: '#ff0000', fontSize: 28, align: 'center' });
    s = updateTheme(s, { primaryColor: '#00ff00', fontFamily: 'serif' });

    const persistido = toContent(s);
    const recarregado = createInitialState(persistido);

    expect(toContent(recarregado)).toEqual(persistido);
    expect(recarregado.theme.primaryColor).toBe('#00ff00');
    expect(recarregado.theme.fontFamily).toBe('serif');
    expect(recarregado.blocks[1]).toMatchObject({
      type: 'heading',
      text: 'Sentiu falta da magia?',
      style: { color: '#ff0000', fontSize: 28, align: 'center' },
    });
  });

  it('não persiste os ids locais', () => {
    let s = createInitialState();
    s = addBlock(s, 'text');
    expect(toContent(s).blocks[0]).not.toHaveProperty('id');
  });
});

describe('contentEquals', () => {
  // Esta é a lógica que decide, depois de salvar, se o que está na tela ainda
  // é o que acabou de ser persistido. Errar aqui faz a UI mentir sobre estar
  // salva enquanto há edição pendente — foi exatamente o bug corrigido.
  it('conteúdo idêntico é igual mesmo sendo objetos diferentes', () => {
    let s = comDoisBlocos();
    s = updateTheme(s, { primaryColor: '#123456' });
    const a = toContent(s);
    const b = toContent(s);
    expect(a).not.toBe(b);
    expect(contentEquals(a, b)).toBe(true);
  });

  it('detecta diferença em um bloco', () => {
    const base = comDoisBlocos();
    const a = toContent(base);
    const editado = updateBlock(base, base.blocks[0].id, { text: 'mudou' });
    const b = toContent(editado);
    expect(contentEquals(a, b)).toBe(false);
  });

  it('detecta diferença no tema', () => {
    const base = comDoisBlocos();
    const a = toContent(base);
    const b = toContent(updateTheme(base, { primaryColor: '#000000' }));
    expect(contentEquals(a, b)).toBe(false);
  });

  it('detecta bloco adicionado ou removido', () => {
    const base = comDoisBlocos();
    const a = toContent(base);
    const comMais = addBlock(base, 'divider');
    expect(contentEquals(a, toContent(comMais))).toBe(false);
  });

  it('simula o cenário do bug: editar depois de salvar mantém dirty', () => {
    // 1. Usuário edita e clica Salvar — o mutationFn fotografa o conteúdo aqui.
    let s = comDoisBlocos();
    const enviado = toContent(s);

    // 2. Antes da resposta voltar, o usuário edita de novo.
    s = updateBlock(s, s.blocks[0].id, { text: 'edição durante o salvamento' });

    // 3. onSuccess chega: compara o estado ATUAL com o que foi enviado.
    const aindaIgual = contentEquals(toContent(s), enviado);
    expect(aindaIgual).toBe(false); // não pode marcar como salvo
  });

  it('sem edição concorrente, o estado pode ser marcado como salvo', () => {
    const s = comDoisBlocos();
    const enviado = toContent(s);
    expect(contentEquals(toContent(s), enviado)).toBe(true);
  });
});
