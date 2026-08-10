import type { AcceptanceItem, AcceptancePassenger } from './types';

/**
 * De onde veio um item. A ordem importa: é a precedência da mescla.
 *
 * - `ficha`  — rascunho da Ficha do Pedido: o que o cliente PEDIU.
 * - `pdf`    — leitura automática do voucher anexado. Boa quando o PDF tem
 *              camada de texto, chutada quando é escaneado.
 * - `texto`  — texto que o atendente colou. É o único que passou por um humano
 *              de propósito, então ganha de todo o resto.
 */
export type VoucherSource = 'ficha' | 'pdf' | 'texto';

const SOURCE_RANK: Record<VoucherSource, number> = { ficha: 0, pdf: 1, texto: 2 };

/**
 * Item enquanto ele mora no formulário do modal.
 *
 * O `source` é ESCRITURAÇÃO DA MESCLA, não um campo do aceite: existe só para
 * a próxima mescla saber quem já escreveu ali e não deixar uma fonte mais fraca
 * apagar o que uma mais forte curou. Como o item vai inteiro pro backend num
 * spread, passe por `stripSource` antes de enviar.
 */
export interface SourcedItem extends AcceptanceItem {
  source?: VoucherSource;
}

/**
 * Texto normalizado para comparação: sem acento, em minúscula e com o espaço
 * colapsado. Evita tratar "Ingresso Único" e "ingresso unico" como coisas
 * diferentes, que é como a Ficha do Pedido e o voucher costumam divergir.
 */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    // Remove as marcas de acento que o NFD separou. Mantenha o escape
    // \u0300-\u036f: escrever o intervalo com os caracteres literais funciona,
    // mas eles são invisíveis no editor e somem no primeiro "limpa arquivo".
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Campo de texto do item, ou `undefined` quando aquele lado não informou. */
function itemField(item: AcceptanceItem, field: 'date' | 'ref'): string | undefined {
  return item[field]?.trim() || undefined;
}

/**
 * Dois itens são o mesmo quando a descrição normalizada bate e nem a data nem
 * o localizador se contradizem.
 *
 * Nos dois casos vale a mesma regra: o campo só SEPARA quando os DOIS lados
 * têm um para comparar. A Ficha do Pedido costuma vir sem data e o voucher
 * sempre traz a sua; o texto colado costuma vir sem localizador e o PDF traz o
 * dele. Exigir o campo dos dois lados duplicaria a linha justamente no caso
 * comum, e ignorá-lo funde ingressos diferentes.
 *
 * O localizador entrar aqui é o que impede a regressão pela porta de trás: o
 * modal mescla UMA VEZ POR FONTE (um PDF por arquivo, mais o texto colado), e o
 * consumo por índice lá embaixo só protege itens que chegam na MESMA leva. Sem
 * esta linha, o segundo voucher do mesmo parque no mesmo dia casava com o
 * primeiro e sobrescrevia o localizador dele — um ingresso sumindo de um
 * documento que o cliente assina.
 */
function isSameItem(a: AcceptanceItem, b: AcceptanceItem): boolean {
  if (normalizeText(a.description) !== normalizeText(b.description)) return false;

  return (['date', 'ref'] as const).every((field) => {
    const valueA = itemField(a, field);
    const valueB = itemField(b, field);
    if (valueA === undefined || valueB === undefined) return true;
    // Normalizado como a descrição: o mesmo localizador sai "JTT-1" de uma
    // fonte e "jtt-1" de outra, e tratá-los como ingressos distintos criaria a
    // linha duplicada que a mescla existe para evitar.
    return normalizeText(valueA) === normalizeText(valueB);
  });
}

/**
 * "Esse campo traz informação?" — a pergunta que governa a mescla inteira.
 *
 * String em branco, `null`, `undefined` e lista vazia são AUSÊNCIA, não valor:
 * uma fonte que não falou sobre um campo não pode apagar o que a outra falou.
 * `0` e `false` são valor de verdade (não cabe a nós reinterpretar um `qty: 0`).
 */
function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Cópia rasa de valores de campo, para nenhum array voltar por referência. */
function copyValue(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((v) => (v && typeof v === 'object' ? { ...v } : v));
}

/** Cópia do item, incluindo a lista de passageiros (que é aninhada). */
function copyItem(item: SourcedItem): SourcedItem {
  const copy: SourcedItem = { ...item };
  if (Array.isArray(item.passengers)) {
    copy.passengers = item.passengers.map((p) => ({ ...p }));
  }
  return copy;
}

/**
 * Ponte para varrer um item chave a chave. A varredura genérica é de propósito
 * (campo novo da API atravessa a mescla em vez de sumir), e ela precisa de um
 * índice que o tipo do item não tem.
 */
