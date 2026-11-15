import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => get(...args) } }));

import { EMAILS_PAGE_SIZE, mailboxService } from './mailbox.service';

const PAGE = { emails: [], pagination: { page: 2, limit: 20, total: 0, totalPages: 0 } };

describe('mailboxService', () => {
  beforeEach(() => get.mockReset());

  it('e-mails do contato: rota, página e envelope { data }', async () => {
    get.mockResolvedValue({ data: { data: PAGE } });
    await expect(mailboxService.listContactEmails('c1', 2)).resolves.toBe(PAGE);
    expect(get).toHaveBeenCalledWith('/contacts/c1/emails', { params: { page: 2, limit: EMAILS_PAGE_SIZE } });
  });

  it('detalhe do e-mail', async () => {
    const email = { id: 'e1' };
    get.mockResolvedValue({ data: { data: email } });
    await expect(mailboxService.getEmail('e1')).resolves.toBe(email);
    expect(get).toHaveBeenCalledWith('/emails/e1');
  });

  it('caixa inteira: ?unlinked=true só com o filtro "Sem cliente"', async () => {
    get.mockResolvedValue({ data: { data: PAGE } });
    await mailboxService.listMailboxEmails('mb1', 1, true);
    expect(get).toHaveBeenLastCalledWith('/mailboxes/mb1/emails', {
      params: { page: 1, limit: EMAILS_PAGE_SIZE, unlinked: 'true' },
    });
    await mailboxService.listMailboxEmails('mb1', 1, false);
    expect(get).toHaveBeenLastCalledWith('/mailboxes/mb1/emails', { params: { page: 1, limit: EMAILS_PAGE_SIZE } });
  });

  it('status das caixas', async () => {
    get.mockResolvedValue({ data: { data: [{ id: 'mb1' }] } });
    await expect(mailboxService.listMailboxes()).resolves.toEqual([{ id: 'mb1' }]);
    expect(get).toHaveBeenCalledWith('/mailboxes');
  });

  it('anexo vem como blob, com prazo maior que o padrão', async () => {
    const blob = new Blob(['%PDF']);
    get.mockResolvedValue({ data: blob });
    await expect(mailboxService.fetchAttachment('e1', 'a1')).resolves.toBe(blob);
    const [url, config] = get.mock.calls[0];
    expect(url).toBe('/emails/e1/attachments/a1');
    expect(config.responseType).toBe('blob');
    expect(config.timeout).toBeGreaterThan(15_000);
  });
});
