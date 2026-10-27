import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink, quoteContactLinks } from './whatsapp-link';

describe('buildWhatsAppLink', () => {
  it('monta o wa.me só com dígitos e o texto codificado', () => {
    expect(buildWhatsAppLink('+55 (11) 98888-7777', 'Oi, Ana! Quero fechar a cotação #8K2Q1Z')).toBe(
      'https://wa.me/5511988887777?text=Oi%2C%20Ana!%20Quero%20fechar%20a%20cota%C3%A7%C3%A3o%20%238K2Q1Z',
    );
  });

  it('sem telefone devolve null', () => {
    expect(buildWhatsAppLink(null, 'oi')).toBeNull();
    expect(buildWhatsAppLink('   ', 'oi')).toBeNull();
  });

  it('telefone curto demais (sem DDI/DDD) devolve null', () => {
    expect(buildWhatsAppLink('98887777', 'oi')).toBeNull();
  });
});

describe('quoteContactLinks', () => {
  const seller = { name: 'Ana Paula Souza', whatsapp: '5511988887777' };

  it('cotação ativa: fechar e dúvida com o código', () => {
    const links = quoteContactLinks({ seller, code: '8K2Q1Z', status: 'ACTIVE' });

    expect(links).not.toBeNull();
    expect(decodeURIComponent(links!.close.split('text=')[1])).toBe(
      'Oi, Ana! Quero fechar a cotação #8K2Q1Z',
    );
    expect(decodeURIComponent(links!.question.split('text=')[1])).toBe(
      'Tenho uma dúvida sobre a cotação #8K2Q1Z',
    );
  });

  it('cotação vencida: pede valores atualizados', () => {
    const links = quoteContactLinks({ seller, code: '8K2Q1Z', status: 'EXPIRED' });

    expect(decodeURIComponent(links!.close.split('text=')[1])).toBe(
      'Oi, Ana! Quero atualizar a cotação #8K2Q1Z',
    );
  });

  it('vendedor sem whatsapp: sem links', () => {
    expect(
      quoteContactLinks({ seller: { name: 'Ana', whatsapp: null }, code: 'X', status: 'ACTIVE' }),
    ).toBeNull();
  });
});
