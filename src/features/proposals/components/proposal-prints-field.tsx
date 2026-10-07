'use client';

import { useRef, type RefObject } from 'react';
import { Check, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/features/inbox/lib/attachment-intake';
import { MAX_PROPOSAL_PRINTS, PRINT_ACCEPT_ATTR, type PrintRejection } from '../lib/print-intake';
import type { PrintItem } from '../hooks/use-proposal-prints';

interface Props {
  items: PrintItem[];
  rejected: PrintRejection[];
  /** Durante o envio: não anexa nem remove. */
  disabled: boolean;
  /** Tem arquivo sendo arrastado sobre a tela. */
  isDragging: boolean;
  onPick: (files: File[]) => void;
  onRemove: (id: string) => void;
  onDismissRejected: () => void;
  /** O diálogo devolve o foco pra cá quando um print é removido. */
  attachButtonRef: RefObject<HTMLButtonElement | null>;
}

function PrintStatusLine({ item }: { item: PrintItem }) {
  const percent = Math.round(item.progress * 100);
  if (item.status === 'uploading') {
    return (
      <>
        <div
          role="progressbar"
          aria-label={`Envio de ${item.file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}% enviado`}
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p aria-hidden="true" className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          Subindo {percent}%
        </p>
      </>
    );
  }
  if (item.status === 'done') {
    return (
      <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-success-ink">
        <Check aria-hidden="true" className="h-3.5 w-3.5" /> Carregado
      </p>
    );
  }
  if (item.status === 'error') {
    return <p className="mt-0.5 text-xs font-medium text-urgent-ink">Não subiu — tente de novo</p>;
  }
  return (
    <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
      {formatBytes(item.file.size)}
    </p>
  );
}

function PrintRow({
  item,
  disabled,
  onRemove,
}: {
  item: PrintItem;
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-chat p-1.5">
      <img
        src={item.previewUrl}
        alt={`Print ${item.file.name}`}
        className="h-14 w-14 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{item.file.name}</p>
        <PrintStatusLine item={item} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={`Remover ${item.file.name}`}
        title="Remover print"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-urgent-wash hover:text-urgent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
      >
        <X aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
    </li>
  );
}

function RejectedNotice({
  rejected,
  onDismiss,
}: {
  rejected: PrintRejection[];
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-1.5 flex items-start gap-2 rounded-lg bg-warning-wash px-3 py-2 text-xs text-warning-ink"
    >
      <ul className="min-w-0 flex-1 space-y-0.5">
        {rejected.map((item, i) => (
          <li key={`${item.name}-${i}`} className="break-words">
            “{item.name}” não foi anexado — {item.reason}.
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar aviso"
        className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-warning-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Bloco "Prints" do diálogo de proposta: botão de anexar, miniaturas com
 * remover e o aviso do que ficou de fora. Colar e arrastar são tratados pelo
 * diálogo (valem na tela toda); aqui fica só o que se vê.
 */
export function ProposalPrintsField({
  items,
  rejected,
  disabled,
  isDragging,
  onPick,
  onRemove,
  onDismissRejected,
  attachButtonRef,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFull = items.length >= MAX_PROPOSAL_PRINTS;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPick(Array.from(e.target.files ?? []));
    // Limpa pra poder escolher o mesmo arquivo de novo depois de remover.
    e.target.value = '';
  };

  return (
    <div
      className={
        'rounded-lg border px-3 py-2.5 transition-colors ' +
        (isDragging ? 'border-primary bg-primary/10' : 'border-border')
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p id="proposal-prints-label" className="text-sm font-medium text-foreground">
          Prints{' '}
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {items.length} de {MAX_PROPOSAL_PRINTS}
          </span>
        </p>
        <Button
          ref={attachButtonRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isFull}
          aria-describedby="proposal-prints-help"
        >
          <ImagePlus aria-hidden="true" className="h-4 w-4" />
          Anexar print
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={PRINT_ACCEPT_ATTR}
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={handleInputChange}
        />
      </div>

      {items.length > 0 && (
        <ul aria-labelledby="proposal-prints-label" className="mt-2 space-y-1.5">
          {items.map((item) => (
            <PrintRow key={item.id} item={item} disabled={disabled} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <p id="proposal-prints-help" className="mt-1.5 text-xs text-muted-foreground">
        {isDragging
          ? 'Solte para anexar o print.'
          : 'O print vai para o cliente junto com a proposta e eu também leio ele para preencher a proposta. Cole (Ctrl+V), arraste ou anexe até 4 imagens PNG, JPG ou WebP, de até 10MB cada.'}
      </p>

      {rejected.length > 0 && <RejectedNotice rejected={rejected} onDismiss={onDismissRejected} />}
    </div>
  );
}
