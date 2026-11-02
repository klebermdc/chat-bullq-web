/* eslint-disable @next/next/no-img-element -- banners estáticos, sem otimização do Next */
import type { ReactNode } from 'react';

interface Promo {
  id: 'viagens' | 'planejador';
  href: string;
  name: string;
  title: ReactNode;
  text: string;
  cta: string;
}

/** Textos tirados dos próprios sites (conferidos em 01/11/2026): não acrescentar promessa nem preço. */
const PROMOS: readonly Promo[] = [
  {
    id: 'viagens',
    href: 'https://ofpviagens.com.br/',
    name: 'OFP Viagens',
    title: (
      <>
        Mais que viagens,<em> realizamos histórias</em>
      </>
    ),
    text: 'Neve, Nordeste, resorts pertinho de São Paulo, Nova York e Caribe, com suporte em cada detalhe.',
    cta: 'Faça sua cotação',
  },
  {
    id: 'planejador',
    href: 'https://ofpplanejador.com/',
    name: 'OFP Planejador',
    title: (
      <>
        Tudo para planejar Orlando,<em> em um único lugar</em>
      </>
    ),
    text: 'Mapas inteligentes, roteiro personalizado, guias e checklists. Acesso imediato e garantia de 7 dias.',
    cta: 'Quero planejar minha viagem',
  },
];

/** Banners da OFP Viagens e do OFP Planejador; o cartão inteiro é o link. */
export function QuotePromos() {
  return (
    <section className="qt-promos" aria-labelledby="qt-h-promos">
      <h2 id="qt-h-promos">Conheça também</h2>
      {PROMOS.map((promo) => (
        <a key={promo.id} className={`qt-promo qt-promo-${promo.id}`} href={promo.href} target="_blank" rel="noopener noreferrer">
          <div className="qt-promo-media">
            <img className="qt-promo-photo" src={`/cotacao/banners/ofp-${promo.id}.jpg`} alt="" loading="lazy" decoding="async" />
            <img className="qt-promo-logo" src={`/cotacao/banners/ofp-${promo.id}-logo.png`} alt={promo.name} loading="lazy" decoding="async" />
          </div>
          <div className="qt-promo-body">
            <p className="qt-promo-title">{promo.title}</p>
            <p className="qt-promo-text">{promo.text}</p>
            <span className="qt-promo-btn">{promo.cta}</span>
          </div>
        </a>
      ))}
    </section>
  );
}
