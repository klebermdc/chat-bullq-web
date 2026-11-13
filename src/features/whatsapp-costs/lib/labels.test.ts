import { describe, expect, it } from 'vitest';
import {
  categoryLabel,
  categoryShortLabel,
  isChargedType,
  isMarketingCategory,
  senderKindLabel,
  typeLabel,
} from './labels';

describe('categoryLabel', () => {
  it('traduz as categorias da Meta para português simples', () => {
    expect(categoryLabel('SERVICE')).toBe('Respostas (24h)');
    expect(categoryLabel('MARKETING')).toBe('Templates de marketing');
    expect(categoryLabel('UTILITY')).toBe('Templates de utilidade');
    expect(categoryLabel('AUTHENTICATION')).toBe('Códigos de verificação');
  });

  it('aceita minúsculas e manda o desconhecido para "Outros"', () => {
    expect(categoryLabel('marketing')).toBe('Templates de marketing');
    expect(categoryLabel('REFERRAL_CONVERSION')).toBe('Outros');
    expect(categoryLabel(null)).toBe('Outros');
  });

  it('tem versão curta para legenda', () => {
    expect(categoryShortLabel('SERVICE')).toBe('Respostas 24h');
    expect(categoryShortLabel('AUTHENTICATION')).toBe('Autenticação');
    expect(categoryShortLabel('X')).toBe('Outros');
  });
});

describe('typeLabel e isChargedType', () => {
  it('diz se a mensagem foi cobrada ou por que foi grátis', () => {
    expect(typeLabel('REGULAR')).toBe('Cobradas');
    expect(typeLabel('FREE_ENTRY_POINT')).toBe('Grátis: vieram de anúncio');
    expect(typeLabel('FREE_CUSTOMER_SERVICE')).toBe('Grátis: franquia da Meta');
    expect(typeLabel('NOVO_TIPO')).toBe('Outra situação');
  });

  it('só REGULAR conta como cobrada', () => {
    expect(isChargedType('REGULAR')).toBe(true);
    expect(isChargedType('FREE_ENTRY_POINT')).toBe(false);
    expect(isChargedType('NOVO_TIPO')).toBe(false);
  });
});

describe('isMarketingCategory e senderKindLabel', () => {
  it('reconhece marketing e nomeia quem enviou', () => {
    expect(isMarketingCategory('MARKETING')).toBe(true);
    expect(isMarketingCategory('UTILITY')).toBe(false);
    expect(isMarketingCategory(null)).toBe(false);
    expect(senderKindLabel('agent')).toBe('Vendedor');
    expect(senderKindLabel('ai')).toBe('IA');
    expect(senderKindLabel('system')).toBe('Sistema');
  });
});
