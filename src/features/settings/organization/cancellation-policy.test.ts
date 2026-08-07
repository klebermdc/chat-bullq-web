import { describe, test, expect } from 'vitest';
import { normalizeCancellationPolicy } from './service';

describe('normalizeCancellationPolicy', () => {
  test('devolve null quando o campo está vazio', () => {
    expect(normalizeCancellationPolicy('')).toBeNull();
  });

  // O dono "apaga" a política selecionando tudo e deletando, o que costuma
  // deixar espaço/quebra de linha para trás. Isso tem que virar null, senão a
  // org fica com uma política de zero caractere e o aceite renderiza um bloco
  // em branco no celular do cliente.
  test('devolve null quando o campo só tem espaços e quebras de linha', () => {
    expect(normalizeCancellationPolicy('   \n\n  \t ')).toBeNull();
  });

  test('apara as bordas mas preserva as quebras de linha internas', () => {
    const escrito = '\n  Cancelamento em até 7 dias.\n\nApós isso, sem reembolso.  \n';

    expect(normalizeCancellationPolicy(escrito)).toBe(
      'Cancelamento em até 7 dias.\n\nApós isso, sem reembolso.',
    );
  });
});
