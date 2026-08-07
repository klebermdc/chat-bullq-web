import { describe, expect, it } from 'vitest';
import { countFailedUploads, voucherPayload } from './voucher-payload';

describe('voucherPayload', () => {
  // Regressão: o filtro antigo era `status === 'done' && url`, então um PDF que
  // subiu mas cuja LEITURA falhou (401, 404, conexão caída) ficava de fora do
  // envio em silêncio — e o atendente lia "a caminho do cliente".
  it('envia o voucher que subiu mesmo quando a leitura pela IA falhou', () => {
    const payload = voucherPayload([
      { url: 'https://api.x/api/v1/uploads/media/2026-08-06/a.pdf', filename: 'a.pdf', size: 10 },
    ]);

    expect(payload).toEqual([
      { url: 'https://api.x/api/v1/uploads/media/2026-08-06/a.pdf', filename: 'a.pdf', size: 10 },
    ]);
  });

  it('não manda arquivo que nunca chegou ao storage', () => {
    const payload = voucherPayload([{ filename: 'falhou.pdf', size: 10 }]);

    expect(payload).toEqual([]);
  });

  it('separa o que subiu do que não subiu', () => {
    const payload = voucherPayload([
      { url: 'https://api.x/a.pdf', filename: 'a.pdf', size: 1 },
      { filename: 'b.pdf', size: 2 },
      { url: 'https://api.x/c.pdf', filename: 'c.pdf', size: 3 },
    ]);

    expect(payload.map((v) => v.filename)).toEqual(['a.pdf', 'c.pdf']);
  });

  it('devolve lista vazia sem anexo nenhum', () => {
    expect(voucherPayload([])).toEqual([]);
  });
});

describe('countFailedUploads', () => {
  it('conta só o que não tem URL', () => {
    expect(
      countFailedUploads([
        { url: 'https://api.x/a.pdf', filename: 'a.pdf', size: 1 },
        { filename: 'b.pdf', size: 2 },
        { filename: 'c.pdf', size: 3 },
      ]),
    ).toBe(2);
  });

  it('é zero quando tudo subiu', () => {
    expect(
      countFailedUploads([{ url: 'https://api.x/a.pdf', filename: 'a.pdf', size: 1 }]),
    ).toBe(0);
  });
});
