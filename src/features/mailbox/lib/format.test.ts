import { describe, expect, it } from 'vitest';
import type { Mailbox } from '../services/mailbox.service';
import {
  NO_SUBJECT,
  formatFileSize,
  formatListDate,
  nextPageParam,
  senderLabel,
  subjectOf,
  syncStatus,
  timeAgo,
  uniqueContacts,
} from './format';

const NOW = new Date('2026-11-15T15:00:00');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const mailbox = (patch: Partial<Mailbox> = {}): Mailbox => ({
  id: 'mb1',
  address: 'reservas@orlandofastpass.com.br',
  imapHost: 'imap.gmail.com',
  folder: null,
  enabled: true,
  lastUid: '10',
  lastSyncAt: minutesAgo(3),
  lastError: null,
  passwordEnv: 'MAILBOX_RESERVAS_PASSWORD',
  messageCount: 42,
  ...patch,
});

describe('rótulos da linha', () => {
  it('assunto vazio vira "(sem assunto)"', () => {
    expect(subjectOf({ subject: '  ' })).toBe(NO_SUBJECT);
    expect(subjectOf({ subject: 'Voucher Disney' })).toBe('Voucher Disney');
  });

  it('remetente: nome, senão endereço', () => {
    expect(senderLabel({ fromName: 'Disney', fromAddr: 'no-reply@disney.com' })).toBe('Disney');
    expect(senderLabel({ fromName: null, fromAddr: 'no-reply@disney.com' })).toBe('no-reply@disney.com');
    expect(senderLabel({ fromName: null, fromAddr: null })).toBe('Remetente desconhecido');
  });

  it('data: hora quando é hoje, dia quando não é', () => {
    expect(formatListDate(new Date('2026-11-15T09:05:00').toISOString(), NOW)).toBe('09:05');
    expect(formatListDate(new Date('2026-11-02T09:05:00').toISOString(), NOW)).toBe('02/11/26');
    expect(formatListDate(null, NOW)).toBe('');
  });

  it('tamanho do anexo', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe('3,5 MB');
  });
});

describe('timeAgo', () => {
  it('minutos, horas e dias', () => {
    expect(timeAgo(minutesAgo(0), NOW)).toBe('agora há pouco');
    expect(timeAgo(minutesAgo(7), NOW)).toBe('há 7 min');
    expect(timeAgo(minutesAgo(125), NOW)).toBe('há 2 h');
    expect(timeAgo(minutesAgo(60 * 24), NOW)).toBe('há 1 dia');
    expect(timeAgo(minutesAgo(60 * 72), NOW)).toBe('há 3 dias');
  });
});

describe('syncStatus', () => {
  it('ok com a última sincronização recente', () => {
    expect(syncStatus(mailbox(), NOW)).toEqual({ tone: 'ok', text: 'Última sincronização há 3 min' });
  });

  it('erro vence tudo e aparece por extenso', () => {
    const status = syncStatus(mailbox({ lastError: 'AUTHENTICATIONFAILED' }), NOW);
    expect(status.tone).toBe('error');
    expect(status.text).toContain('AUTHENTICATIONFAILED');
  });

  it('atrasada, nunca sincronizada e desligada viram aviso', () => {
    expect(syncStatus(mailbox({ lastSyncAt: minutesAgo(45) }), NOW).tone).toBe('warning');
    expect(syncStatus(mailbox({ lastSyncAt: null }), NOW).text).toBe('Ainda não sincronizou');
    expect(syncStatus(mailbox({ enabled: false }), NOW).text).toBe('Sincronização desligada');
  });
});

describe('nextPageParam', () => {
  it('pede a próxima até a última página', () => {
    expect(nextPageParam({ emails: [], pagination: { page: 1, limit: 20, total: 45, totalPages: 3 } })).toBe(2);
    expect(nextPageParam({ emails: [], pagination: { page: 3, limit: 20, total: 45, totalPages: 3 } })).toBeUndefined();
    expect(nextPageParam({ emails: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })).toBeUndefined();
  });
});

describe('uniqueContacts', () => {
  it('um chip por cliente mesmo com dois papéis', () => {
    const contact = { id: 'c1', name: 'Ana' };
    const result = uniqueContacts([
      { role: 'FROM', contact },
      { role: 'CC', contact },
      { role: 'TO', contact: { id: 'c2', name: null } },
    ]);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});
