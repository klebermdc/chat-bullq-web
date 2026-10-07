'use client';

import { useEffect, useRef, useState } from 'react';
import {
  dragHasFiles,
  filesFromClipboard,
  filesFromDataTransfer,
} from '@/features/inbox/lib/attachment-intake';
import { pasteIsRichText } from '../lib/print-intake';

const DRAG_EVENTS = ['dragenter', 'dragover'] as const;

function swallow(event: Event) {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Enquanto o diálogo está aberto, Ctrl+V de imagem e arquivo solto em qualquer
 * ponto da tela viram print da proposta.
 *
 * Escuta no `document`, em captura, de propósito: o diálogo é um portal, e os
 * eventos do React sobem pela árvore até o painel da conversa — sem parar aqui,
 * o arquivo solto no diálogo também cairia na bandeja de anexos do chat. De
 * quebra, cobre o cabeçalho e o rodapé do diálogo e impede o navegador de abrir
 * a imagem solta fora da área.
 */
export function usePrintIntake(active: boolean, onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!active) return;

    const handlePaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      // Sem arquivo (ou texto de planilha com imagem de brinde): colar normal.
      if (!data || pasteIsRichText(Array.from(data.types ?? []))) return;
      const files = filesFromClipboard(data);
      if (!files.length) return;
      swallow(event);
      onFilesRef.current(files);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!dragHasFiles(event.dataTransfer)) return;
      swallow(event);
      setIsDragging(true);
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!dragHasFiles(event.dataTransfer)) return;
      event.stopPropagation();
      // relatedTarget nulo = o arrasto saiu da janela.
      if (!event.relatedTarget) setIsDragging(false);
    };
    const handleDrop = (event: DragEvent) => {
      if (!dragHasFiles(event.dataTransfer)) return;
      swallow(event);
      setIsDragging(false);
      onFilesRef.current(filesFromDataTransfer(event.dataTransfer));
    };

    document.addEventListener('paste', handlePaste, true);
    DRAG_EVENTS.forEach((name) => document.addEventListener(name, handleDragOver, true));
    document.addEventListener('dragleave', handleDragLeave, true);
    document.addEventListener('drop', handleDrop, true);
    return () => {
      document.removeEventListener('paste', handlePaste, true);
      DRAG_EVENTS.forEach((name) => document.removeEventListener(name, handleDragOver, true));
      document.removeEventListener('dragleave', handleDragLeave, true);
      document.removeEventListener('drop', handleDrop, true);
      setIsDragging(false);
    };
  }, [active]);

  return { isDragging };
}
