import { fold } from './quick-reply-match';

/** Uma mensagem do arquivo de importação (o JSON gerado a partir da Umbler). */
export interface ImportItem {
  shortcut: string;
  title: string;
  content: string;
  category: string | null;
  /** Nome do vendedor dono. Nulo = da equipe inteira. */
  owner: string | null;
}

export interface ImportPayload {
  shortcut: string;
  title: string;
  content: string;
  category: string | null;
  ownerUserId: string | null;
}

export interface ImportPlan {
  toCreate: ImportPayload[];
  /** Atalhos que já existem (na empresa ou repetidos no arquivo): ficam como estão. */
  existing: string[];
  /** Vendedor não achado ou ambíguo: não entra, para não virar mensagem da equipe. */
  unknownOwners: { shortcut: string; owner: string }[];
}

interface MemberLike {
  user: { id: string; name: string };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeShortcut(raw: string): string {
  return raw.trim().replace(/^\/+/, '').toLowerCase();
}

/** Lê o arquivo e confere o mínimo de cada item. Erro com mensagem para a tela. */
export function parseImportFile(raw: string): ImportItem[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!Array.isArray(data)) {
    throw new Error('O arquivo precisa ser uma lista de mensagens.');
  }
  return data.map((entry, index) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    const item: ImportItem = {
      shortcut: text(row.shortcut),
      title: text(row.title),
      content: typeof row.content === 'string' ? row.content.trim() : '',
      category: text(row.category) || null,
      owner: text(row.owner) || null,
    };
    if (!item.shortcut || !item.title || !item.content) {
      throw new Error(`O item ${index + 1} está sem atalho, título ou mensagem.`);
    }
    return item;
  });
}

function nameWords(name: string): string[] {
  return fold(name.trim()).split(/\s+/).filter(Boolean);
}

/** "Carolina" casa com "Carolina Lemos" (e vice-versa); "Gabriela Souza" não casa com "Gabriela Marcato". */
function isNamePrefix(a: string[], b: string[]): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length > 0 && shorter.every((word, i) => word === longer[i]);
}

/**
 * Nome completo igual; senão, o vendedor cujo nome é o começo do nome do
 * arquivo (ou o contrário), desde que só um case — na dúvida, ninguém.
 */
function findOwnerId(name: string, members: MemberLike[]): string | null {
  const wanted = nameWords(name);
  const exact = members.find((m) => nameWords(m.user.name).join(' ') === wanted.join(' '));
  if (exact) return exact.user.id;
  const byPrefix = members.filter((m) => isNamePrefix(nameWords(m.user.name), wanted));
  return byPrefix.length === 1 ? byPrefix[0].user.id : null;
}

/** Decide o que criar, o que já existe e o que fica de fora por falta de dono. */
export function planImport(items: ImportItem[], existingShortcuts: string[], members: MemberLike[]): ImportPlan {
  const seen = new Set(existingShortcuts.map(normalizeShortcut));
  return items.reduce<ImportPlan>(
    (plan, item) => {
      const shortcut = normalizeShortcut(item.shortcut);
      if (seen.has(shortcut)) {
        return plan.existing.includes(shortcut) ? plan : { ...plan, existing: [...plan.existing, shortcut] };
      }
      const ownerUserId = item.owner ? findOwnerId(item.owner, members) : null;
      if (item.owner && !ownerUserId) {
        return { ...plan, unknownOwners: [...plan.unknownOwners, { shortcut, owner: item.owner }] };
      }
      seen.add(shortcut);
      const payload: ImportPayload = {
        shortcut,
        title: item.title,
        content: item.content,
        category: item.category,
        ownerUserId,
      };
      return { ...plan, toCreate: [...plan.toCreate, payload] };
    },
    { toCreate: [], existing: [], unknownOwners: [] },
  );
}
