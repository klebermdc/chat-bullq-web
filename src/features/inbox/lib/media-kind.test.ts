import { describe, expect, it } from 'vitest';
import { messageTypeForMime } from './media-kind';

describe('messageTypeForMime', () => {
  it('classifica imagem', () => {
    expect(messageTypeForMime('image/jpeg')).toBe('IMAGE');
    expect(messageTypeForMime('image/heic')).toBe('IMAGE');
  });

  it('classifica vídeo', () => {
    expect(messageTypeForMime('video/mp4')).toBe('VIDEO');
    expect(messageTypeForMime('video/quicktime')).toBe('VIDEO');
  });

  /**
   * O que motivou o módulo: áudio anexado do dispositivo caía no DOCUMENT e
   * chegava ao cliente como arquivo pra baixar, não como áudio tocável.
   */
  it('classifica áudio, inclusive os mimes que o SO usa no anexo', () => {
    expect(messageTypeForMime('audio/mpeg')).toBe('AUDIO');
    expect(messageTypeForMime('audio/x-m4a')).toBe('AUDIO');
    expect(messageTypeForMime('audio/3gpp')).toBe('AUDIO');
  });

  it('sobra vira documento', () => {
    expect(messageTypeForMime('application/pdf')).toBe('DOCUMENT');
    expect(messageTypeForMime('')).toBe('DOCUMENT');
    expect(messageTypeForMime(undefined)).toBe('DOCUMENT');
  });

  it('ignora parâmetros e caixa do mime', () => {
    expect(messageTypeForMime('AUDIO/WEBM;codecs=opus')).toBe('AUDIO');
    expect(messageTypeForMime(' image/png ')).toBe('IMAGE');
  });
});