function asRecord(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

/** Completa os campos vazios de `target` com o que `donor` tiver. */
function fillBlanks<T extends object>(target: T, donor: T): T {
  const out = asRecord({ ...target });
  for (const key of Object.keys(donor)) {
    const donated = asRecord(donor)[key];
    if (!hasValue(out[key]) && hasValue(donated)) out[key] = donated;
  }
  return out as unknown as T;
}

/**
 * Mescla de `passengers`: **a lista da fonte vencedora manda no elenco; a
 * perdedora só preenche lacuna de quem já está na lista.**
 *
 * Por que não unir as duas listas: a lista de passageiros de um voucher é
 * COMPLETA por natureza — ela diz quem vai naquele ingresso, não "alguns dos
 * que vão". Duas listas para o mesmo item são duas VERSÕES do mesmo elenco, não
 * duas metades. Unir transformaria "MARIA SILVA" e "Maria Silva" em dois
 * passageiros e mostraria 4 nomes num ingresso de 2 — num documento que o
 * cliente assina, elenco inflado é pior que dado faltando, porque parece erro
 * logo onde ele mais precisa confiar.
 *
 * Por que também não descartar a perdedora: se o texto colado trouxe os nomes
 * sem a data de nascimento e o PDF trouxe as duas coisas, jogar o PDF fora
 * perderia informação de graça. Então o elenco é da vencedora e, para cada
 * passageiro dela, os campos em branco são completados pelo homônimo da outra
 * lista. O elenco nunca cresce nem encolhe numa mescla — só deixa de ter buraco.
 */
function mergePassengers(
  winner: AcceptancePassenger[],
  loser: AcceptancePassenger[],
): AcceptancePassenger[] {
  return winner.map((passenger) => {
    const twin = loser.find(
      (other) => normalizeText(other.name ?? '') === normalizeText(passenger.name ?? ''),
    );
    return twin ? fillBlanks({ ...passenger }, twin) : { ...passenger };
  });
}

/**
 * Mescla CAMPO A CAMPO dois itens que casaram.
 *
 * Duas regras, nesta ordem:
 * 1. campo sem valor na entrada nunca apaga o que já existe;
 * 2. a fonte de maior precedência sobrescreve; a de menor só preenche buraco.
 *
 * Substituir o item inteiro (o que este arquivo fazia) destruía informação com
 * duas fontes: se o PDF trouxe o localizador e o texto colado não traz, o
 * localizador sumia — de um documento que o cliente assina.
 *
 * A varredura é sobre as chaves da entrada, não sobre uma lista fixa de campos:
 * quando a API acrescentar um campo novo ao item, ele atravessa a mescla em vez
 * de ser silenciosamente descartado aqui.
 */
function mergeItem(
  base: SourcedItem,
  incoming: SourcedItem,
  incomingSource: VoucherSource,
): SourcedItem {
  const baseSource = base.source ?? 'ficha';
  // `>=` e não `>`: dois PDFs têm a mesma força, e aí a leitura mais recente
  // vale — era o comportamento de antes e não há motivo para mudá-lo.
  const incomingWins = SOURCE_RANK[incomingSource] >= SOURCE_RANK[baseSource];
  const out = asRecord(copyItem(base));

  for (const key of Object.keys(incoming)) {
    if (key === 'source') continue; // escrituração, não é dado do aceite
    const next = asRecord(incoming)[key];
    if (!hasValue(next)) continue;

    const current = out[key];

    // Passageiros são o único campo com regra própria — e vale para os dois
    // lados: mesmo perdendo, a fonte fraca ainda completa nascimento faltando.
    if (key === 'passengers' && hasValue(current)) {
      const a = next as AcceptancePassenger[];
      const b = current as AcceptancePassenger[];
      out[key] = incomingWins ? mergePassengers(a, b) : mergePassengers(b, a);
      continue;
    }

    if (!hasValue(current) || incomingWins) out[key] = copyValue(next);
  }

  out.source = incomingWins ? incomingSource : baseSource;
  return out as unknown as SourcedItem;
}

/**
 * Mescla os itens lidos de uma fonte (`incoming`) nos itens que já estão no
 * formulário (`base`).
 *
 * Precedência: **texto colado > PDF > rascunho da Ficha do Pedido**. A Ficha
 * registra o que o cliente pediu; o PDF é o que a IA conseguiu ler da entrega;
 * o texto colado é o que o atendente conferiu com os próprios olhos. Item sem
 * marca de fonte (rascunho, ou linha digitada à mão) conta como `ficha`.
 *
 * Nenhum item de `incoming` some. Cada um é consumido no máximo uma vez, então
 * dois ingressos do mesmo dia com localizadores diferentes sobrevivem os dois
 * — perder um localizador num documento que o cliente assina é exatamente o
 * erro que este aceite existe para evitar. O que não casou vai para o fim, na
 * ordem original.
 *
 * Sempre devolve arrays novos E cópias dos itens: o retorno vai para um form
 * editável, e um item devolvido por referência faria a edição do atendente
 * escrever de volta no resultado da extração — bug silencioso e chato de achar.
 */
export function mergeVoucherItems(
  base: SourcedItem[],
  incoming: SourcedItem[],
  incomingSource: VoucherSource = 'pdf',
): SourcedItem[] {
  const consumed = new Set<number>();
  const merged: SourcedItem[] = [];

  for (const item of base) {
    const match = incoming.findIndex((v, i) => !consumed.has(i) && isSameItem(item, v));
    if (match === -1) {
      merged.push(copyItem(item));
      continue;
    }
    consumed.add(match);
    merged.push(mergeItem(item, incoming[match], incomingSource));
  }

  const novos = incoming
    .filter((_, i) => !consumed.has(i))
    .map((item) => ({ ...copyItem(item), source: incomingSource }));

  return [...merged, ...novos];
}

/**
 * Tira a escrituração da mescla antes do item virar payload. O backend valida
 * o corpo; campo estranho ali é 400 na cara do atendente na hora do envio.
 */
export function stripSource(items: SourcedItem[]): AcceptanceItem[] {
  return items.map(({ source: _source, ...item }) => copyItem(item));
}

/**
 * Escolhe o nº do pedido entre as fontes. Vale o primeiro não-vazio (por isso o
 * chamador passa o texto colado antes dos PDFs); divergência vira `conflict` —
 * quase sempre significa voucher de outro cliente anexado por engano, e é
 * melhor perguntar que adivinhar.
 */
export function pickOrderRef(refs: Array<string | null>): {
  orderRef: string | null;
  conflict: boolean;
} {
  const found = refs.filter((r): r is string => !!r && !!r.trim()).map((r) => r.trim());
  if (found.length === 0) return { orderRef: null, conflict: false };
  return {
    orderRef: found[0],
    conflict: new Set(found).size > 1,
  };
}
