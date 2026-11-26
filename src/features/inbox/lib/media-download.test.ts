import { describe, expect, it } from 'vitest';
import { mediaDownloadName } from './media-download';

const AT = '2026-11-18T18:00:00.000Z';

describe('mediaDownloadName', () => {
  it('usa o nome original do arquivo quando a mensagem tem', () => {
    expect(mediaDownloadName({ fileName: 'comprovante.pdf', mimeType: 'application/pdf', createdAt: AT, kind: 'IMAGE' }))
      .toBe('comprovante.pdf');
  });

  it('monta nome com data e extensão do mime quando não há nome', () => {
    expect(mediaDownloadName({ mimeType: 'image/jpeg', createdAt: AT, kind: 'IMAGE' }))
      .toBe('imagem-2026-11-18.jpg');
  });

  it('ignora parâmetros do mime e usa a extensão certa para vídeo', () => {
    expect(mediaDownloadName({ mimeType: 'video/mp4; codecs=avc1', createdAt: AT, kind: 'VIDEO' }))
      .toBe('video-2026-11-18.mp4');
  });

  it('cai no padrão da categoria quando o mime é desconhecido', () => {
    expect(mediaDownloadName({ createdAt: AT, kind: 'IMAGE' })).toBe('imagem-2026-11-18.jpg');
    expect(mediaDownloadName({ createdAt: AT, kind: 'VIDEO' })).toBe('video-2026-11-18.mp4');
  });

  it('não quebra com data inválida', () => {
    expect(mediaDownloadName({ mimeType: 'image/png', createdAt: 'x', kind: 'IMAGE' })).toBe('imagem.png');
  });

  it('tira barras do nome original para não virar caminho', () => {
    expect(mediaDownloadName({ fileName: '../a/b.png', createdAt: AT, kind: 'IMAGE' })).toBe('.._a_b.png');
  });
});
