import type { PublicQuoteView, QuoteData, QuoteTerms } from '../types';

/**
 * Cotações de exemplo para ver a página sem API: SÓ em `next dev`
 * (o service nem importa este arquivo fora de development).
 *   /cotacao/dev-fixture-cotacao-completa
 *   /cotacao/dev-fixture-cotacao-minima
 *   /cotacao/dev-fixture-cotacao-vencida
 */

const COMPANY = {
  name: 'Orlando Fast Pass',
  tagline: 'Agência especializada em viagens para Orlando',
  cnpj: '33.142.150/0001-99',
  instagram: 'orlando.fastpass',
  facebook: 'orlandofastpass',
  site: 'https://www.orlandofastpass.com.br',
  hours: 'Segunda a sexta, das 8h às 18h',
};

// Resumo da política real (a íntegra vem da API, em quote-terms.ts).
const TERMS: QuoteTerms = {
  exchangeNotice:
    'Os ingressos são cobrados em dólar. Os valores em reais seguem o câmbio do dia e podem mudar a qualquer momento até a confirmação do pagamento.',
  cancellation: {
    title: 'Política de Cancelamento e Alterações',
    revisedAt: '27 de outubro de 2026',
    blocks: [
      { kind: 'p', text: 'A Orlando Fast Pass (CNPJ 33.142.150/0001-99) atua na intermediação da venda de ingressos e produtos turísticos.' },
      { kind: 'list', items: ['Cancelamento em até 7 dias da confirmação, se não emitidos.', 'Reembolso de 90% do valor pago.'] },
    ],
  },
};

const DAY_MS = 86_400_000;
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
const isoAt = (offsetHours: number) => new Date(Date.now() + offsetHours * 3_600_000).toISOString();

const FULL_QUOTE: QuoteData = {
  currency: 'BRL',
  total: 24171.62,
  pixTotal: null,
  installments: { count: 10, value: 2417.16 },
  notes: 'Valores para os ingressos de data marcada. Se preferirem outro dia, me avisem que eu refaço a cotação.',
  items: [
    {
      provider: 'Universal Orlando Resort',
      title: 'Ingresso 2 Parques 1 Dia + 1 Dia Universal Epic Universe',
      startDate: isoDay(67),
      endDate: isoDay(67),
      description: 'Explore os mundos de Harry Potter e Jurassic Park, com acesso ao Hogwarts Express.',
      adults: 3,
      children: 1,
      priceAdult: 2380.5,
      priceChild: 2147.81,
      total: 9289.31,
      cancellationPolicy: 'Não reembolsável. A data pode ser alterada até 3 dias antes, pagando a diferença.',
    },
    {
      provider: 'Walt Disney World Resort',
      title: 'Ingresso de 2 dias com entrada para 1 parque por dia',
      startDate: isoDay(71),
      endDate: isoDay(72),
      description: null,
      adults: 3,
      children: 1,
      priceAdult: null,
      priceChild: null,
      total: 8682.31,
      cancellationPolicy: 'Cancelamento com reembolso até 7 dias antes da data de uso.',
    },
    {
      provider: 'Booking',
      title: 'Hospedagem 5 noites — quarto família',
      startDate: isoDay(66),
      endDate: isoDay(71),
      description: null,
      adults: 3,
      children: 1,
      priceAdult: null,
      priceChild: null,
      total: 6200,
      cancellationPolicy: null,
      hotelName: 'Cabana Bay Beach Resort',
      // Dados reais da LiteAPI (sandbox, 27/10/2026).
      hotel: {
        id: 'lp6a114',
        name: "Universal's Cabana Bay Beach Resort",
        stars: 3,
        address: '6550 Adventure Way, Orlando',
        summary:
          "O Universal's Cabana Bay Beach Resort está convenientemente localizado bem ao lado do Universal’s Volcano Bay e a apenas 1 milha dos parques temáticos Universal Studios Florida e Universal’s Islands of Adventure.",
        amenities: ['Wi-Fi grátis', 'Piscina aquecida', 'Piscina infantil', 'Toboágua', 'Quartos para família', 'Restaurante', 'Bar'],
        checkin: '16h',
        checkout: '11h',
        photos: [
          'https://static.cupid.travel/hotels/148876440.jpg',
          'https://static.cupid.travel/hotels/42984660.jpg',
          'https://static.cupid.travel/hotels/107157136.jpg',
          'https://static.cupid.travel/hotels/29528184.jpg',
          'https://static.cupid.travel/hotels/32410529.jpg',
        ],
      },
    },
  ],
};

const MINIMAL_QUOTE: QuoteData = {
  currency: 'BRL',
  total: 2350,
  pixTotal: null,
  installments: null,
  notes: null,
  items: [
    {
      provider: 'Alamo',
      title: 'Aluguel de carro SUV com seguro total',
      startDate: null,
      endDate: null,
      description: null,
      adults: 0,
      children: 0,
      priceAdult: null,
      priceChild: null,
      total: 2350,
      cancellationPolicy: null,
    },
  ],
};

function build(over: Partial<PublicQuoteView>): PublicQuoteView {
  return {
    status: 'ACTIVE',
    code: '8K2Q1Z',
    customerName: 'Mariana Souza',
    seller: { name: 'Ana Paula Ribeiro', whatsapp: '5511999999999' },
    company: COMPANY,
    terms: TERMS,
    createdAt: isoAt(-2),
    expiresAt: isoAt(22),
    quote: FULL_QUOTE,
    ...over,
  };
}

const FIXTURES: Record<string, () => PublicQuoteView> = {
  'dev-fixture-cotacao-completa': () => build({}),
  'dev-fixture-cotacao-minima': () =>
    build({ customerName: null, seller: { name: 'Ana', whatsapp: null }, company: null, quote: MINIMAL_QUOTE }),
  'dev-fixture-cotacao-vencida': () => build({ status: 'EXPIRED', expiresAt: isoAt(-5) }),
  'dev-fixture-cotacao-atualizada': () => build({ code: '0152', createdAt: isoAt(-30), updatedAt: isoAt(-1), expiresAt: isoAt(23) }),
};

export function findQuoteFixture(token: string): PublicQuoteView | null {
  return FIXTURES[token]?.() ?? null;
}
