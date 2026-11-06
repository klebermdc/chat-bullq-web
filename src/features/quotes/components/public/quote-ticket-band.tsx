import type { TicketTone } from '../../lib/quote-blocks';
import { PARK_PHOTO_HEIGHT, PARK_PHOTO_WIDTH, type ParkPhoto } from '../../lib/park-photos';
import { TealBandArt, VioletBandArt } from './quote-sky';

interface Props {
  tone: TicketTone;
  date: string | null;
  photo: ParkPhoto | null;
}

/**
 * Faixa colorida do topo do bilhete. Com foto do parque, a foto ocupa a faixa
 * com um degradê na cor do bilhete por cima (para a data continuar legível);
 * sem foto, fica a arte de sempre.
 */
export function QuoteTicketBand({ tone, date, photo }: Props) {
  const classes = ['qt-band', tone, date ? '' : 'is-plain', photo ? 'has-photo' : ''].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {photo ? (
        <>
          <img
            className="qt-band-photo"
            src={photo.src}
            alt={photo.alt}
            width={PARK_PHOTO_WIDTH}
            height={PARK_PHOTO_HEIGHT}
            loading="lazy"
            decoding="async"
          />
          <span className="qt-band-shade" aria-hidden="true" />
        </>
      ) : tone === 'teal' ? (
        <TealBandArt />
      ) : (
        <VioletBandArt />
      )}
      {date && <span className="qt-date-chip">{date}</span>}
    </div>
  );
}
