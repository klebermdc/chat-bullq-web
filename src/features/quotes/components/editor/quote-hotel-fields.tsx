'use client';

/* eslint-disable @next/next/no-img-element -- fotos do CDN da LiteAPI, sem otimização do Next */
import { BedDouble, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUOTE_LIMITS } from '../../lib/quote-draft';
import type { QuoteHotel } from '../../types';
import { TextAreaField } from './editor-field';

interface Props {
  id: string;
  hotelName: string | null | undefined;
  hotel: QuoteHotel | null | undefined;
  disabled: boolean;
  onChange: (hotel: QuoteHotel | null) => void;
}

const THUMBS = 3;

/**
 * Ficha do hotel achada na LiteAPI para o item: o atendente confere, ajusta o
 * resumo ou tira. O preço continua o do print — a ficha não tem valor nenhum.
 */
export function QuoteHotelFields({ id, hotelName, hotel, disabled, onChange }: Props) {
  if (!hotel) {
    if (!hotelName) return null;
    return (
      <p className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
        <BedDouble aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        “{hotelName}” sem ficha (não achado ou retirado): a página mostra só o que veio do print.
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-medium text-foreground">
          <BedDouble aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
          Hotel encontrado: <span className="font-semibold">{hotel.name}</span>
          {hotel.stars ? (
            <span className="ml-1 whitespace-nowrap text-muted-foreground">
              <Star aria-hidden="true" className="inline h-3 w-3 align-[-1px]" /> {hotel.stars}
            </span>
          ) : null}
        </p>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)} className="min-h-8 shrink-0 px-2 text-xs">
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          Não é este hotel
        </Button>
      </div>
      {hotel.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {hotel.photos.slice(0, THUMBS).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded object-cover" />
          ))}
        </div>
      )}
      <TextAreaField
        id={id}
        label="Resumo do hotel (o cliente lê na página)"
        value={hotel.summary}
        disabled={disabled}
        rows={4}
        maxLength={QUOTE_LIMITS.hotelSummary}
        onChange={(summary) => onChange({ ...hotel, summary })}
      />
      {hotel.amenities.length > 0 && <p className="text-xs text-muted-foreground">{hotel.amenities.join(' · ')}</p>}
      <p className="text-xs text-muted-foreground">
        {hotel.photos.length} fotos na página do cliente. O valor continua o do print.
      </p>
    </div>
  );
}
