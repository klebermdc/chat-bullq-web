import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadOlderOnTop, TOP_SENTINEL_ROOT_MARGIN } from './use-load-older-on-top';

/**
 * O jsdom não traz IntersectionObserver. Este dublê registra as instâncias
 * criadas para o teste poder afirmar que o observer chegou a existir — que é
 * exatamente o que faltava no bug.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  observed: Element[] = [];
  isDisconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve() {}

  disconnect() {
    this.isDisconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simula o topo entrando (ou saindo) da viewport. */
  emit(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLoadOlderOnTop', () => {
  it('não cria observer enquanto o sentinela não existe no DOM', () => {
    renderHook(() => useLoadOlderOnTop(true, vi.fn()));

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('cria o observer quando o sentinela monta DEPOIS do primeiro render', () => {
    // Este é o bug que ficou dias em produção: o sentinela só entra no DOM
    // quando as mensagens chegam, e com `useRef` o efeito já havia rodado com o
    // nó nulo — nada o fazia rodar de novo, então o observer nunca nascia e
    // rolar para cima não carregava nada.
    const { result } = renderHook(() => useLoadOlderOnTop(true, vi.fn()));
    const node = document.createElement('div');

    act(() => result.current(node));

    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    expect(FakeIntersectionObserver.instances[0].observed).toEqual([node]);
  });

  it('dispara antes do topo aparecer, para a emenda não dar solavanco', () => {
    const { result } = renderHook(() => useLoadOlderOnTop(true, vi.fn()));

    act(() => result.current(document.createElement('div')));

    expect(FakeIntersectionObserver.instances[0].options?.rootMargin).toBe(
      TOP_SENTINEL_ROOT_MARGIN,
    );
  });

  it('carrega as anteriores quando o topo entra na tela', () => {
    const loadOlder = vi.fn();
    const { result } = renderHook(() => useLoadOlderOnTop(true, loadOlder));

    act(() => result.current(document.createElement('div')));
    act(() => FakeIntersectionObserver.instances[0].emit(true));

    expect(loadOlder).toHaveBeenCalledTimes(1);
  });

  it('não carrega quando o topo apenas sai da tela', () => {
    const loadOlder = vi.fn();
    const { result } = renderHook(() => useLoadOlderOnTop(true, loadOlder));

    act(() => result.current(document.createElement('div')));
    act(() => FakeIntersectionObserver.instances[0].emit(false));

    expect(loadOlder).not.toHaveBeenCalled();
  });

  it('não observa nada quando já chegou ao fim do histórico', () => {
    const { result } = renderHook(() => useLoadOlderOnTop(false, vi.fn()));

    act(() => result.current(document.createElement('div')));

    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('religa o observer quando volta a haver o que carregar', () => {
    const { result, rerender } = renderHook(
      ({ canLoad }) => useLoadOlderOnTop(canLoad, vi.fn()),
      { initialProps: { canLoad: false } },
    );

    act(() => result.current(document.createElement('div')));
    expect(FakeIntersectionObserver.instances).toHaveLength(0);

    rerender({ canLoad: true });

    expect(FakeIntersectionObserver.instances).toHaveLength(1);
  });

  it('desconecta ao desmontar, para não vazar observer entre conversas', () => {
    const { result, unmount } = renderHook(() => useLoadOlderOnTop(true, vi.fn()));

    act(() => result.current(document.createElement('div')));
    unmount();

    expect(FakeIntersectionObserver.instances[0].isDisconnected).toBe(true);
  });
});
