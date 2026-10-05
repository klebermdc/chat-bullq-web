import { describe, expect, it } from 'vitest';
import { shiftHeatmapHours } from './heatmap';

const empty = () => Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

describe('mapa de calor: UTC para o horário local', () => {
  it('não muda nada com deslocamento zero', () => {
    const m = empty();
    m[2][10] = 5;
    expect(shiftHeatmapHours(m, 0)).toEqual(m);
  });

  it('move a hora para trás em fusos negativos (Brasília = -3)', () => {
    const m = empty();
    m[2][15] = 7; // terça 15h UTC
    const out = shiftHeatmapHours(m, -3);
    expect(out[2][12]).toBe(7); // terça 12h em Brasília
    expect(out[2][15]).toBe(0);
  });

  it('vira o dia quando cruza a meia-noite', () => {
    const m = empty();
    m[1][1] = 4; // segunda 01h UTC
    const out = shiftHeatmapHours(m, -3);
    expect(out[0][22]).toBe(4); // domingo 22h em Brasília
  });

  it('dá a volta na semana (domingo → sábado)', () => {
    const m = empty();
    m[0][0] = 9; // domingo 00h UTC
    expect(shiftHeatmapHours(m, -3)[6][21]).toBe(9);
  });

  it('não altera a matriz recebida', () => {
    const m = empty();
    m[3][3] = 1;
    shiftHeatmapHours(m, -3);
    expect(m[3][3]).toBe(1);
  });
});
