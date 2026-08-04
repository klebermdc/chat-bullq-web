'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Eye, Pencil, Save } from 'lucide-react';
import { useCampaign } from '@/hooks/use-email';
import { emailApi } from '@/lib/email-api';
import {
  addBlock,
  contentEquals,
  createInitialState,
  markSaved,
  moveBlock,
  removeBlock,
  selectBlock,
  toContent,
  updateBlock,
  updateBlockStyle,
  updateTheme,
  type BlockType,
  type EditorBlock,
  type EditorState,
} from '@/features/email/editor/editor-state';
import { BlockPalette } from '@/features/email/editor/block-palette';
import { BlockCanvas } from '@/features/email/editor/block-canvas';
import { BlockInspector } from '@/features/email/editor/block-inspector';
import { ThemePanel } from '@/features/email/editor/theme-panel';
import { EmailPreview } from '@/features/email/editor/email-preview';
import { usePreview } from '@/features/email/editor/use-preview';
import { extractErrorMessage } from '@/features/email/editor/error-message';

const SAVE_FALLBACK_ERROR = 'Não foi possível salvar. Tente novamente.';
const UNSAVED_CHANGES_WARNING =
  'Há alterações não salvas nesta campanha. Se sair agora, elas serão perdidas. Deseja sair mesmo assim?';

/** Extrai o índice 1-based de "bloco N: motivo" devolvido pela API. Retorna null se o formato não bater. */
function extractBlockIndex(message: string): number | null {
  const match = message.match(/bloco\s+(\d+)/i);
  return match ? Number(match[1]) - 1 : null;
}

interface SaveError {
  message: string;
  blockIndex: number | null;
}

