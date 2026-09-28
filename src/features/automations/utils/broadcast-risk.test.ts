import { describe, expect, it } from 'vitest';
import { isBroadcastRisk } from './broadcast-risk';

const send = { type: 'send_message' as const, params: { text: 'Oi!' } };
const tag = { type: 'add_tag' as const, params: { tagId: 't1' } };
const rule = { field: 'channel.id', op: 'equals' as const, value: 'c1' };

describe('isBroadcastRisk', () => {
  it('acusa mensagem recebida, sem condição, que envia mensagem', () => {
    expect(isBroadcastRisk({ trigger: 'MESSAGE_RECEIVED', conditions: {}, actions: [send] })).toBe(true);
  });

  it('acusa quando os grupos de condição existem mas estão vazios', () => {
    const conditions = { match: 'AND' as const, groups: [{ match: 'AND' as const, rules: [] }] };
    expect(isBroadcastRisk({ trigger: 'MESSAGE_RECEIVED', conditions, actions: [tag, send] })).toBe(true);
  });

  it('libera quando há pelo menos uma condição', () => {
    const conditions = { match: 'AND' as const, groups: [{ match: 'AND' as const, rules: [rule] }] };
    expect(isBroadcastRisk({ trigger: 'MESSAGE_RECEIVED', conditions, actions: [send] })).toBe(false);
  });

  it('libera quando a automação não manda mensagem ao cliente', () => {
    expect(isBroadcastRisk({ trigger: 'MESSAGE_RECEIVED', conditions: {}, actions: [tag] })).toBe(false);
  });

  it('libera outros gatilhos, que já são eventos específicos', () => {
    expect(isBroadcastRisk({ trigger: 'TAG_ADDED', conditions: {}, actions: [send] })).toBe(false);
  });
});
