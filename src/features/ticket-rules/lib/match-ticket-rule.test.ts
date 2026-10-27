import { describe, expect, it } from 'vitest';
import catalogJson from '../data/ticket-rules.json';
import type { TicketCatalog } from '../types';
import { matchTicketRule, operatorFromText } from './match-ticket-rule';

const { rules } = catalogJson as TicketCatalog;
const match = (provider: string, title: string) => matchTicketRule(rules, { provider, title })?.id ?? null;

describe('matchTicketRule', () => {
  it.each([
    ['Walt Disney World', 'Ingresso 4 dias Parques Temáticos', 'disney-base-4d'],
    ['Disney', 'Ingresso Mágico de 4 Parques', 'disney-4park-magic-latam-2027'],
    ['Universal Orlando Resort', 'Ingresso 3 Dias Park-to-Park', 'universal-3d-p2p'],
    ['Universal Orlando Resort', '2 Dias Park to Park', 'universal-2d-p2p'],
    ['Universal', '1 Dia Epic Universe', 'universal-1d-epic'],
    ['Universal Orlando', '3 dias Park-to-Park com Volcano Bay', 'universal-3d-p2p-volcano-bay'],
    ['SeaWorld Parks', 'SeaWorld Orlando 1 Dia', 'up-seaworld-1d-br'],
    ['Discovery Cove', 'Discovery Cove com Nado com Golfinhos', 'up-discovery-cove-dolphin-swim'],
    ['Kennedy Space Center', 'Admissão 1 Dia', 'ksc-1d'],
    ['LEGOLAND Florida', 'LEGOLAND 2 Dias', 'legoland-2d'],
  ])('%s / %s → %s', (provider, title, expected) => {
    expect(match(provider, title)).toBe(expected);
  });

  it('não sugere nada quando não reconhece o operador', () => {
    expect(match('Hertz', 'Aluguel de carro 7 dias')).toBeNull();
  });

  it('acha o operador pelo nome do parque quando o fornecedor é uma operadora', () => {
    expect(operatorFromText('Ticket Magic Kingdom')).toBe('disney');
    expect(operatorFromText('Busch Gardens Tampa')).toBe('united_parks');
  });
});
