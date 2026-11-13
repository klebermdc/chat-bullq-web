import { describe, expect, it } from 'vitest';
import { voiceSummary } from './api';

describe('voiceSummary', () => {
  it('explica cada estado', () => {
    expect(voiceSummary({ enabled: false, delayHours: 24, dialerConfigured: true })).toContain('Desligado');
    expect(voiceSummary({ enabled: true, delayHours: 24, dialerConfigured: false })).toContain('nenhuma ligação sai');
    expect(voiceSummary({ enabled: true, delayHours: 48, dialerConfigured: true })).toBe(
      'Ligado: a Aline liga 48 horas depois da cotação, se o cliente não responder.',
    );
  });
});
