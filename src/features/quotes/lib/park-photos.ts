/**
 * Fotos ilustrativas dos parques para a faixa do bilhete na página pública.
 * Só banco de imagens com uso comercial livre (Unsplash ou Pexels); nada
 * oficial da Disney/Universal. Os créditos estão também em
 * public/cotacao/parques/CREDITOS.md.
 *
 * Os arquivos já vêm recortados em 960×360 (a proporção da faixa).
 */

export type ParkPhotoLicense = 'unsplash' | 'pexels';

export type ParkPhotoSlug =
  | 'magic-kingdom'
  | 'epcot'
  | 'hollywood-studios'
  | 'animal-kingdom'
  | 'universal-studios'
  | 'islands-of-adventure'
  | 'epic-universe'
  | 'seaworld'
  | 'busch-gardens'
  | 'kennedy-space-center'
  | 'gatorland';

export interface ParkPhoto {
  slug: ParkPhotoSlug;
  src: string;
  alt: string;
  photographer: string;
  sourceUrl: string;
  license: ParkPhotoLicense;
}

export const PARK_PHOTO_WIDTH = 960;
export const PARK_PHOTO_HEIGHT = 360;

type Entry = Omit<ParkPhoto, 'slug' | 'src'>;

const ENTRIES: Record<ParkPhotoSlug, Entry> = {
  'magic-kingdom': {
    alt: 'Castelo da Cinderela no Magic Kingdom',
    photographer: 'Kitera Dent',
    sourceUrl: 'https://unsplash.com/photos/cinderella-castle-in-magic-kingdom-orlando-z4ky2zXIjDM',
    license: 'unsplash',
  },
  epcot: {
    alt: 'Spaceship Earth, a esfera do EPCOT',
    photographer: 'Nathan Langer',
    sourceUrl: 'https://unsplash.com/photos/round-silver-building-A9RK7aRF_GQ',
    license: 'unsplash',
  },
  'hollywood-studios': {
    alt: 'Hollywood Tower Hotel no Hollywood Studios',
    photographer: 'Gurdaas Malik',
    sourceUrl: 'https://unsplash.com/photos/the-hollywood-tower-hotel-with-palm-trees-and-people-_ZTQr7y3TXg',
    license: 'unsplash',
  },
  'animal-kingdom': {
    alt: 'Árvore da Vida no Animal Kingdom',
    photographer: 'Sean Nufer',
    sourceUrl: 'https://unsplash.com/photos/the-tree-of-life-at-disneys-animal-kingdom-Kq4msEo1BeM',
    license: 'unsplash',
  },
  'universal-studios': {
    alt: 'Globo da Universal na entrada do Universal Studios',
    photographer: 'Darshan Patel',
    sourceUrl: 'https://unsplash.com/photos/universal-globe-on-plant-field-IMyqcG3N1iE',
    license: 'unsplash',
  },
  'islands-of-adventure': {
    alt: 'Castelo de Hogwarts no Islands of Adventure',
    photographer: 'Joseph Barrientos',
    sourceUrl: 'https://unsplash.com/photos/white-and-gray-concrete-castle-under-white-clouds-during-daytime-DLOSn7e0VZU',
    license: 'unsplash',
  },
  'epic-universe': {
    alt: 'Portal de entrada do Epic Universe',
    photographer: 'Katie Brittle',
    sourceUrl: 'https://www.pexels.com/photo/majestic-entrance-at-universal-orlando-resort-34064365/',
    license: 'pexels',
  },
  seaworld: {
    alt: 'Golfinhos saltando no SeaWorld Orlando',
    photographer: 'Darren Tolley',
    sourceUrl: 'https://unsplash.com/photos/a-group-of-dolphins-jumping-in-the-air-ezQ7asNA92I',
    license: 'unsplash',
  },
  'busch-gardens': {
    alt: 'Montanha-russa Cheetah Hunt no Busch Gardens Tampa Bay',
    photographer: 'Itai Aarons',
    sourceUrl: 'https://unsplash.com/photos/green-and-yellow-roller-coaster-pE0MErIxo0A',
    license: 'unsplash',
  },
  'kennedy-space-center': {
    alt: 'Globo da NASA e foguete no Kennedy Space Center',
    photographer: 'Tetiana Sapon',
    sourceUrl: 'https://unsplash.com/photos/nasa-globe-sign-and-space-shuttle-against-a-blue-sky-0peetpuFHZ8',
    license: 'unsplash',
  },
  gatorland: {
    alt: 'Jacaré no Gatorland',
    photographer: 'Alvin David',
    sourceUrl: 'https://unsplash.com/photos/a-large-alligator-sitting-on-top-of-a-wooden-dock-Bi51BLi-rqk',
    license: 'unsplash',
  },
};

export const PARK_PHOTOS: Record<ParkPhotoSlug, ParkPhoto> = Object.fromEntries(
  Object.entries(ENTRIES).map(([slug, entry]) => [slug, { ...entry, slug, src: `/cotacao/parques/${slug}.jpg` }]),
) as Record<ParkPhotoSlug, ParkPhoto>;
