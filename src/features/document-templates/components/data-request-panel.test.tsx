// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataRequestPanel } from './data-request-panel';

const { requestClientData, toast } = vi.hoisted(() => ({
  requestClientData: vi.fn(),
  toast: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/document-templates.service', () => ({
  documentTemplatesService: { requestClientData },
}));
vi.mock('sonner', () => ({ toast }));

const TEXT = 'Olá, Ana! Para o contrato, me envie: CPF e RG.';
const PREVIEW = { ok: true, text: TEXT, fields: ['[CPF]', '[RG]'], send: null };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const onClose = vi.fn();

async function flush() {
  // O react-query avisa a tela num setTimeout(0): espera alguns ciclos.
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <DataRequestPanel conversationId="conv1" templateId="tpl1" onClose={onClose} />
      </QueryClientProvider>,
    );
  });
  await flush();
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(label));
  if (!found) throw new Error(`Botão "${label}" não encontrado`);
  return found;
}

async function click(label: string) {
  await act(async () => {
    button(label).click();
  });
  await flush();
}

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DataRequestPanel', () => {
  it('shows the message preview and the requested fields', async () => {
    requestClientData.mockResolvedValueOnce(PREVIEW);
    await renderPanel();
    expect(requestClientData).toHaveBeenCalledWith('conv1', 'tpl1', false);
    expect(container.textContent).toContain(TEXT);
    expect(container.textContent).toContain('CPF, RG');
  });

  it('copies the text to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    requestClientData.mockResolvedValueOnce(PREVIEW);
    await renderPanel();
    await click('Copiar');
    expect(writeText).toHaveBeenCalledWith(TEXT);
    expect(toast.success).toHaveBeenCalledWith('Texto copiado.');
  });

  it('sends in the conversation and closes on success', async () => {
    requestClientData.mockResolvedValueOnce(PREVIEW).mockResolvedValueOnce({ ...PREVIEW, send: { queued: true } });
    await renderPanel();
    await click('Enviar na conversa');
    expect(requestClientData).toHaveBeenLastCalledWith('conv1', 'tpl1', true);
    expect(toast.success).toHaveBeenCalledWith('Pedido de dados enviado ao cliente.');
    expect(onClose).toHaveBeenCalled();
  });

  it('warns with the send error and offers to copy when it was not sent', async () => {
    requestClientData
      .mockResolvedValueOnce(PREVIEW)
      .mockResolvedValueOnce({ ...PREVIEW, send: { queued: false, error: 'janela de 24h fechada' } });
    await renderPanel();
    await click('Enviar na conversa');
    const [message, options] = toast.warning.mock.calls[0];
    expect(message).toContain('janela de 24h fechada');
    expect(options.action.label).toBe('Copiar texto');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('explains when nothing is missing (422)', async () => {
    requestClientData.mockResolvedValueOnce({ ok: false, message: 'Já temos todos os dados do cliente para este modelo.' });
    await renderPanel();
    expect(container.textContent).toContain('Já temos todos os dados do cliente');
    expect(container.textContent).not.toContain('Enviar na conversa');
  });
});
