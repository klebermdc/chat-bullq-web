'use client';

import { useTheme } from 'next-themes';
import data from '@emoji-mart/data';
import i18nPt from '@emoji-mart/data/i18n/pt.json';
import Picker from '@emoji-mart/react';

interface Props {
  /** Recebe o emoji já pronto para inserir (ex.: "😀"). */
  onPick: (emoji: string) => void;
}

/**
 * Só renderiza o picker e devolve a escolha. Não sabe o que é compositor nem
 * como inserir texto — quem liga as pontas é o `chat-input`.
 *
 * O import dos dados do emoji-mart é estático DE PROPÓSITO: este arquivo inteiro
 * é carregado com `next/dynamic` lá no `chat-input`, então o JSON pesado fica
 * num chunk separado que só baixa quando o atendente abre o painel pela primeira
 * vez.
 *
 * Sem borda, sombra ou cabeçalho próprio: na Fatia 2 este componente vira o
 * conteúdo da aba "Emojis" de um painel com abas.
 */
export function EmojiPickerPanel({ onPick }: Props) {
  const { resolvedTheme } = useTheme();

  return (
    <Picker
      data={data}
      i18n={i18nPt}
      locale="pt"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      onEmojiSelect={(emoji: { native: string }) => onPick(emoji.native)}
      previewPosition="none"
      skinTonePosition="search"
      navPosition="top"
      perLine={8}
      /**
       * NUNCA ligar isto. Campo com autoFocus dentro de PopoverPanel faz o
       * popover se fechar no mesmo clique que abriu — ver o comentário em
       * agent-pin-popover.tsx.
       */
      autoFocus={false}
    />
  );
}
