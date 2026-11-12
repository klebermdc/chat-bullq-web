'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ChoiceGroup } from '../editor/editor-field';
import { QUOTE_FONT_CLASSES } from '../public/quote-fonts';
import type { QuotePreviewState } from '../../hooks/use-quote-preview';
import { QuotePreviewBody, type PreviewDevice } from './quote-preview-body';
// O visual da página pública (tudo sob `.qt`): sem ele a prévia não seria a página de verdade.
import '@/app/cotacao/cotacao.css';

const DEVICE_OPTIONS: { value: PreviewDevice; label: string }[] = [
  { value: 'phone', label: 'Celular' },
  { value: 'desktop', label: 'Computador' },
];

interface Props {
  preview: QuotePreviewState | null;
  onClose: () => void;
}

/**
 * Prévia da página da cotação por cima do modal de envio/atualização. Camada
 * z-[70] para ficar acima também quando o modal abre da gaveta do cliente.
 * Montado dentro do modal de origem: o Esc fecha só a prévia e o rascunho fica.
 */
export function QuotePreviewDialog({ preview, onClose }: Props) {
  const [device, setDevice] = useState<PreviewDevice>('phone');
  return (
    <Dialog
      open={preview !== null}
      onClose={onClose}
      title="Como o cliente vai ver"
      size="2xl"
      layerClassName="z-[70]"
      bodyClassName="p-0"
      footer={
        <>
          <div className="mr-auto w-56">
            <ChoiceGroup labelId="quote-preview-device" label="Tela" value={device} options={DEVICE_OPTIONS} disabled={false} onChange={setDevice} />
          </div>
          <Button type="button" onClick={onClose}>
            Voltar à edição
          </Button>
        </>
      }
    >
      {preview && <QuotePreviewBody view={preview.view} now={preview.now} device={device} fontClassName={QUOTE_FONT_CLASSES} />}
    </Dialog>
  );
}

/** Botão "Ver como o cliente vai ver" dos modais de cotação. */
export function QuotePreviewButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={disabled}>
      <Eye aria-hidden="true" className="h-4 w-4" />
      Ver como o cliente vai ver
    </Button>
  );
}
