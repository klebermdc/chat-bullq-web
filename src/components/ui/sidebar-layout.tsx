"use client";

import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  DialogPanel,
} from "@headlessui/react";
import { Menu, X } from "lucide-react";
import {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useMobileChrome } from "@/stores/mobile-chrome-store";

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

interface SidebarCollapseCtx {
  collapsed: boolean;
  toggle: () => void;
}
const SidebarCollapseContext = createContext<SidebarCollapseCtx | null>(null);
export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext);
}

interface SidebarLayoutProps {
  sidebar: ReactNode;
  navbar?: ReactNode;
  children: ReactNode;
}

export function SidebarLayout({
  sidebar,
  navbar,
  children,
}: SidebarLayoutProps) {
  // O drawer mobile é controlado por store para que a MobileTabBar ("Mais")
  // consiga abri-lo — um único menu de navegação no mobile.
  const sidebarOpen = useMobileChrome((s) => s.navDrawerOpen);
  const setSidebarOpen = useMobileChrome((s) => s.setNavDrawerOpen);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    } else {
      // Sem preferência salva: no tablet (< lg) começa recolhido no rail de
      // ícones, sobrando largura pro conteúdo (ex.: inbox de 2 painéis).
      // Desktop (>= lg) começa com o menu aberto.
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  };

  return (
    <div className="relative isolate flex h-svh w-full bg-white max-md:flex-col md:bg-zinc-100 dark:bg-zinc-900 dark:md:bg-zinc-950">
      {/* Mobile sidebar overlay (só telefones; tablet+ usa a sidebar estática) */}
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="md:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/30 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200"
        />
        <DialogPanel
          transition
          className="fixed inset-y-0 left-0 w-full max-w-80 p-2 transition duration-300 ease-in-out data-[closed]:-translate-x-full"
        >
          <div className="app-menu flex h-full flex-col rounded-lg shadow-sm ring-1 ring-violet-950/5 dark:ring-white/10">
            <div className="-mb-3 px-4 pt-3">
              <CloseButton
                as="button"
                aria-label="Fechar menu"
                className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
              >
                <X className="size-5" />
              </CloseButton>
            </div>
            {sidebar}
          </div>
        </DialogPanel>
      </Dialog>

      {/* Desktop sidebar — recolhido vira um rail de ícones (w-16) com
          fundo roxo bem clarinho; aberto é o menu completo (w-64). */}
      <div
        className={`fixed inset-y-0 left-0 max-md:hidden transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="app-menu menu-border flex h-full w-full flex-col border-r">
          <SidebarCollapseContext.Provider value={{ collapsed, toggle: toggleCollapsed }}>
            {sidebar}
          </SidebarCollapseContext.Provider>
        </div>
      </div>

      {/* O toggle de recolher/abrir fica no topo do próprio menu (header quando
          aberto, topo do rail quando recolhido) — ver AppSidebar. */}

      {/* Content area */}
      <main
        className={`flex flex-1 flex-col min-h-0 md:min-w-0 transition-[padding] duration-200 ease-in-out ${
          collapsed ? "md:pl-16" : "md:pl-64"
        }`}
      >
        {/* Mobile header — escondido: no mobile a navegação é a bottom tab bar,
            e o botão "Mais" dela abre este mesmo drawer (navDrawerOpen). */}
        <div className="hidden items-center gap-4 border-b border-zinc-950/5 px-4 py-2.5 dark:border-white/5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="text-zinc-500 hover:text-zinc-950 dark:hover:text-white"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">{navbar}</div>
        </div>

        {/* Page content */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden md:bg-white md:shadow-sm md:ring-1 md:ring-zinc-950/5 dark:md:bg-zinc-900 dark:md:ring-white/10">
          <SidebarCollapseContext.Provider value={{ collapsed, toggle: toggleCollapsed }}>
            {children}
          </SidebarCollapseContext.Provider>
        </div>
      </main>
    </div>
  );
}
