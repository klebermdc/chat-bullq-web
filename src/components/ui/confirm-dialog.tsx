'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';

/**
 * Confirmação no lugar de `window.confirm()`: segue o tema, deixa o botão
 * destrutivo em vermelho e diz o impacto da ação.
 *
 * Uso (troca 1:1 do confirm nativo):
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   if (!(await confirm({ title: 'Remover tag?', destructive: true }))) return;
 *   ...
 *   return <>{...}{confirmDialog}</>;
 */
export interface ConfirmOptions {
  title: string;
  /** O que acontece se confirmar — de preferência com números ("12 contatos perdem a tag"). */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      // Vai como descrição do diálogo: é lida junto com o título.
      description={description ?? 'Esta ação não pode ser desfeita.'}
      size="sm"
      footer={
        <>
          {/* Em ação destrutiva o foco inicial fica no botão seguro. */}
          <Button variant="outline" onClick={onCancel} autoFocus={destructive}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} autoFocus={!destructive}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <span className="sr-only">Confirme ou cancele abaixo.</span>
    </Dialog>
  );
}

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Guarda o último texto para o diálogo não ficar em branco enquanto fecha.
  const [shown, setShown] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    // Uma confirmação pendente que é atropelada por outra conta como "não".
    resolver.current?.(false);
    setOptions(next);
    setShown(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      open={options !== null}
      title={shown?.title ?? ''}
      description={shown?.description}
      confirmLabel={shown?.confirmLabel}
      cancelLabel={shown?.cancelLabel}
      destructive={shown?.destructive}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
}
