import { describe, expect, it } from 'vitest';
import { unreadPrintsNotice } from './unread-prints';

describe('unreadPrintsNotice', () => {
  it('sem falha (ou API antiga) não avisa', () => {
    expect(unreadPrintsNotice([], ['a.png'])).toBeNull();
    expect(unreadPrintsNotice(undefined, ['a.png'])).toBeNull();
  });

  it('cita o print pelo nome, no singular ou no plural', () => {
    expect(unreadPrintsNotice([2], ['a.png', 'b.png'])).toMatch(/^Não consegui ler o print "b.png"\. Ele ficou/);
    expect(unreadPrintsNotice([1, 3], ['a.png', 'b.png'])).toMatch(/os prints "a.png", "print 3"\. Eles ficaram/);
  });
});
