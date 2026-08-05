import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Node puro: o que testamos aqui é lógica de string, não componente.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
  },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});
