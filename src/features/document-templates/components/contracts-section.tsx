'use client';

import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { acceptancesService } from '@/features/acceptances/services/acceptances.service';
import { ACCEPTANCE_STATUS_LABEL, acceptanceStatusClasses } from '@/features/acceptances/status-label';
import { useConversationContracts } from '../hooks/use-document-templates';
import type { ContractStatus } from '../types';
import { NewContractDialog } from './new-contract-dialog';

/** A aba nova já leu o blob; segurar a URL só vazaria memória. */
const PDF_URL_TTL_MS = 60_000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ContractRow({ contract }: { contract: ContractStatus }) {
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const signedOrCreated = contract.status === 'SIGNED' && contract.signedAt
    ? `Assinado em ${formatDate(contract.signedAt)}`
    : `Enviado em ${formatDate(contract.createdAt)}`;

  async function openPdf() {
    if (isOpeningPdf) return;
    setIsOpeningPdf(true);
    try {
      // Mesmo comprovante do aceite: a rota exige sessão, então passa pelo cliente HTTP.
      const url = await acceptancesService.pdfObjectUrl(contract.id);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), PDF_URL_TTL_MS);
    } catch {
      toast.error('Não foi possível abrir o PDF do contrato.');
    } finally {
      setIsOpeningPdf(false);
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{contract.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {signedOrCreated}
          {contract.signerName && contract.status === 'SIGNED' && <> · {contract.signerName}</>}
        </p>
        {contract.pdfUrl && (
          <button
            type="button"
            onClick={openPdf}
            disabled={isOpeningPdf}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
            {isOpeningPdf ? 'Abrindo…' : 'PDF assinado'}
          </button>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${acceptanceStatusClasses(contract.status)}`}>
        {ACCEPTANCE_STATUS_LABEL[contract.status]}
      </span>
    </li>
  );
}

/** Seção "Contratos" do card do cliente: o que já foi enviado e o botão para enviar outro. */
export function ContractsSection({ conversationId }: { conversationId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: contracts = [], isLoading, isError } = useConversationContracts(conversationId);

  return (
    <div className="space-y-2.5">
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : isError ? (
        <p role="alert" className="rounded-xl border border-border px-4 py-4 text-center text-sm text-muted-foreground">
          Não foi possível carregar os contratos.
        </p>
      ) : contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
          Nenhum contrato enviado nesta conversa.
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          {contracts.map((contract) => (
            <ContractRow key={contract.id} contract={contract} />
          ))}
        </ul>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={() => setIsDialogOpen(true)}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Novo contrato
      </Button>

      <NewContractDialog conversationId={conversationId} open={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </div>
  );
}
