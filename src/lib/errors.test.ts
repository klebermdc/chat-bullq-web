import { describe, expect, it } from 'vitest';
import { getErrorMessage, translateApiMessage } from './errors';

describe('translateApiMessage', () => {
  it('traduz as mensagens de login que a API manda em inglês', () => {
    expect(translateApiMessage('Invalid credentials')).toBe('E-mail ou senha incorretos.');
    expect(translateApiMessage('Account is deactivated')).toBe(
      'Sua conta está desativada. Fale com o seu gestor.',
    );
    expect(translateApiMessage('Email already registered')).toBe('Este e-mail já está cadastrado.');
  });

  it('traduz queda de rede e timeout do axios', () => {
    expect(translateApiMessage('Network Error')).toMatch(/Sem conexão com o servidor/);
    expect(translateApiMessage('timeout of 30000ms exceeded')).toMatch(/demorou para responder/);
  });

  it('mantém mensagens que o backend já escreveu em português', () => {
    const msg = 'A atribuição desta conversa mudou enquanto você agia.';
    expect(translateApiMessage(msg)).toBe(msg);
  });
});

describe('getErrorMessage', () => {
  it('usa a mensagem do Error rejeitado pelo interceptor', () => {
    expect(getErrorMessage(new Error('Janela de 24h fechada'), 'Erro ao enviar')).toBe(
      'Janela de 24h fechada',
    );
  });

  it('lê response.data.message de clientes que ainda repassam o erro do axios', () => {
    const err = { response: { data: { message: 'Canal desconectado' } }, message: 'x' };
    expect(getErrorMessage(err, 'Erro')).toBe('Canal desconectado');
  });

  it('usa o primeiro item quando a validação devolve uma lista', () => {
    const err = { response: { data: { message: ['nome é obrigatório', 'telefone inválido'] } } };
    expect(getErrorMessage(err, 'Erro')).toBe('nome é obrigatório');
  });

  it('cai no texto da tela quando o axios só diz o status', () => {
    expect(getErrorMessage(new Error('Request failed with status code 500'), 'Erro ao salvar')).toBe(
      'Erro ao salvar',
    );
  });

  it('cai no texto da tela quando não há mensagem nenhuma', () => {
    expect(getErrorMessage(undefined, 'Erro ao salvar')).toBe('Erro ao salvar');
    expect(getErrorMessage(new Error(''), 'Erro ao salvar')).toBe('Erro ao salvar');
    expect(getErrorMessage('qualquer coisa', 'Erro ao salvar')).toBe('Erro ao salvar');
  });

  it('traduz rede caída mesmo vindo pelo interceptor', () => {
    expect(getErrorMessage(new Error('Network Error'), 'Erro ao salvar')).toMatch(/Sem conexão/);
  });
});
