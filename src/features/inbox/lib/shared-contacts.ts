export interface SharedContactPhone {
  phone: string;
  waId?: string;
  type?: string;
}

/** Cartão de contato que o cliente compartilhou (`content.contacts`). */
export interface SharedContact {
  name: string;
  phones: SharedContactPhone[];
  emails?: string[];
  org?: string;
}

function toPhone(raw: unknown): SharedContactPhone | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.phone !== 'string' || !p.phone.trim()) return null;
  const out: SharedContactPhone = { phone: p.phone };
  if (typeof p.waId === 'string' && p.waId) out.waId = p.waId;
  if (typeof p.type === 'string' && p.type) out.type = p.type;
  return out;
}

/** Lê `content.contacts` defensivamente — é dado vindo do provedor. */
export function sharedContactsOf(content: Record<string, unknown> | null | undefined): SharedContact[] {
  const raw = content?.contacts;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => {
      const out: SharedContact = {
        name: typeof c.name === 'string' && c.name.trim() ? c.name : 'Contato',
        phones: Array.isArray(c.phones)
          ? c.phones.map(toPhone).filter((p): p is SharedContactPhone => p !== null)
          : [],
      };
      if (Array.isArray(c.emails)) {
        const emails = c.emails.filter((e): e is string => typeof e === 'string' && !!e);
        if (emails.length) out.emails = emails;
      }
      if (typeof c.org === 'string' && c.org) out.org = c.org;
      return out;
    });
}

/** Número pra iniciar conversa: o `waid` do WhatsApp, senão os dígitos (com + se tinha). */
export function dialablePhone(p: SharedContactPhone): string {
  if (p.waId) return p.waId;
  const digits = p.phone.replace(/\D/g, '');
  return p.phone.trim().startsWith('+') ? `+${digits}` : digits;
}
