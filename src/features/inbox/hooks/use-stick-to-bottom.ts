import { useCallback, useEffect, useRef } from 'react';

/** Distância do fim, em pixels, dentro da qual o chat ainda "acompanha". */
export const NEAR_BOTTOM_PX = 120;

export interface StickToBottom {
  /** Vai no contêiner rolável. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Vai num elemento vazio no fim da lista — é para ele que a tela desce. */
  bottomRef: React.RefObject<HTMLDivElement | null>;
  /** Ligar no `onScroll` do contêiner. */
  handleScroll: () => void;
}

/**
 * Mantém o chat colado no fim para quem já está no fim — e só para esse.
 *
 * A decisão sai da posição real da rolagem, medida a cada `onScroll`. A versão
 * anterior decidia por um estado (`pinned`) que ligava ao carregar histórico e
 * só desligava clicando numa pílula: quem rolasse para cima uma vez perdia o
 * auto-scroll pelo resto da conversa, e mensagem nova chegava sem a tela descer.
 *
 * `isNearBottom` fica em ref, não em estado: é lido dentro do efeito, nunca
 * renderizado, e em estado cada pixel de rolagem custaria um re-render.
 *
 * @param messageCount quantidade de mensagens; mudou, chegou mensagem.
 */
export function useStickToBottom(messageCount: number): StickToBottom {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  return { scrollRef, bottomRef, handleScroll };
}
