import { describe, expect, it } from 'vitest';
import { indexByExternalId, resolveQuote } from './quote';

const loaded = [
  { id: 'm1', externalId: 'wamid.COT', type: 'TEXT', direction: 'OUTBOUND', content: { text: 'Cotação: 4 ingressos' }, senderName: null, sender: { name: 'Kleber' } },
  { id: 'm2', externalId: 'wamid.CLI', type: 'IMAGE', direction: 'INBOUND', content: { caption: 'essa foto' }, senderName: 'Ana', sender: null },
] as any[];
const byExternalId = indexByExternalId(loaded);

describe('resolveQuote', () => {
  it('não mostra nada para resposta a story ou anúncio', () => {
    expect(resolveQuote({ story: { id: 's' } } as any, byExternalId)).toBeNull();
    expect(resolveQuote({ ad: { id: 'a' }, externalMessageId: 'x' } as any, byExternalId)).toBeNull();
    expect(resolveQuote(undefined, byExternalId)).toBeNull();
  });

  it('usa a prévia gravada pelo servidor', () => {
    expect(resolveQuote({ externalMessageId: 'x', messageId: 'm9', previewText: 'oi', senderName: 'Kleber' }, byExternalId))
      .toEqual({ messageId: 'm9', previewText: 'oi', senderName: 'Kleber' });
  });

  it('citação antiga (só o id): acha a original entre as mensagens carregadas', () => {
    expect(resolveQuote({ externalMessageId: 'wamid.COT' }, byExternalId))
      .toEqual({ messageId: 'm1', previewText: 'Cotação: 4 ingressos', senderName: 'Kleber' });
    expect(resolveQuote({ externalMessageId: 'wamid.CLI' }, byExternalId))
      .toEqual({ messageId: 'm2', previewText: 'essa foto', senderName: 'Ana' });
  });

  it('original fora do histórico carregado: avisa em vez de sumir', () => {
    expect(resolveQuote({ externalMessageId: 'wamid.NADA' }, byExternalId))
      .toEqual({ previewText: 'Mensagem citada (fora do histórico carregado)' });
  });
});
