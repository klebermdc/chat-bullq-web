import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Desenho único de tabela do app (Painel, Relatórios de Vendas, Relatórios de
 * CRM, Marketing, Jarvis): cabeçalho em caixa alta sobre faixa clara, linhas
 * separadas por fio, sem zebra, números à direita em mono.
 *
 * Toda tabela usa estas classes — não copie as strings para outro arquivo.
 */

/** Quem rola na horizontal é este elemento, sempre DENTRO do cartão. */
export const tableScrollCls = 'overflow-x-auto';
export const tableCls = 'w-full text-left text-sm';
export const theadCls = 'border-b border-border bg-muted/50';
export const thCls =
  'whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground';
export const thNumCls = `${thCls} text-right`;
export const tbodyCls = 'divide-y divide-border';
export const trCls = 'transition-colors hover:bg-muted/50';
/** Célula sem `nowrap`, para conteúdo próprio (avatar + nome, chips, duas linhas). */
export const tdBaseCls = 'px-4 py-2.5 text-foreground';
export const tdCls = `whitespace-nowrap ${tdBaseCls}`;
export const tdMutedCls = 'whitespace-nowrap px-4 py-2.5 text-muted-foreground';
export const tdNumCls = 'whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-foreground';
/**
 * Coluna de texto livre (nome, produto): fica com a sobra de largura e corta
 * com reticências em vez de empurrar as outras colunas para fora do cartão.
 * Combine com uma largura (`w-[24%]`) e ponha o texto completo em `title`.
 */
export const tdTruncateCls = 'max-w-0 truncate px-4 py-2.5 text-foreground';
export const emptyCellCls = 'px-4 py-8 text-center text-sm text-muted-foreground';

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

/** Cartão de tabela: o cartão corta os cantos, a área interna rola. */
export function TableCard({
  label,
  minWidth,
  children,
  footer,
  className,
}: {
  /** Nome da tabela para leitor de tela (`aria-label`). */
  label: string;
  /** Classe `min-w-*` da tabela: abaixo disso rola na horizontal em vez de quebrar célula. */
  minWidth: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-soft', className)}>
      <div className={tableScrollCls}>
        <table aria-label={label} className={cn(tableCls, minWidth)}>
          {children}
        </table>
      </div>
      {footer}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className={emptyCellCls}>
        {children}
      </td>
    </tr>
  );
}

export function YesMark({ value }: { value: boolean }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return <Check role="img" aria-label="Sim" className="inline h-4 w-4 text-success-ink" />;
}

export function Pager({
  page,
  totalPages,
  total,
  noun,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  /** Plural do que está sendo contado: "negócios", "leads", "conversas". */
  noun: string;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
      <span className="tabular-nums">
        Página {page} de {totalPages} · {total.toLocaleString('pt-BR')} {noun}
      </span>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
