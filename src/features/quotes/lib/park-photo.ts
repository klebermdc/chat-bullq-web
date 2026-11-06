import { normalize, operatorFromText } from '@/features/ticket-rules/lib/match-ticket-rule';
import type { QuoteItem } from '../types';
import { itemKind } from './quote-groups';
import { PARK_PHOTOS, type ParkPhoto, type ParkPhotoSlug } from './park-photos';

/**
 * Escolhe a foto do parque para a faixa do bilhete, pelo fornecedor, título e
 * descrição do item. Parque específico primeiro ("Epic Universe" antes de
 * "Universal"); vários parques do mesmo operador usam a foto geral dele.
 * Parque sem foto livre (parques aquáticos, Legoland...) devolve null e o
 * bilhete fica com a arte de sempre.
 */

interface ParkRule {
  park: string;
  operator: string;
  pattern: RegExp;
  /** null: parque conhecido, mas sem foto livre decente. */
  photo: ParkPhotoSlug | null;
}

const PARK_RULES: ParkRule[] = [
  { park: 'magic-kingdom', operator: 'disney', pattern: /magic kingdom|reino magico/, photo: 'magic-kingdom' },
  { park: 'epcot', operator: 'disney', pattern: /\bepcot\b/, photo: 'epcot' },
  { park: 'hollywood-studios', operator: 'disney', pattern: /hollywood studios|jollywood/, photo: 'hollywood-studios' },
  { park: 'animal-kingdom', operator: 'disney', pattern: /animal kingdom/, photo: 'animal-kingdom' },
  { park: 'typhoon-lagoon', operator: 'disney', pattern: /typhoon lagoon/, photo: null },
  { park: 'blizzard-beach', operator: 'disney', pattern: /blizzard beach/, photo: null },
  { park: 'universal-studios', operator: 'universal', pattern: /universal studios/, photo: 'universal-studios' },
  { park: 'islands-of-adventure', operator: 'universal', pattern: /islands? of adventure/, photo: 'islands-of-adventure' },
  { park: 'epic-universe', operator: 'universal', pattern: /\bepic universe\b/, photo: 'epic-universe' },
  { park: 'volcano-bay', operator: 'universal', pattern: /volcano bay/, photo: null },
  { park: 'seaworld', operator: 'united_parks', pattern: /sea ?world/, photo: 'seaworld' },
  { park: 'aquatica', operator: 'united_parks', pattern: /aquatica/, photo: null },
  { park: 'discovery-cove', operator: 'united_parks', pattern: /discovery cove/, photo: null },
  { park: 'busch-gardens', operator: 'united_parks', pattern: /busch gardens/, photo: 'busch-gardens' },
  { park: 'adventure-island', operator: 'united_parks', pattern: /adventure island/, photo: null },
];

/** Foto geral quando o item cita o operador, ou vários parques dele. */
const OPERATOR_PHOTO: Record<string, ParkPhotoSlug> = {
  disney: 'magic-kingdom',
  universal: 'universal-studios',
  united_parks: 'seaworld',
  ksc: 'kennedy-space-center',
  gatorland: 'gatorland',
};

function photoOf(slug: ParkPhotoSlug | null | undefined): ParkPhoto | null {
  return slug ? PARK_PHOTOS[slug] : null;
}

const parksIn = (text: string) => PARK_RULES.filter((rule) => rule.pattern.test(normalize(text)));

/**
 * O produto (título e descrição) manda; o fornecedor só entra se o produto não
 * cita parque nenhum: "SeaWorld Parks" vendendo "Aquatica" é Aquatica.
 */
function parksOf(item: QuoteItem): ParkRule[] {
  const product = parksIn(`${item.title} ${item.description ?? ''}`);
  return product.length > 0 ? product : parksIn(item.provider);
}

export function parkPhotoFor(item: QuoteItem): ParkPhoto | null {
  if (itemKind(item) === 'hotel') return null;
  const found = parksOf(item);

  if (found.length === 1) return photoOf(found[0].photo);
  if (found.length > 1) {
    const operators = new Set(found.map((rule) => rule.operator));
    return operators.size === 1 ? photoOf(OPERATOR_PHOTO[found[0].operator]) : null;
  }
  const operator = operatorFromText(`${item.provider} ${item.title} ${item.description ?? ''}`);
  return operator ? photoOf(OPERATOR_PHOTO[operator]) : null;
}
