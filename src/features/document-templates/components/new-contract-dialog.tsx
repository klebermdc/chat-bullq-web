'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/errors';
import { documentTemplatesKeys, useDocumentTemplates } from '../hooks/use-document-templates';
import { rememberContractLink } from '../hooks/use-contract-links';
import { useTemplateFill } from '../hooks/use-template-fill';
import { showDeliveryToast } from '../lib/show-delivery-toast';
import { placeholderLabel } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import { FillStepper, type FillStep } from './fill-stepper';
import { RenderedPreview } from './rendered-preview';
import { TemplateFillFields } from './template-fill-fields';
import { TemplatePicker } from './template-picker';

interface NewContractDialogProps {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}

const STEPS: readonly { id: FillStep; label: string }[] = [
  { id: 'pick', label: 'Modelo' },
  { id: 'fill', label: 'Campos' },
  { id: 'preview', label: 'Prévia' },
];

/**
 * Montado só enquanto aberto (estado novo a cada abertura).
 *
 * Novo contrato a partir de um modelo do cliente: escolher o modelo, preencher
 * os campos (com sugestão da conversa), conferir a prévia e enviar o link de
 * assinatura pelo WhatsApp.
 */
export function NewContractDialog({ conversationId, open, onClose }: NewContractDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FillStep>('pick');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [serverMissing, setServerMissing] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const templates = useDocumentTemplates('CLIENT', { enabled: open });
  const fill = useTemplateFill({ templateId, conversationId });

  const activeTemplates = (templates.data ?? []).filter((t) => t.isActive);

  function showMissingFields(missing: string[]) {
    setServerMissing(missing);
    setStep('fill');
    setFocusSignal((n) => n + 1);
  }

  async function send() {
    if (!templateId || isSending) return;
    if (fill.missing.length > 0) {
      showMissingFields(fill.missing);
      return;
    }
    setIsSending(true);
    try {
      const result = await documentTemplatesService.createContract(conversationId, {
        templateId,
        values: fill.payloadValues,
      });
      if (!result.ok) {
        const missing = result.missing ?? fill.missing;
        toast.error(result.message ?? 'Há campos sem preencher no contrato.');
        showMissingFields(missing);
        return;
      }
      // Mesmo com o link não enviado o contrato existe: fica na lista, com
      // "Copiar link" e "Reenviar link".
      rememberContractLink(queryClient, conversationId, result.contract.id, result.link);
      showDeliveryToast(result, 'create');
      await queryClient.invalidateQueries({ queryKey: documentTemplatesKeys.contracts(conversationId) });
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível enviar o contrato.'));
    } finally {
      setIsSending(false);
    }
  }

  const footer = (
    <>
      {step !== 'pick' && (
        <Button variant="ghost" onClick={() => setStep(step === 'preview' ? 'fill' : 'pick')} disabled={isSending}>
          Voltar
        </Button>
      )}
      {step === 'pick' && (
        <Button onClick={() => setStep('fill')} disabled={!templateId}>
          Continuar
        </Button>
      )}
      {step === 'fill' && (
        <Button
          onClick={() => {
            setServerMissing([]);
            setStep('preview');
          }}
          disabled={!fill.template}
        >
          Ver prévia
        </Button>
      )}
      {step === 'preview' && (
        <Button onClick={send} loading={isSending} disabled={fill.missing.length > 0 || isSending}>
          <Send aria-hidden="true" className="h-4 w-4" />
          Enviar para o cliente
        </Button>
      )}
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo contrato"
      description={fill.template && step !== 'pick' ? fill.template.title : 'O cliente recebe o link e assina pelo celular.'}
      size="xl"
      dismissible={step === 'pick'}
      layerClassName="z-[70]"
      footer={footer}
    >
      <FillStepper steps={STEPS} current={step} />
      {step === 'pick' && (
        <TemplatePicker
          templates={activeTemplates}
          isLoading={templates.isLoading}
          isError={templates.isError}
          selectedId={templateId}
          onSelect={setTemplateId}
        />
      )}
      {step === 'fill' && (
        <>
          {serverMissing.length > 0 && (
            <p role="alert" className="mb-3 rounded-xl bg-warning-wash px-4 py-3 text-sm text-warning-ink">
              Preencha antes de enviar: {serverMissing.map(placeholderLabel).join(', ')}.
            </p>
          )}
          <TemplateFillFields fill={fill} focusMissingSignal={focusSignal} disabled={isSending} />
        </>
      )}
      {step === 'preview' && templateId && (
        <RenderedPreview templateId={templateId} values={fill.payloadValues} onEditFields={() => showMissingFields(fill.missing)} />
      )}
    </Dialog>
  );
}
