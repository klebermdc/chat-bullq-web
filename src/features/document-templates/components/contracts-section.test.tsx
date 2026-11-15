import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { ContractStatus } from '../types';
import { ContractsSection } from './contracts-section';

const CONVERSATION_ID = 'conv1';

const contract = (id: string, status: ContractStatus['status']): ContractStatus => ({
  id,
  status,
  kind: 'CONTRACT',
  title: `Contrato ${id}`,
  items: [],
  signedAt: null,
  signerName: null,
  signerIp: null,
  signerUserAgent: null,
  pdfUrl: null,
  createdAt: '2026-11-15T12:00:00.000Z',
  expiresAt: null,
});

function html(contracts: ContractStatus[], links: Record<string, string> = {}) {
  const client = new QueryClient();
  client.setQueryData(['conversation-contracts', CONVERSATION_ID], contracts);
  client.setQueryData(['contract-links', CONVERSATION_ID], links);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ContractsSection conversationId={CONVERSATION_ID} />
    </QueryClientProvider>,
  );
}

const count = (out: string, text: string) => out.split(text).length - 1;

describe('ContractsSection', () => {
  it('offers resend only for pending and expired contracts', () => {
    const out = html([contract('a', 'PENDING'), contract('b', 'EXPIRED'), contract('c', 'SIGNED'), contract('d', 'CANCELED')]);
    expect(count(out, 'Reenviar link')).toBe(2);
  });

  it('offers copy only when this session knows the link', () => {
    const out = html([contract('a', 'PENDING'), contract('b', 'PENDING')], { a: 'https://x/aceite/t' });
    expect(count(out, 'Copiar link')).toBe(1);
  });

  it('shows the empty state and the new contract button', () => {
    const out = html([]);
    expect(out).toContain('Nenhum contrato enviado nesta conversa.');
    expect(out).toContain('Novo contrato');
  });
});
