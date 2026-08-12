import { describe, it, expect } from 'vitest';
import { statusTooltip } from './message-status';

describe('statusTooltip — status simples', () => {
  it('traduz os status do ciclo de vida', () => {
    expect(statusTooltip('QUEUED')).toBe('Enviando…');
    expect(statusTooltip('SENT')).toBe('Enviado pro provedor');
    expect(statusTooltip('DELIVERED')).toBe('Entregue ao destinatário');
    expect(statusTooltip('READ')).toBe('Lida');
  });

  it('devolve o próprio status quando não conhece', () => {
    expect(statusTooltip('COISA_NOVA')).toBe('COISA_NOVA');
  });
});

describe('statusTooltip — códigos de erro da Meta', () => {
  // `formatMetaError` na API compõe `[code] title: message`, então o código
  // numérico chega no `failedReason` e é por ele que casamos — não pelo texto
  // em inglês, que a Meta muda sem avisar.

  it('131049: explica que reenviar não adianta', () => {
    const t = statusTooltip(
      'FAILED',
      '[131049] Message Undeliverable: This message was not delivered to maintain healthy ecosystem engagement.',
    );
    expect(t).toContain('marketing');
    expect(t).toContain('Reenviar não adianta');
    expect(t).not.toContain('ecosystem');
  });

  it('131050: cliente pediu pra sair do marketing', () => {
    const t = statusTooltip('FAILED', '[131050] User has stopped receipt of marketing messages.');
    expect(t).toContain('optou por não receber');
  });

  it('131047: janela de 24h expirada', () => {
    const t = statusTooltip('FAILED', '[131047] Re-engagement message');
    expect(t).toContain('24h');
    expect(t).toContain('template');
  });

  it('132000: variáveis do template não batem', () => {
    const t = statusTooltip('FAILED', '[132000] Template Param Count Mismatch');
    expect(t).toContain('variáveis');
  });
});

describe('statusTooltip — degradação', () => {
  // Mensagens antigas (anteriores ao fix do `failedReason` na API #154) não
  // têm código nenhum. Não podem sumir da tela — mostramos o texto cru.
  it('sem código conhecido, mostra o motivo cru', () => {
    expect(statusTooltip('FAILED', 'Request failed with status code 400')).toBe(
      'Falhou: Request failed with status code 400',
    );
  });

  it('código desconhecido cai no texto cru, não some', () => {
    expect(statusTooltip('FAILED', '[999999] Coisa Nova: detalhe')).toBe(
      'Falhou: [999999] Coisa Nova: detalhe',
    );
  });

  it('sem motivo nenhum', () => {
    expect(statusTooltip('FAILED')).toBe('Falhou ao enviar');
  });
});
