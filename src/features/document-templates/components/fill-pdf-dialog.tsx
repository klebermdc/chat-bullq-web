'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/errors';
import { useTemplateFill } from '../hooks/use-template-fill';
import { pdfFileName } from '../lib/api-shapes';
import { downloadBlob } from '../lib/download';
import { documentTemplatesService } from '../services/document-templates.service';
import { FillStepper, type FillStep } from './fill-stepper';
import { RenderedPreview } from './rendered-preview';
import { TemplateFillFields } from './template-fill-fields';

interface FillPdfDialogProps {
  /** Nulo = fechado. */
  templateId: string | null;
  onClose: () => void;
}

const STEPS: readonly { id: FillStep; label: string }[] = [
  { id: 'fill', label: 'Campos' },
  { id: 'preview', label: 'Prévia' },
];

/**
 * Preencher um modelo fora de uma conversa e baixar o PDF. Sem conversa não há
 * autopreenchimento da API; só a data do dia é sugerida.
 */
export function FillPdfDialog({ templateId, onClose }: FillPdfDialogProps) {
  const open = !!templateId;
  const [step, setStep] = useState<FillStep>('fill');
  const [focusSignal, setFocusSignal] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const fill = useTemplateFill({ templateId });

  useEffect(() => {
    if (!open) return;
    setStep('fill');
    setFocusSignal(0);
  }, [open, templateId]);

  function showMissingFields() {
    setStep('fill');
    setFocusSignal((n) => n + 1);
  }

  async function download() {
    if (!templateId || !fill.template || isDownloading) return;
    if (fill.missing.length > 0) {
      showMissingFields();
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await documentTemplatesService.pdf(templateId, fill.payloadValues);
      downloadBlob(blob, pdfFileName(fill.template.title));
      toast.success('PDF gerado.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível gerar o PDF.'));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Preencher e baixar PDF"
      description={fill.template?.title}
      size="xl"
      dismissible={false}
      footer={
        <>
          {step === 'preview' ? (
            <Button variant="ghost" onClick={() => setStep('fill')} disabled={isDownloading}>Voltar</Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          )}
          {step === 'fill' ? (
            <Button onClick={() => setStep('preview')} disabled={!fill.template}>Ver prévia</Button>
          ) : (
            <Button onClick={download} loading={isDownloading} disabled={fill.missing.length > 0 || isDownloading}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Baixar PDF
            </Button>
          )}
        </>
      }
    >
      <FillStepper steps={STEPS} current={step} />
      {step === 'fill' && <TemplateFillFields fill={fill} focusMissingSignal={focusSignal} disabled={isDownloading} />}
      {step === 'preview' && templateId && (
        <RenderedPreview templateId={templateId} values={fill.payloadValues} onEditFields={showMissingFields} />
      )}
    </Dialog>
  );
}
