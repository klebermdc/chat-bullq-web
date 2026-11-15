import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EmailSummary, Mailbox } from '../services/mailbox.service';
import { ContactEmailsView, NO_CONTACT_EMAIL_TEXT, NO_EMAILS_TEXT } from './contact-emails-section';
import { EmailList, EmailRow } from './email-list';
import { ContactChips } from './mailbox-screen';
import { SyncStatusLine } from './sync-status-line';

const noop = () => {};

const email = (patch: Partial<EmailSummary> = {}): EmailSummary => ({
  id: 'e1',
  mailboxId: 'mb1',
  subject: 'Voucher Magic Kingdom',
  fromAddr: 'no-reply@disney.com',
  fromName: 'Disney',
  toAddrs: ['reservas@orlandofastpass.com.br'],
  ccAddrs: [],
  sentAt: '2026-11-02T12:00:00.000Z',
  snippet: 'Seu ingresso está confirmado',
  hasAttachments: false,
  ...patch,
});

const view = (patch: Partial<Parameters<typeof ContactEmailsView>[0]> = {}) =>
  renderToStaticMarkup(
    <ContactEmailsView
      emails={[]}
      isLoading={false}
      isError={false}
      hasContactEmail={true}
      hasMore={false}
      isFetchingMore={false}
      onLoadMore={noop}
      onRetry={noop}
      onOpen={noop}
      {...patch}
    />,
  );

describe('EmailRow', () => {
  const row = (e: EmailSummary) =>
    renderToStaticMarkup(
      <EmailList label="x">
        <EmailRow email={e} onOpen={noop} />
      </EmailList>,
    );

  it('mostra assunto e remetente', () => {
    const html = row(email());
    expect(html).toContain('Voucher Magic Kingdom');
    expect(html).toContain('Disney');
  });

  it('clipe só quando há anexo', () => {
    expect(row(email({ hasAttachments: true }))).toContain('aria-label="Com anexo"');
    expect(row(email())).not.toContain('Com anexo');
  });

  it('assunto vazio vira "(sem assunto)"', () => {
    expect(row(email({ subject: null }))).toContain('(sem assunto)');
  });
});

describe('ContactEmailsView', () => {
  it('vazio com e-mail cadastrado', () => {
    expect(view()).toContain(NO_EMAILS_TEXT);
  });

  it('vazio sem e-mail cadastrado pede para cadastrar', () => {
    const html = view({ hasContactEmail: false });
    expect(html).toContain(NO_CONTACT_EMAIL_TEXT);
    expect(html).not.toContain(NO_EMAILS_TEXT);
  });

  it('lista os e-mails e oferece "Carregar mais" só quando há mais', () => {
    const emails = [email(), email({ id: 'e2', subject: 'Reserva hotel' })];
    expect(view({ emails, hasMore: true })).toContain('Carregar mais');
    const html = view({ emails, hasMore: false });
    expect(html).toContain('Reserva hotel');
    expect(html).not.toContain('Carregar mais');
  });

  it('erro com botão de tentar de novo', () => {
    expect(view({ isError: true })).toContain('Tentar de novo');
  });
});

describe('ContactChips', () => {
  it('um chip por cliente; sem cliente avisa', () => {
    const html = renderToStaticMarkup(
      <ContactChips contacts={[{ id: 'c1', name: 'Ana Souza' }, { id: 'c2', name: null }]} onOpen={noop} />,
    );
    expect(html).toContain('Ana Souza');
    expect(html).toContain('Cliente sem nome');
    expect(renderToStaticMarkup(<ContactChips contacts={[]} onOpen={noop} />)).toContain('Sem cliente ligado');
  });
});

describe('SyncStatusLine', () => {
  const mailbox: Mailbox = {
    id: 'mb1',
    address: 'reservas@orlandofastpass.com.br',
    imapHost: 'imap.gmail.com',
    folder: null,
    enabled: true,
    lastUid: '1',
    lastSyncAt: '2026-11-15T14:55:00.000Z',
    lastError: null,
    passwordEnv: 'MAILBOX_RESERVAS_PASSWORD',
    messageCount: 1234,
  };
  const now = new Date('2026-11-15T15:00:00.000Z');

  it('mostra há quanto tempo sincronizou', () => {
    const html = renderToStaticMarkup(<SyncStatusLine mailbox={mailbox} now={now} />);
    expect(html).toContain('Última sincronização há 5 min');
    expect(html).toContain('reservas@orlandofastpass.com.br');
  });

  it('erro em vermelho (tom urgente) e como alerta', () => {
    const html = renderToStaticMarkup(
      <SyncStatusLine mailbox={{ ...mailbox, lastError: 'Invalid credentials' }} now={now} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('text-urgent-ink');
    expect(html).toContain('Invalid credentials');
  });
});
