import { describe, expect, it } from 'vitest';
import { channelTypeLabel } from './channel-labels';

describe('nome do tipo de canal', () => {
  it('traduz os tipos conhecidos', () => {
    expect(channelTypeLabel('WHATSAPP_OFFICIAL')).toBe('WhatsApp (API oficial)');
    expect(channelTypeLabel('WHATSAPP_ZAPPFY')).toBe('WhatsApp (Zappfy)');
    expect(channelTypeLabel('INSTAGRAM')).toBe('Instagram');
    expect(channelTypeLabel('EMAIL')).toBe('E-mail');
  });

  it('formata tipo desconhecido sem sublinhado nem caixa alta', () => {
    expect(channelTypeLabel('NOVO_CANAL_X')).toBe('Novo Canal X');
  });

  it('não quebra sem tipo', () => {
    expect(channelTypeLabel(undefined)).toBe('Canal');
    expect(channelTypeLabel('')).toBe('Canal');
  });
});
