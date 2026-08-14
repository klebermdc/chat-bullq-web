import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Um item de menu está ativo quando a rota atual é ele ou está DENTRO dele.
 *
 * O casamento é por segmento, não por prefixo cru: `pathname.startsWith(href)`
 * acende `/relatorios` junto com `/relatorios-vendas`, porque um é prefixo
 * textual do outro. Comparando com a barra ("/relatorios/") isso não acontece,
 * e `/pipelines/<id>` continua acendendo `/pipelines`.
 */
export function isRouteActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
