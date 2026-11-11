import { describe, expect, it } from 'vitest';
import { bannerMessage } from './diary-banner-message';

describe('bannerMessage', () => {
  it('treino novo vem antes do plano de voo', () => {
    expect(bannerMessage({ hasNewDiary: true, pendingCount: 5, planSeenToday: false })).toEqual({
      text: 'Seu treino de hoje está pronto: dois minutos com o que deu certo ontem e o que melhorar.',
      link: 'Abrir o treino',
    });
  });

  it('sem treino novo, chama para o plano de voo', () => {
    expect(bannerMessage({ hasNewDiary: false, pendingCount: 1, planSeenToday: false })).toEqual({
      text: 'Seu plano de voo de hoje tem 1 item: comece por ele.',
      link: 'Abrir o plano',
    });
  });

  it('plano já visto e treino lido: some', () => {
    expect(bannerMessage({ hasNewDiary: false, pendingCount: 3, planSeenToday: true })).toBeNull();
    expect(bannerMessage({ hasNewDiary: false, pendingCount: 0, planSeenToday: false })).toBeNull();
  });
});
