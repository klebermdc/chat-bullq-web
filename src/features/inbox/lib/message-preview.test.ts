import { describe, expect, it } from 'vitest';
import { messageTypeLabel } from './message-preview';

describe('rótulo da prévia de mensagem sem texto', () => {
  it('traduz os tipos de mídia', () => {
    expect(messageTypeLabel('IMAGE')).toBe('Foto');
    expect(messageTypeLabel('AUDIO')).toBe('Áudio');
    expect(messageTypeLabel('VIDEO')).toBe('Vídeo');
    expect(messageTypeLabel('DOCUMENT')).toBe('Documento');
    expect(messageTypeLabel('STICKER')).toBe('Figurinha');
    expect(messageTypeLabel('LOCATION')).toBe('Localização');
    expect(messageTypeLabel('CONTACT')).toBe('Contato');
    expect(messageTypeLabel('TEMPLATE')).toBe('Modelo de mensagem');
  });

  it('aceita caixa baixa', () => {
    expect(messageTypeLabel('image')).toBe('Foto');
  });

  it('cai em "Mensagem" para tipo desconhecido ou ausente', () => {
    expect(messageTypeLabel('QUALQUER_COISA')).toBe('Mensagem');
    expect(messageTypeLabel(undefined)).toBe('Mensagem');
  });
});
