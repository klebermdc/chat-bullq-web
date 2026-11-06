import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parkPhotoFor } from './park-photo';
import { PARK_PHOTOS } from './park-photos';
import type { QuoteItem } from '../types';

function item(over: Partial<QuoteItem> = {}): QuoteItem {
  return {
    provider: '',
    title: '',
    startDate: '2027-01-01',
    endDate: '2027-01-01',
    description: null,
    adults: 2,
    children: 0,
    priceAdult: null,
    priceChild: null,
    total: 100,
    cancellationPolicy: null,
    ...over,
  };
}

const slugOf = (over: Partial<QuoteItem>) => parkPhotoFor(item(over))?.slug ?? null;

describe('parkPhotoFor — títulos reais', () => {
  it.each([
    [{ provider: 'Universal Orlando Resort', title: 'Ingresso Universal Orlando 3 parques Adventure' }, 'universal-studios'],
    [
      { provider: 'Walt Disney World Resort', title: '4 dias de ingressos para os Parques Temáticos do Walt Disney World Resort' },
      'magic-kingdom',
    ],
    [{ provider: 'Universal Orlando Resort', title: '1 Dia Epic Universe' }, 'epic-universe'],
    [{ provider: 'SeaWorld Parks', title: 'SeaWorld Orlando 1 Dia' }, 'seaworld'],
    [{ provider: 'Disney Jollywood Nights', title: 'Disney Jollywood Nights' }, 'hollywood-studios'],
    [{ provider: 'Booking', title: 'Hotel Rosen Inn' }, null],
    [{ provider: 'Hertz', title: 'Aluguel de carro 7 dias' }, null],
  ])('%#: %o → %s', (over, expected) => {
    expect(slugOf(over)).toBe(expected);
  });
});

describe('parkPhotoFor — parque específico antes do operador', () => {
  it.each([
    [{ provider: 'Walt Disney World Resort', title: 'Magic Kingdom 1 dia' }, 'magic-kingdom'],
    [{ provider: 'Walt Disney World Resort', title: 'EPCOT 1 dia' }, 'epcot'],
    [{ provider: 'Disney', title: "Disney's Hollywood Studios" }, 'hollywood-studios'],
    [{ provider: 'Disney', title: "Disney's Animal Kingdom 1 dia" }, 'animal-kingdom'],
    [{ provider: 'Universal Orlando Resort', title: 'Universal Studios Florida 1 dia' }, 'universal-studios'],
    [{ provider: 'Universal Orlando Resort', title: 'Islands of Adventure 1 dia' }, 'islands-of-adventure'],
    [{ provider: 'Busch Gardens', title: 'Busch Gardens Tampa Bay 1 dia' }, 'busch-gardens'],
    [{ provider: 'Kennedy Space Center', title: 'Ingresso KSC' }, 'kennedy-space-center'],
    [{ provider: 'Gatorland', title: 'Ingresso Gatorland' }, 'gatorland'],
  ])('%#: %o → %s', (over, expected) => {
    expect(slugOf(over)).toBe(expected);
  });

  it('usa o fornecedor quando o produto não cita parque', () => {
    expect(slugOf({ provider: 'Busch Gardens Tampa Bay', title: 'Ingresso 1 dia' })).toBe('busch-gardens');
  });

  it('acha o parque também na descrição', () => {
    expect(slugOf({ provider: 'Universal Orlando Resort', title: 'Ingresso 1 dia', description: 'Válido no Epic Universe' })).toBe(
      'epic-universe',
    );
  });
});

describe('parkPhotoFor — vários parques ou sem foto', () => {
  it('vários parques do mesmo operador usam a foto geral do operador', () => {
    const title = 'Universal Studios Florida, Islands of Adventure e Epic Universe';
    expect(slugOf({ provider: 'Universal Orlando Resort', title })).toBe('universal-studios');
    expect(slugOf({ provider: 'Disney', title: 'Park Hopper Magic Kingdom e EPCOT' })).toBe('magic-kingdom');
  });

  it('"4 parques Disney" usa a foto geral da Disney', () => {
    expect(slugOf({ provider: 'Disney', title: '4 parques Disney' })).toBe('magic-kingdom');
  });

  it.each([
    [{ provider: 'Disney', title: "Disney's Typhoon Lagoon" }],
    [{ provider: 'Disney', title: 'Blizzard Beach 1 dia' }],
    [{ provider: 'Universal Orlando Resort', title: 'Volcano Bay 1 dia' }],
    [{ provider: 'SeaWorld Parks', title: 'Aquatica Orlando' }],
    [{ provider: 'SeaWorld Parks', title: 'Discovery Cove Day Resort' }],
    [{ provider: 'Legoland Florida', title: 'Legoland 1 dia' }],
  ])('%#: parque sem foto livre mantém a arte de hoje', (over) => {
    expect(slugOf(over)).toBeNull();
  });

  it('parques de operadores diferentes no mesmo item ficam sem foto', () => {
    expect(slugOf({ provider: 'Combo', title: 'Magic Kingdom + Islands of Adventure' })).toBeNull();
  });

  it('hotel nunca ganha foto de parque, mesmo com nome de parque', () => {
    expect(slugOf({ provider: 'Walt Disney World Resort', title: "Disney's Animal Kingdom Lodge", hotelName: 'Animal Kingdom Lodge' })).toBeNull();
  });
});

describe('PARK_PHOTOS', () => {
  it('toda foto tem arquivo em /cotacao/parques, alt em português, autor e licença livre', () => {
    for (const [slug, photo] of Object.entries(PARK_PHOTOS)) {
      expect(photo.slug).toBe(slug);
      expect(photo.src).toBe(`/cotacao/parques/${slug}.jpg`);
      expect(existsSync(join(process.cwd(), 'public', photo.src))).toBe(true);
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.photographer).not.toBe('');
      expect(['unsplash', 'pexels']).toContain(photo.license);
      expect(photo.sourceUrl).toMatch(/^https:\/\/(unsplash\.com\/photos|www\.pexels\.com\/photo)\//);
    }
  });
});