export default function EditarCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();

  const campaignQ = useCampaign(id);
  const campaign = campaignQ.data;

  // Estado local sempre definido — evita ramificar os hooks abaixo em torno de
  // um valor que só existe depois que a campanha carrega. Começa vazio e é
  // substituído UMA vez pelo conteúdo real assim que ele chega (ver efeito
  // abaixo). Nunca reinicializa depois disso: apagaria o trabalho do usuário
  // a cada refetch (por exemplo após salvar).
  const [state, setState] = useState<EditorState>(() => createInitialState());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !campaign) return;
    setState(createInitialState(campaign.content));
    initializedRef.current = true;
  }, [campaign]);

  const [mobileView, setMobileView] = useState<'editar' | 'previa'>('editar');
  const [saveError, setSaveError] = useState<SaveError | null>(null);

  const preview = usePreview(toContent(state), campaign?.preheader ?? undefined);

  // Aviso ao sair com pendência: tela de rascunho de email não tem autosave
  // de propósito, então perder a alteração por engano é o pior desfecho.
  useEffect(() => {
    if (!state.dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.dirty]);

  const saveMutation = useMutation({
    // PUT substitui o recurso inteiro — o DTO da API é o mesmo do create, com
    // name/subject obrigatórios (sem @IsOptional). Manda a campanha completa,
    // puxando os campos que esta tela não edita do que já foi carregado.
    // `preheader`/`fromName` podem vir `null` da API, e o DTO usa
    // `@IsOptional() @IsString()`, que rejeita `null` — por isso `?? undefined`.
    mutationFn: async () => {
      // Só alcançável pelo botão Salvar, que só renderiza depois que a
      // campanha carregou — a checagem é uma rede de segurança de tipos, não
      // um caminho esperado em produção.
      if (!campaign) throw new Error('Campanha ainda não carregada.');
      const content = toContent(state);
      await emailApi.updateCampaign(id, {
        name: campaign.name,
        subject: campaign.subject,
        preheader: campaign.preheader ?? undefined,
        fromName: campaign.fromName ?? undefined,
        content,
      });
      // Devolve o conteúdo exatamente como foi enviado — o onSuccess precisa
      // dele para saber se o que está na tela agora ainda é o que foi salvo.
      return content;
    },
    onSuccess: (savedContent) => {
      // Entre o clique em Salvar e a resposta voltar, o usuário pode ter
      // editado de novo. Se o conteúdo atual já não é mais o que acabou de
      // ser persistido, marcar como "salvo" seria mentir — mantém `dirty`.
      setState((s) => (contentEquals(toContent(s), savedContent) ? markSaved(s) : s));
      setSaveError(null);
      qc.invalidateQueries({ queryKey: ['email', 'campaign', id] });
      qc.invalidateQueries({ queryKey: ['email', 'campaigns'] });
    },
    onError: (err) => {
      const message = extractErrorMessage(err, SAVE_FALLBACK_ERROR);
      const blockIndex = extractBlockIndex(message);
      setSaveError({ message, blockIndex });
      // A validação da API devolve o índice do bloco com problema — selecionar
      // abre o acordeão dele e aplica o destaque que já existe para seleção,
      // em vez de deixar o operador caçar qual dos N blocos falhou.
      const block = blockIndex !== null ? state.blocks[blockIndex] : undefined;
      if (block) setState((s) => selectBlock(s, block.id));
    },
  });

  // Navegação interna (o botão "Voltar à campanha") não dispara o
  // `beforeunload` acima — só fechar/recarregar a aba faz isso. Para o
  // caminho que a própria página controla, confirma manualmente antes de
  // navegar embora com trabalho pendente.
  function handleBackClick() {
    if (state.dirty && !window.confirm(UNSAVED_CHANGES_WARNING)) return;
    router.push(`/email/campanhas/${id}`);
  }

  if (campaignQ.isLoading) {
    return <div className="p-6 text-center text-sm text-zinc-500">Carregando…</div>;
  }

  if (campaignQ.isError || !campaign) {
    return (
      <div className="p-6 text-center text-sm text-red-600">
        Não foi possível carregar esta campanha.
      </div>
    );
  }

  if (campaign.status !== 'DRAFT') {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Esta campanha já saiu do rascunho e não pode mais ser editada — o email enviado (ou em
            envio) não muda depois do disparo.
          </span>
        </div>
        <Link
          href={`/email/campanhas/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar à campanha
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à campanha
          </button>
          <h1 className="mt-1 truncate text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {campaign.name}
          </h1>
          <p className="truncate text-sm text-zinc-500">{campaign.subject}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={!state.dirty || saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
          </button>
          {state.dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Alterações não salvas
            </span>
          )}
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {saveError.message}
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 lg:hidden dark:border-zinc-800" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'editar'}
          onClick={() => setMobileView('editar')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium ${
            mobileView === 'editar'
              ? 'bg-primary/10 text-primary'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'previa'}
          onClick={() => setMobileView('previa')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium ${
            mobileView === 'previa'
              ? 'bg-primary/10 text-primary'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Prévia
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div
          role="tabpanel"
          className={`${mobileView === 'editar' ? '' : 'hidden'} min-h-0 space-y-4 overflow-y-auto lg:block`}
        >
          <ThemePanel theme={state.theme} onChange={(patch) => setState((s) => updateTheme(s, patch))} />

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Adicionar bloco
            </p>
            <BlockPalette onAdd={(type: BlockType) => setState((s) => addBlock(s, type))} />
          </div>

          <BlockCanvas
            blocks={state.blocks}
            selectedId={state.selectedId}
            onSelect={(blockId) => setState((s) => selectBlock(s, blockId))}
            onMove={(from, to) => setState((s) => moveBlock(s, from, to))}
            onRemove={(blockId) => setState((s) => removeBlock(s, blockId))}
            renderInspector={(block: EditorBlock) => (
              <BlockInspector
                block={block}
                theme={state.theme}
                onChange={(patch) => setState((s) => updateBlock(s, block.id, patch))}
                onStyleChange={(patch) => setState((s) => updateBlockStyle(s, block.id, patch))}
              />
            )}
          />
        </div>

        <div
          role="tabpanel"
          className={`${mobileView === 'previa' ? '' : 'hidden'} min-h-[60vh] lg:block lg:min-h-0`}
        >
          <EmailPreview
            html={preview.html}
            stale={preview.stale}
            loading={preview.loading}
            error={preview.error}
          />
        </div>
      </div>
    </div>
  );
}
