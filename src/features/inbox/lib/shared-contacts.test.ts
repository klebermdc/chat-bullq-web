import { describe, expect, it } from 'vitest';
import { dialablePhone, sharedContactsOf } from './shared-contacts';

describe('sharedContactsOf', () => {
  it('lê os contatos compartilhados da mensagem', () => {
    const content = {
      text: '👤 João',
      contacts: [{ name: 'João', phones: [{ phone: '+55 11 98201-5967', waId: '5511982015967' }] }],
    };
    expect(sharedContactsOf(content)).toEqual(content.contacts);
  });

  it('ignora mensagem sem contatos ou com formato inválido', () => {
    expect(sharedContactsOf({ text: 'oi' })).toEqual([]);
    expect(sharedContactsOf({ contacts: 'x' })).toEqual([]);
    expect(sharedContactsOf(undefined)).toEqual([]);
  });

  it('descarta entradas quebradas e telefones sem número', () => {
    const out = sharedContactsOf({
      contacts: [null, { name: 'A', phones: [{ phone: '' }, { phone: '119' }, 3] }, { phones: [] }],
    });
    expect(out).toEqual([
      { name: 'A', phones: [{ phone: '119' }] },
      { name: 'Contato', phones: [] },
    ]);
  });
});

describe('dialablePhone', () => {
  it('prefere o waid', () => {
    expect(dialablePhone({ phone: '+55 11 98201-5967', waId: '5511982015967' })).toBe('5511982015967');
  });
  it('sem waid, mantém o + e os dígitos', () => {
    expect(dialablePhone({ phone: '+55 (21) 99999-0000' })).toBe('+5521999990000');
    expect(dialablePhone({ phone: '(21) 99999-0000' })).toBe('21999990000');
  });
});
