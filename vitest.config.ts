import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const alias = { '@': resolve(__dirname, 'src') };

/**
 * Dois projetos porque as duas naturezas de teste custam coisas diferentes.
 *
 * `node` roda lógica pura (string, data, redução de lista) e é o grosso da
 * suíte — não paga o preço de montar um DOM. `dom` roda hook e componente
 * dentro do jsdom, com o `cleanup` do testing-library entre os testes.
 *
 * A separação é por extensão: `.test.ts` é lógica, `.test.tsx` é DOM. Assim
 * ninguém precisa lembrar de anotar ambiente arquivo a arquivo.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/**/*.spec.tsx'],
          setupFiles: ['./src/test/setup-dom.ts'],
        },
      },
    ],
  },
});
