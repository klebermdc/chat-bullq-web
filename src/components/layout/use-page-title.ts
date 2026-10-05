'use client';

import { useEffect } from 'react';

const APP_NAME = 'Sendtur';

/**
 * Título da aba por página (WCAG 2.4.2). As páginas do painel são client
 * components, então não dá para usar `metadata`: o título é escrito no
 * `document` e volta para o nome do app ao sair da página.
 *
 * Só desfaz o que ela mesma escreveu — se a página seguinte já trocou o
 * título, a limpeza da anterior não passa por cima.
 */
export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    const pageTitle = `${title} · ${APP_NAME}`;
    document.title = pageTitle;
    return () => {
      if (document.title === pageTitle) document.title = APP_NAME;
    };
  }, [title]);
}
