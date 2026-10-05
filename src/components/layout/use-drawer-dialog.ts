'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

interface DrawerDialog<T extends HTMLElement> {
  /** Espalhe no painel do drawer. */
  panelProps: {
    ref: RefObject<T | null>;
    role: 'dialog';
    'aria-modal': true;
    'aria-labelledby': string;
    tabIndex: -1;
    onKeyDown: (event: KeyboardEvent<T>) => void;
  };
  /** `id` do título do drawer (o `aria-labelledby` aponta para ele). */
  titleId: string;
}

/**
 * Acessibilidade dos painéis laterais feitos à mão (não são `<Dialog>`):
 * papel de diálogo, Esc fecha, o foco entra no painel ao abrir, fica preso
 * nele com Tab e volta para quem abriu ao fechar.
 *
 * O Esc é ouvido no próprio painel, não no `document`: um diálogo aberto por
 * cima (confirmação, seletor) trata o próprio Esc sem fechar o drawer junto.
 */
export function useDrawerDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void): DrawerDialog<T> {
  const panelRef = useRef<T | null>(null);
  const titleId = useId();

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<T>) => {
    const panel = panelRef.current;
    // Eventos de portais (diálogos filhos) sobem pela árvore do React, mas não
    // estão dentro do painel no DOM: não são deste drawer.
    if (!panel || !(event.target instanceof Node) || !panel.contains(event.target)) return;

    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return {
    panelProps: {
      ref: panelRef,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': titleId,
      tabIndex: -1,
      onKeyDown,
    },
    titleId,
  };
}
