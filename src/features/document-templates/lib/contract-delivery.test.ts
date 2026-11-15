import { describe, expect, it } from 'vitest';
import type { ContractStatus } from '../types';
import { canResendContract, deliveryFeedback, toContractDelivery } from './contract-delivery';

const CONTRACT: ContractStatus = {
  id: 'c1',
  status: 'PENDING',
  kind: 'CONTRACT',
  title: 'Contrato',
  items: [],
  signedAt: null,
  signerName: null,
  signerIp: null,
  signerUserAgent: null,
  pdfUrl: null,
  createdAt: '2026-11-15T12:00:00.000Z',
  expiresAt: null,
};

describe('deliveryFeedback', () => {
  it('confirms when the link was queued', () => {
    expect(deliveryFeedback({ queued: true }, 'create')).toEqual({
      kind: 'success',
      message: 'Contrato enviado ao cliente pelo WhatsApp.',
    });
    expect(deliveryFeedback({ queued: true }, 'resend').message).toBe('Link reenviado ao cliente.');
  });

  it('warns with the API error when the link was not queued', () => {
    expect(deliveryFeedback({ queued: false, error: 'janela fechada' }, 'create')).toEqual({
      kind: 'warning',
      message: 'Contrato criado, mas o link não foi enviado: janela fechada',
    });
    expect(deliveryFeedback({ queued: false }, 'resend').message).toBe('O link não foi reenviado: motivo não informado');
  });

  it('treats a missing send (old API) as queued', () => {
    expect(deliveryFeedback(null, 'create').kind).toBe('success');
  });
});

describe('toContractDelivery', () => {
  it('splits status, link and send without leaking them into the contract', () => {
    const delivery = toContractDelivery(
      { ...CONTRACT, link: 'https://x/aceite/t', send: { queued: false, error: 'falhou' } },
      (c) => c,
    );
    expect(delivery.link).toBe('https://x/aceite/t');
    expect(delivery.send).toEqual({ queued: false, messageId: undefined, error: 'falhou' });
    expect(delivery.contract).toEqual(CONTRACT);
  });

  it('returns null link and send when absent or malformed', () => {
    const delivery = toContractDelivery({ ...CONTRACT, link: '', send: { foo: 1 } }, (c) => c);
    expect(delivery.link).toBeNull();
    expect(delivery.send).toBeNull();
  });
});

describe('canResendContract', () => {
  it('allows resend only for pending or expired contracts', () => {
    expect(canResendContract('PENDING')).toBe(true);
    expect(canResendContract('EXPIRED')).toBe(true);
    expect(canResendContract('SIGNED')).toBe(false);
    expect(canResendContract('CANCELED')).toBe(false);
  });
});
