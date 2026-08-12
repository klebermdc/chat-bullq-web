import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Desmonta o que sobrou entre um teste e outro.
 *
 * Sem isto os componentes montados ficam no `document`, e o próximo teste
 * encontra dois elementos com o mesmo texto — falha que parece do componente
 * mas é do teste anterior.
 *
 * Nada de IntersectionObserver ou `scrollIntoView` aqui de propósito: o jsdom
 * não traz esses dois, e quem testa comportamento de rolagem precisa do
 * dublê à vista no próprio teste, não escondido num setup global.
 */
afterEach(() => {
  cleanup();
});
