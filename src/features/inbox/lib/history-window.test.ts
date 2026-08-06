import { describe, expect, it } from 'vitest';
import {
  LIVE_WINDOW,
  shouldAppendIncoming,
  windowAfterJump,
  windowAfterLoadOlder,
} from './history-window';

describe('shouldAppendIncoming', () => {
  it('no vivo, mensagem nova entra no fim', () => {
    expect(shouldAppendIncoming(LIVE_WINDOW)).toBe(true);
  });

  // A janela histórica não contém o fim da conversa. Appendar ali colaria uma
  // mensagem de agora logo abaixo de uma de meses atrás — mentira visual.
  it('numa janela histórica, mensagem nova NÃO entra no fim', () => {
    expect(shouldAppendIncoming(windowAfterJump({ hasOlder: true, isAtEnd: false }))).toBe(false);
  });

  it('rolar pra cima mantém o fim carregado, então ainda appenda', () => {
    expect(shouldAppendIncoming(windowAfterLoadOlder(LIVE_WINDOW, true))).toBe(true);
  });
});

describe('windowAfterLoadOlder', () => {
  it('prende a janela — o refetch de foco descartaria o que foi carregado', () => {
    expect(windowAfterLoadOlder(LIVE_WINDOW, true).pinned).toBe(true);
  });

  it('propaga que ainda há histórico atrás', () => {
    expect(windowAfterLoadOlder(LIVE_WINDOW, true).hasOlder).toBe(true);
  });

  it('marca o começo do histórico quando o servidor diz que acabou', () => {
    expect(windowAfterLoadOlder(LIVE_WINDOW, false).hasOlder).toBe(false);
  });

  it('não muda o fato de o fim estar carregado', () => {
    expect(windowAfterLoadOlder(LIVE_WINDOW, true).isAtEnd).toBe(true);
  });
});

describe('windowAfterJump', () => {
  it('pular pro meio da conversa prende a janela', () => {
    expect(windowAfterJump({ hasOlder: true, isAtEnd: false }).pinned).toBe(true);
  });

  // Pular pra uma mensagem recente pode cair no fim da conversa: aí é vivo de
  // novo e o refetch pode voltar a agir.
  it('pular pra uma mensagem no fim, sem histórico atrás, volta ao vivo', () => {
    expect(windowAfterJump({ hasOlder: false, isAtEnd: true })).toEqual(LIVE_WINDOW);
  });

  it('alcançar o fim mas ainda ter histórico atrás mantém preso', () => {
    expect(windowAfterJump({ hasOlder: true, isAtEnd: true }).pinned).toBe(true);
  });
});
