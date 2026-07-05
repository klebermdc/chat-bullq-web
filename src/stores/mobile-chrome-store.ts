import { create } from 'zustand';

/**
 * Coordena o "chrome" mobile entre telas irmãs sob o dashboard layout.
 * - hideTabBar: esconder a bottom tab bar quando um chat ocupa a tela inteira.
 *   A InboxPage seta true ao abrir uma conversa (mobile) e volta a false ao
 *   voltar pra lista / desmontar.
 * - navDrawerOpen: controla o drawer de navegação (AppSidebar) do SidebarLayout,
 *   pra que o botão "Mais" da tab bar consiga abri-lo — um único menu no mobile.
 */
interface MobileChromeState {
  hideTabBar: boolean;
  setHideTabBar: (hide: boolean) => void;
  navDrawerOpen: boolean;
  setNavDrawerOpen: (open: boolean) => void;
}

export const useMobileChrome = create<MobileChromeState>((set) => ({
  hideTabBar: false,
  setHideTabBar: (hide) => set({ hideTabBar: hide }),
  navDrawerOpen: false,
  setNavDrawerOpen: (open) => set({ navDrawerOpen: open }),
}));
