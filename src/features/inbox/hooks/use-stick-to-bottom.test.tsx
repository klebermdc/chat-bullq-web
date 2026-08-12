import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStickToBottom, NEAR_BOTTOM_PX } from './use-stick-to-bottom';

/**
 * O jsdom não faz layout: `scrollHeight` e `clientHeight` são sempre 0 e não
 * aceitam atribuição. Definir as três medidas na mão é o único jeito de
 * simular "o usuário está no fim" e "o usuário subiu para ler".
 */
function makeScroller(distanceFromBottom: number): HTMLDivElement {
  const el = document.createElement('div');
  const clientHeight = 500;
  const scrollHeight = 2000;
  const define = (prop: string, value: number) =>
    Object.defineProperty(el, prop, { value, configurable: true, writable: true });
  define('clientHeight', clientHeight);
  define('scrollHeight', scrollHeight);
  define('scrollTop', scrollHeight - clientHeight - distanceFromBottom);
  return el;
}

/** Monta o hook com o contêiner e o marcador de fim já pendurados. */
function setup(distanceFromBottom: number) {
  const scrollIntoView = vi.fn();
  const view = renderHook(({ count }) => useStickToBottom(count), {
    initialProps: { count: 1 },
  });

  act(() => {
    view.result.current.scrollRef.current = makeScroller(distanceFromBottom);
    const bottom = document.createElement('div');
    bottom.scrollIntoView = scrollIntoView;
    view.result.current.bottomRef.current = bottom;
  });

  // O efeito de montagem já desceu uma vez; o que interessa é o que acontece
  // da PRÓXIMA mensagem em diante.
  scrollIntoView.mockClear();
  return { ...view, scrollIntoView };
}

describe('useStickToBottom', () => {
  it('desce sozinho quando chega mensagem e o usuário está no fim', () => {
    const { rerender, result, scrollIntoView } = setup(0);

    act(() => result.current.handleScroll());
    rerender({ count: 2 });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('não arrasta para baixo quem subiu para ler', () => {
    const { rerender, result, scrollIntoView } = setup(800);

    act(() => result.current.handleScroll());
    rerender({ count: 2 });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('volta a acompanhar assim que o usuário retorna ao fim', () => {
    // A regressão que motivou o hook: a decisão vinha de um estado (`pinned`)
    // que ligava ao carregar histórico e só desligava clicando numa pílula.
    // Quem rolasse para cima uma vez ficava sem auto-scroll o resto da conversa.
    const { rerender, result, scrollIntoView } = setup(800);

    act(() => result.current.handleScroll());
    rerender({ count: 2 });
    expect(scrollIntoView).not.toHaveBeenCalled();

    act(() => {
      result.current.scrollRef.current = makeScroller(0);
      result.current.handleScroll();
    });
    rerender({ count: 3 });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('trata a borda da folga como ainda no fim', () => {
    const { rerender, result, scrollIntoView } = setup(NEAR_BOTTOM_PX - 1);

    act(() => result.current.handleScroll());
    rerender({ count: 2 });

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('trata a folga cheia como fora do fim', () => {
    const { rerender, result, scrollIntoView } = setup(NEAR_BOTTOM_PX);

    act(() => result.current.handleScroll());
    rerender({ count: 2 });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('não quebra quando o contêiner ainda não montou', () => {
    const { result } = renderHook(() => useStickToBottom(0));

    expect(() => result.current.handleScroll()).not.toThrow();
  });
});
