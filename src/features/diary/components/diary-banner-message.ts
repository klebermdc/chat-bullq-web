export interface BannerInput {
  hasNewDiary: boolean;
  pendingCount: number;
  planSeenToday: boolean;
}

export interface BannerMessage {
  text: string;
  link: string;
}

/** O treino do dia anterior é o motivo principal do aviso; o plano vem depois. */
export function bannerMessage({ hasNewDiary, pendingCount, planSeenToday }: BannerInput): BannerMessage | null {
  if (hasNewDiary) {
    return {
      text: 'Seu treino de hoje está pronto: dois minutos com o que deu certo ontem e o que melhorar.',
      link: 'Abrir o treino',
    };
  }
  if (pendingCount === 0 || planSeenToday) return null;
  return {
    text: `Seu plano de voo de hoje tem ${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'}: comece por ele.`,
    link: 'Abrir o plano',
  };
}
