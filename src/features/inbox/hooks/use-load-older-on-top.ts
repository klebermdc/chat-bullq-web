import { useEffect, useState } from 'react';

/** Dispara um pouco antes do topo aparecer, para a emenda não dar solavanco. */
export const TOP_SENTINEL_ROOT_MARGIN = '120px';

/**
 * Carrega as mensagens anteriores quando o topo da lista entra na tela.
 *
 * Devolve uma **callback ref**, não um `useRef`. O sentinela só existe no DOM
 * depois que as primeiras mensagens chegam, e um `useRef` não avisa ninguém
 * quando isso acontece: o efeito rodava uma vez, com o nó ainda nulo, e como
 * nenhuma das dependências mudava ao chegarem as mensagens, nunca mais rodava.
 * O observer simplesmente não era criado e rolar para cima não carregava nada.
 * Guardar o nó em estado faz o efeito rodar exatamente quando ele monta.
 *
 * @param canLoadOlder há mais o que carregar; falso desliga o observer.
 * @param loadOlder o que fazer quando o topo aparecer.
 * @returns ref a pendurar no elemento sentinela: `<div ref={setSentinel} />`.
 */
export function useLoadOlderOnTop(
  canLoadOlder: boolean,
  loadOlder: () => void | Promise<void>,
): (node: HTMLDivElement | null) => void {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinel || !canLoadOlder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadOlder();
      },
      { rootMargin: TOP_SENTINEL_ROOT_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, canLoadOlder, loadOlder]);

  return setSentinel;
}
