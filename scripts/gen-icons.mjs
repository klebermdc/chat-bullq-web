import sharp from 'sharp';
import { readFileSync } from 'node:fs';

// Gera os ícones do app a partir do símbolo da marca.
//
// Fonte: public/sendtur-symbol.png — o avião isolado, já recortado e com
// fundo transparente. A marca entra em BRANCO sobre o gradiente ametista
// (o mesmo do menu lateral): em 56px, que é o tamanho real na tela inicial,
// a versão colorida sobre branco perde contorno demais.
//
// Rodar depois de trocar o símbolo:  yarn gen:icons

const SOURCE = readFileSync(new URL('../public/sendtur-symbol.png', import.meta.url));
const MARK_RATIO = 0.54; // quanto do lado do quadrado a marca ocupa

const targets = [
  { out: 'public/icon-192.png', size: 192 },
  { out: 'public/icon-512.png', size: 512 },
  { out: 'public/apple-touch-icon.png', size: 180 },
];

const gradient = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7C3AED"/>
          <stop offset="1" stop-color="#C026D3"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#g)"/>
    </svg>`,
  );

for (const { out, size } of targets) {
  const markWidth = Math.round(size * MARK_RATIO);
  // Redimensiona primeiro: `metadata()` num pipeline devolve as dimensões da
  // ENTRADA, não as do resultado — ler antes daria a altura original.
  const mark = await sharp(SOURCE)
    .resize({ width: markWidth })
    .ensureAlpha()
    .png()
    .toBuffer();
  const { height } = await sharp(mark).metadata();

  // A marca vira branca reaproveitando o próprio alfa como máscara.
  const alpha = await sharp(mark).extractChannel('alpha').toBuffer();
  const white = await sharp({
    create: { width: markWidth, height, channels: 3, background: '#ffffff' },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();

  await sharp(gradient(size))
    .composite([
      {
        input: white,
        top: Math.round((size - height) / 2),
        left: Math.round((size - markWidth) / 2),
      },
    ])
    .png()
    .toFile(out);

  console.log('wrote', out);
}
