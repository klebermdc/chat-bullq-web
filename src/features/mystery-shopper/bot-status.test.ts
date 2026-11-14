import { describe, expect, it } from 'vitest';
import type { SimulatorBot } from './api';
import { describeBot, isBriefValid, isPersonaValid, undoSnapshot } from './bot-status';

const bot = (over: Partial<SimulatorBot>): SimulatorBot => ({
  status: 'ACTIVE',
  persona: 'x',
  clientMessages: 3,
  lastError: null,
  ...over,
});

describe('describeBot', () => {
  it('sem robô: formulário, sem selo', () => {
    expect(describeBot(null)).toEqual({ badge: null, canStop: false, showForm: true, error: null, notice: null });
  });

  it('ACTIVE mostra contagem e permite parar', () => {
    const v = describeBot(bot({ clientMessages: 3 }));
    expect(v.badge).toBe('🤖 Robô conversando (3 mensagens)');
    expect(v.canStop).toBe(true);
    expect(v.showForm).toBe(false);
  });

  it('ACTIVE usa singular com 1 mensagem', () => {
    expect(describeBot(bot({ clientMessages: 1 })).badge).toBe('🤖 Robô conversando (1 mensagem)');
  });

  it('CLOSING aguarda follow-up e permite parar', () => {
    const v = describeBot(bot({ status: 'CLOSING' }));
    expect(v.badge).toBe('🤖 Robô aguardando follow-up');
    expect(v.canStop).toBe(true);
  });

  it.each([
    ['ENDED', 'Visita encerrada pelo robô.'],
    ['STOPPED', 'Robô parado.'],
  ] as const)('%s volta ao formulário com aviso e sem erro', (status, notice) => {
    expect(describeBot(bot({ status }))).toEqual({ badge: null, canStop: false, showForm: true, error: null, notice });
  });

  it('FAILED mostra lastError e o formulário', () => {
    const v = describeBot(bot({ status: 'FAILED', lastError: 'LLM indisponível' }));
    expect(v.error).toBe('LLM indisponível');
    expect(v.showForm).toBe(true);
  });

  it('FAILED sem lastError usa texto padrão', () => {
    expect(describeBot(bot({ status: 'FAILED', lastError: null })).error).toBe('O robô parou por um erro.');
  });
});

describe('isPersonaValid', () => {
  it('exige 10 caracteres úteis', () => {
    expect(isPersonaValid('         a')).toBe(false);
    expect(isPersonaValid('1234567890')).toBe(true);
  });
});

describe('isBriefValid', () => {
  it('exige de 5 a 500 caracteres sem contar espaços nas pontas', () => {
    expect(isBriefValid('   abcd   ')).toBe(false);
    expect(isBriefValid('casal')).toBe(true);
    expect(isBriefValid('a'.repeat(500))).toBe(true);
    expect(isBriefValid('a'.repeat(501))).toBe(false);
  });
});

describe('undoSnapshot', () => {
  it('guarda o texto anterior só quando havia conteúdo', () => {
    expect(undoSnapshot('')).toBeNull();
    expect(undoSnapshot('   ')).toBeNull();
    expect(undoSnapshot('cliente antigo')).toBe('cliente antigo');
  });
});
