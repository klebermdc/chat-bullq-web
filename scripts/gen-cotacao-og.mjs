import sharp from 'sharp';
import { readFileSync } from 'node:fs';

// Gera public/cotacao/og.png (1200×630): a imagem da prévia do link da cotação
// no WhatsApp. Estática de propósito — ver o comentário em
// src/app/cotacao/[token]/page.tsx (OG_IMAGE).
//
// Mesmo céu da página: índigo #17133F, estrelas, fogos dourados, logo branco.
// O texto é rasterizado aqui (librsvg + fontes do sistema); por isso a imagem
// é gerada uma vez e versionada, e o servidor não precisa de fonte nenhuma.
//
// Rodar depois de trocar o logo:  node scripts/gen-cotacao-og.mjs

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO = readFileSync(new URL('../public/cotacao/logo-branco.png', import.meta.url));
const OUT = new URL('../public/cotacao/og.png', import.meta.url).pathname;
const LOGO_WIDTH = 300;

const stars = [
  [60, 70, 2.4], [150, 210, 1.8], [260, 50, 2], [1120, 90, 2.6], [980, 230, 1.6], [40, 420, 2],
  [1160, 470, 1.8], [800, 40, 1.6], [210, 560, 1.6], [1060, 580, 2.2], [120, 330, 1.4], [700, 590, 1.6],
  [880, 140, 1.4], [470, 30, 1.6], [1010, 360, 1.4],
]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".75"/>`)
  .join('');

const firework = (cx, cy, s, color) => {
  const rays = [[0, -1], [0, 1], [-1, 0], [1, 0], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7], [0.7, 0.7]];
  const d = rays
    .map(([dx, dy]) => `M${cx + dx * s} ${cy + dy * s}L${cx + dx * s * 2} ${cy + dy * s * 2}`)
    .join('');
  return `<path d="${d}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
};

const sparkle = (cx, cy, s, color) =>
  `<path d="M${cx} ${cy - s}l${s * 0.3} ${s * 0.7} ${s * 0.7} ${s * 0.3}-${s * 0.7} ${s * 0.3}-${s * 0.3} ${s * 0.7}-${s * 0.3}-${s * 0.7}-${s * 0.7}-${s * 0.3} ${s * 0.7}-${s * 0.3}z" fill="${color}"/>`;

const background = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#17133F"/>
  ${stars}
  ${firework(1010, 170, 26, '#FFC23D')}
  ${firework(170, 420, 18, '#FF6B8B')}
  ${sparkle(900, 70, 22, '#FFC23D')}
  ${sparkle(290, 150, 16, '#9F8CFF')}
  ${sparkle(1090, 400, 14, '#9F8CFF')}
  <path d="M-20 600C220 520 440 650 660 580S1000 500 1220 560" fill="none" stroke="#FFC23D"
        stroke-width="3" stroke-dasharray="3 14" stroke-linecap="round" opacity=".7"/>
  <text x="600" y="420" text-anchor="middle" fill="#FFFFFF"
        font-family="Avenir Next, Helvetica Neue, Arial, sans-serif" font-weight="800" font-size="112"
        letter-spacing="-2">Sua <tspan fill="#FFC23D">cotação</tspan></text>
  <text x="600" y="492" text-anchor="middle" fill="#D9D4FF"
        font-family="Avenir Next, Helvetica Neue, Arial, sans-serif" font-weight="500" font-size="36">Toque para ver tudo com calma</text>
</svg>`);

const logo = await sharp(LOGO).resize({ width: LOGO_WIDTH }).png().toBuffer();
const { height: logoHeight } = await sharp(logo).metadata();

await sharp(background)
  .composite([{ input: logo, left: Math.round((WIDTH - LOGO_WIDTH) / 2), top: 120 - Math.round(logoHeight / 4) }])
  .png({ compressionLevel: 9 })
  .toFile(OUT);

process.stdout.write(`og.png gerado em ${OUT}\n`);
