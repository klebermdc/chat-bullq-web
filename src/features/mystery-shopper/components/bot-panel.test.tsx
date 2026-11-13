import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SimulatorBot } from '../api';
import { BotPanel } from './bot-panel';

const noop = () => undefined;
const render = (bot: SimulatorBot | null) =>
  renderToStaticMarkup(<BotPanel bot={bot} isStarting={false} isStopping={false} onStart={noop} onStop={noop} />);
const base: SimulatorBot = { status: 'ACTIVE', persona: 'p', clientMessages: 4, lastError: null };

describe('BotPanel', () => {
  it('sem robô: campo rotulado, limite e botão desabilitado', () => {
    const html = render(null);
    expect(html).toContain('for="sim-persona"');
    expect(html).toContain('Cenário do cliente');
    expect(html).toContain('maxLength="2000"');
    expect(html).toContain('Iniciar visita com IA');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*Iniciar visita com IA/);
    expect(html).not.toContain('Parar robô');
  });

  it('mostra a dica de mínimo enquanto o cenário é inválido', () => {
    expect(render(null)).toContain('Mínimo de 10 caracteres');
  });

  it('carregando: esconde o formulário', () => {
    const html = renderToStaticMarkup(
      <BotPanel bot={null} isLoading isStarting={false} isStopping={false} onStart={noop} onStop={noop} />,
    );
    expect(html).toContain('Verificando o robô');
    expect(html).not.toContain('sim-persona');
  });

  it('ENDED e STOPPED mostram aviso acima do formulário', () => {
    expect(render({ ...base, status: 'ENDED' })).toContain('Visita encerrada pelo robô.');
    const stopped = render({ ...base, status: 'STOPPED' });
    expect(stopped).toContain('Robô parado.');
    expect(stopped).toContain('sim-persona');
  });

  it('ACTIVE: selo com contagem e botão Parar robô, sem formulário', () => {
    const html = render(base);
    expect(html).toContain('Robô conversando (4 mensagens)');
    expect(html).toContain('Parar robô');
    expect(html).not.toContain('sim-persona');
  });

  it('CLOSING: selo de follow-up', () => {
    const html = render({ ...base, status: 'CLOSING' });
    expect(html).toContain('Robô aguardando follow-up');
    expect(html).toContain('Parar robô');
  });

  it('FAILED: mostra o erro e o formulário', () => {
    const html = render({ ...base, status: 'FAILED', lastError: 'LLM indisponível' });
    expect(html).toContain('role="alert"');
    expect(html).toContain('LLM indisponível');
    expect(html).toContain('sim-persona');
  });
});
