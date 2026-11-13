import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SimulatorChat } from './simulator-chat';

describe('SimulatorChat', () => {
  it('cliente à direita com tique azul quando lida; empresa à esquerda', () => {
    const html = renderToStaticMarkup(
      <SimulatorChat
        messages={[
          { id: '1', from: 'CLIENTE', text: 'Quero cotação', createdAt: '2026-11-13T10:00:00Z', status: 'READ' },
          { id: '2', from: 'EMPRESA', text: 'Olá!', createdAt: '2026-11-13T10:01:00Z', status: 'SENT' },
        ]}
      />,
    );
    expect(html).toContain('data-side="right"');
    expect(html).toContain('data-side="left"');
    expect(html).toContain('<span class="sr-only">lida</span>');
    expect(html).toContain('<span aria-hidden="true">✓✓</span>');
    expect(html).toContain('aria-live="polite"');
    expect(html.match(/class="sr-only">(enviada|entregue|lida)</g)).toHaveLength(1);
  });

  it('mostra orientação quando não há mensagens', () => {
    expect(renderToStaticMarkup(<SimulatorChat messages={[]} />)).toContain('Nenhuma mensagem ainda');
  });
});
