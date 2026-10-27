/* eslint-disable @next/next/no-img-element -- fotos do CDN da LiteAPI, sem otimização do Next */
import type { QuoteHotel } from '../../types';

/** Só foto do CDN de imagens da LiteAPI vai para a página (a API já filtra; aqui é a segunda trava). */
const PHOTO_RE = /^https:\/\/static\.cupid\.travel\//;

function Stars({ count }: { count: number }) {
  const full = Math.floor(count);
  return (
    <span className="qt-h-stars" aria-label={`${count} estrelas`}>
      {'★'.repeat(full)}
      {count % 1 ? '½' : ''}
    </span>
  );
}

/** Ficha do hotel dentro do bilhete: galeria, estrelas, resumo, comodidades e horários. Sem preço. */
export function QuoteHotelCard({ hotel }: { hotel: QuoteHotel }) {
  const photos = hotel.photos.filter((src) => PHOTO_RE.test(src));
  const times = [hotel.checkin && `Check-in ${hotel.checkin}`, hotel.checkout && `Check-out ${hotel.checkout}`].filter(Boolean);
  return (
    <section className="qt-hotel" aria-label={`Sobre o ${hotel.name}`}>
      {photos.length > 0 && (
        <div className="qt-h-gallery" tabIndex={0} aria-label={`Fotos do ${hotel.name} (deslize)`}>
          {photos.map((src, i) => (
            <img key={src} src={src} alt={`${hotel.name}, foto ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
          ))}
        </div>
      )}
      <p className="qt-h-name">
        {hotel.name} {hotel.stars ? <Stars count={hotel.stars} /> : null}
      </p>
      <p className="qt-h-summary">{hotel.summary}</p>
      {hotel.amenities.length > 0 && (
        <ul className="qt-h-amenities">
          {hotel.amenities.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      {(times.length > 0 || hotel.address) && (
        <p className="qt-h-facts">{[times.join(' · '), hotel.address].filter(Boolean).join(' — ')}</p>
      )}
    </section>
  );
}
