import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Chip de tag e de etapa do funil — um desenho só para o app inteiro.
 *
 * A cor vem do banco (hex escolhido pelo gestor), então o texto não pode ser
 * a cor pura: âmbar e verde sobre o próprio fundo claro ficavam em ~2:1.
 * `color-mix` escurece a letra no claro e clareia no escuro a partir da mesma
 * cor, mantendo a matiz reconhecível.
 *
 * - `TagChip`           tag da conversa: fundo tingido.
 * - `TagChip outline`   tag do contato: contorno tracejado, sem fundo.
 * - `TagChip onRemove`  tag editável: ganha o botão de remover.
 * - `TagChip quiet`     tag em lista densa (linha da Inbox): pílula neutra
 *                       e a cor só no ponto, para várias tags lado a lado
 *                       não virarem um arco-íris. Com `outline`, o contorno
 *                       fica tracejado.
 * - `StageChip`         etapa do funil: neutro com ponto colorido, para não
 *                       se confundir com tag.
 */
const base =
  'inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none';

const tinted =
  'bg-[color-mix(in_oklab,var(--chip)_14%,transparent)] ' +
  'text-[color-mix(in_oklab,var(--chip)_55%,black)] ' +
  'dark:bg-[color-mix(in_oklab,var(--chip)_22%,transparent)] ' +
  'dark:text-[color-mix(in_oklab,var(--chip)_55%,white)]';

const outlined =
  'border border-dashed border-[color-mix(in_oklab,var(--chip)_55%,transparent)] ' +
  'text-[color-mix(in_oklab,var(--chip)_55%,black)] ' +
  'dark:text-[color-mix(in_oklab,var(--chip)_55%,white)]';

const quietCls = 'bg-card/75 text-foreground ring-1 ring-inset ring-foreground/10';
const quietOutlined = 'text-foreground border border-dashed border-foreground/25';

const FALLBACK_COLOR = '#6366f1';

function chipVar(color: string | null | undefined): CSSProperties {
  return { '--chip': color || FALLBACK_COLOR } as CSSProperties;
}

interface TagChipProps {
  name: string;
  color?: string | null;
  /** Tag do contato (vale para todas as conversas dele). */
  outline?: boolean;
  /** Pílula neutra com a cor só no ponto. */
  quiet?: boolean;
  title?: string;
  className?: string;
  /** Quando presente, o chip mostra o botão de remover. */
  onRemove?: () => void;
  removeDisabled?: boolean;
}

export function TagChip({
  name,
  color,
  outline = false,
  quiet = false,
  title,
  className,
  onRemove,
  removeDisabled = false,
}: TagChipProps) {
  return (
    <span
      title={title ?? name}
      style={chipVar(color)}
      className={cn(
        base,
        quiet ? (outline ? quietOutlined : quietCls) : outline ? outlined : tinted,
        onRemove && 'py-1 pl-2 pr-1 text-xs',
        className,
      )}
    >
      {(quiet || !outline) && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--chip)" />}
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          aria-label={`Remover tag ${name}`}
          title={`Remover tag ${name}`}
          // Ícone de 16px com área de toque de 24px (margem negativa mantém o chip compacto).
          className="-my-1 -mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_oklab,var(--chip)_25%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <X aria-hidden="true" className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

interface StageChipProps {
  name: string;
  color?: string | null;
  className?: string;
}

export function StageChip({ name, color, className }: StageChipProps) {
  return (
    <span
      title={`Etapa do funil: ${name}`}
      style={chipVar(color)}
      className={cn(base, 'rounded-md bg-muted font-semibold text-foreground', className)}
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[3px] bg-(--chip) ring-1 ring-inset ring-foreground/15" />
      <span className="truncate">{name}</span>
    </span>
  );
}
