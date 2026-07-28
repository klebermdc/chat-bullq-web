import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node puro: o que testamos aqui é lógica de string, não componente.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
