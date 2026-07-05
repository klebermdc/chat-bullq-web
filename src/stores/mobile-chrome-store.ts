import { create } from 'zustand';

/**
 * Coordena o "chrome" mobile entre telas irmãs sob o dashboard layout.
 * Hoje: esconder a bottom tab bar quando um chat ocupa a tela inteira.
 * A InboxPage seta hideTabBar=true ao abrir uma conversa (mobile) e volta
 * a false ao voltar pra lista / desmontar.
 */
interface MobileChromeState {
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
}

export const useMobileChrome = create<MobileChromeState>((set) => ({
  hideTabBar: false,
  setHideTabBar: (hide) => set({ hideTabBar: hide }),
}));
