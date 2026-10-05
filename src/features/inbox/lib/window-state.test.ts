import { describe, expect, it } from 'vitest';
import { computeWindowState, formatWindowLeft, windowKindLabel, windowUrgency } from './window-state';

const H = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 5, 12, 0, 0);

describe('nome da janela nos textos', () => {
  it('janela comum é "de 24h"', () => {
    expect(windowKindLabel('csw24')).toBe('de 24h');
    expect(windowKindLabel(null)).toBe('de 24h');
  });

  it('janela de anúncio não leva número fixo (a Meta informa o prazo)', () => {
    expect(windowKindLabel('ctwa72')).toBe('de anúncio');
    expect(windowKindLabel('ctwa72')).not.toMatch(/\d/);
  });

  it('a frase do contador não contradiz o tempo que falta', () => {
    const restante = formatWindowLeft(158 * H);
    expect(`A janela ${windowKindLabel('ctwa72')} fecha em ${restante}`).toBe(
      'A janela de anúncio fecha em 158h',
    );
  });
});

describe('estado da janela', () => {
  it('usa a expiração que veio do servidor, mesmo acima de 72h', () => {
    const state = computeWindowState({
      channelType: 'WHATSAPP_OFFICIAL',
      windowExpiresAt: new Date(NOW + 158 * H).toISOString(),
      windowKind: 'ctwa72',
      now: NOW,
    });
    expect(state.open).toBe(true);
    expect(state.kind).toBe('ctwa72');
    expect(Math.round(state.msLeft / H)).toBe(158);
  });

  it('não se aplica fora do canal oficial', () => {
    expect(computeWindowState({ channelType: 'INSTAGRAM', now: NOW }).applicable).toBe(false);
  });

  it('faixas de urgência: calma, apertada (≤6h), fechando (≤1h)', () => {
    expect(windowUrgency(7 * H)).toBe('calm');
    expect(windowUrgency(6 * H)).toBe('tight');
    expect(windowUrgency(1 * H)).toBe('closing');
  });
});
