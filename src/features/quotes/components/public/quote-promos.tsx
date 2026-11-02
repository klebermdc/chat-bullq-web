/* eslint-disable @next/next/no-img-element -- banners estáticos, sem otimização do Next */
import type { ReactNode } from 'react';

interface Promo {
  id: 'viagens' | 'planejador';
  href: string;
  name: string;
  title: ReactNode;
  cta: string;
  /** Cupom de desconto passado pela OFP; aparece como selo no banner. */
  coupon?: { code: string; label: string };
}

/** Textos tirados dos próprios sites (conferidos em 01/11/2026): não acrescentar promessa nem preço. */
const PROMOS: readonly Promo[] = [
  {
    id: 'planejador',
    href: 'https://ofpplanejador.com/',
    name: 'OFP Planejador',
    title: (
      <>
        Tudo para planejar<em> Orlando</em>
      </>
    ),
    cta: 'Quero planejar minha viagem',
    coupon: { code: 'OFP30', label: '30% off' },
  },
  {
    id: 'viagens',
    href: 'https://ofpviagens.com.br/',
    name: 'OFP Viagens',
    title: (
      <>
        Mais que viagens,<em> realizamos histórias</em>
      </>
    ),
    cta: 'Faça sua cotação',
  },
];

/** Banner compacto (altura dos cartões do resumo); o cartão inteiro é o link. */
function QuotePromo({ promo }: { promo: Promo }) {
  return (
    <a className={`qt-promo qt-promo-${promo.id}`} href={promo.href} target="_blank" rel="noopener noreferrer">
      <div className="qt-promo-media">
        <img className="qt-promo-photo" src={`/cotacao/banners/ofp-${promo.id}.jpg`} alt="" loading="lazy" decoding="async" />
        <img className="qt-promo-logo" src={`/cotacao/banners/ofp-${promo.id}-logo.png`} alt={promo.name} loading="lazy" decoding="async" />
      </div>
      <div className="qt-promo-body">
        <p className="qt-promo-title">{promo.title}</p>
        {promo.coupon && (
          <span className="qt-promo-coupon">
            Cupom <b>{promo.coupon.code}</b> · {promo.coupon.label}
          </span>
        )}
        <span className="qt-promo-btn">{promo.cta} ›</span>
      </div>
    </a>
  );
}

/** Os banners juntos, logo depois do total da reserva. */
export function QuotePromos() {
  return (
    <div className="qt-promos">
      {PROMOS.map((promo) => (
        <QuotePromo key={promo.id} promo={promo} />
      ))}
    </div>
  );
}
