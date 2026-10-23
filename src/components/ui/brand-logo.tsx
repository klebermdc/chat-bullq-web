import { cn } from '@/lib/utils';

/**
 * Logo horizontal da Sendtur (símbolo + nome). São dois PNGs de cor fixa: o
 * nome em roxo-escuro some no tema escuro, então lá entra a versão branca.
 * A altura vem de quem chama (`className`, ex.: `h-10`); a largura acompanha.
 */
export function BrandLogo({ alt = 'Sendtur', className }: { alt?: string; className?: string }) {
  return (
    <>
      <img src="/sendtur-logo.png" alt={alt} className={cn('w-auto dark:hidden', className)} />
      <img src="/sendtur-logo-white.png" alt={alt} className={cn('hidden w-auto dark:block', className)} />
    </>
  );
}
