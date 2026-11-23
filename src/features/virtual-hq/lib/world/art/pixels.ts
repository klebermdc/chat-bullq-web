/** Paleta de um desenho em texto: cada letra vira uma cor; '.' é transparente. */
export type Palette = Record<string, string>;

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Pinta um desenho feito de linhas de texto, um pixel por letra. */
export function paintRows(ctx: Ctx, rows: readonly string[], palette: Palette, ox: number, oy: number) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/** Retângulo cheio, a unidade básica da arte do mapa. */
export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Troca a letra de um pixel do desenho, devolvendo um desenho novo. */
export function setPixel(rows: readonly string[], x: number, y: number, ch: string): string[] {
  return rows.map((row, i) => (i === y && x >= 0 && x < row.length ? row.slice(0, x) + ch + row.slice(x + 1) : row));
}

export function darken(hex: string, amount: number): string {
  return shiftColor(hex, -amount);
}

export function lighten(hex: string, amount: number): string {
  return shiftColor(hex, amount);
}

function shiftColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    const out = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.round(Math.min(255, Math.max(0, out)));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/** Pequeno número pseudoaleatório estável por posição (textura do chão). */
export function noise(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Cria (uma vez) um pequeno canvas com um desenho, para copiar a cada quadro. */
export function makeSprite(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
  }
  return canvas;
}
