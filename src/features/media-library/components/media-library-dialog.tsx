'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload, FolderPlus, Trash2, Loader2, FileText, Music, Film, Search, Sticker, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls } from '@/components/ui/control';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import {
  mediaLibraryService,
  type MediaAsset,
  type MediaFolder,
} from '../services/media-library.service';
import { inboxService } from '@/features/inbox/services/inbox.service';
import { usePermissions } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/errors';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaLibraryDialog({ conversationId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { can } = usePermissions();
  const { confirm, confirmDialog } = useConfirm();

  // Esc e a trava de rolagem agora são do <Dialog>; aqui sobra só o reset.
  useEffect(() => {
    if (!open) {
      setFolderId(undefined);
      setSearch('');
      setSendingId(null);
    }
  }, [open]);

  const folders = useQuery({
    queryKey: ['media-library', 'folders'],
    queryFn: () => mediaLibraryService.listFolders(),
    enabled: open,
  });

  const assets = useQuery({
    queryKey: ['media-library', 'assets', folderId ?? 'all'],
    queryFn: () => mediaLibraryService.listAssets(folderId),
    enabled: open,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['media-library'] });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await mediaLibraryService.uploadAsset(file, { folderId });
      await invalidate();
      toast.success('Arquivo adicionado à biblioteca');
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao enviar arquivo'));
    } finally {
      setUploading(false);
    }
  };

  const handleNewFolder = async () => {
    const name = window.prompt('Nome da nova pasta:')?.trim();
    if (!name) return;
    // "Não" (ou fechar) cria a pasta comum — mesmo efeito do Cancelar antigo.
    const isStickerFolder = await confirm({
      title: `"${name}" é uma pasta de figurinhas?`,
      description:
        'Os arquivos .webp de uma pasta de figurinhas aparecem na aba "Figurinhas" do compositor. Você pode mudar isso depois.',
      confirmLabel: 'Sim, de figurinhas',
      cancelLabel: 'Não, pasta comum',
    });
    try {
      await mediaLibraryService.createFolder(name, { isStickerFolder });
      await invalidate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao criar pasta'));
    }
  };

  const handleToggleSticker = async (folder: MediaFolder) => {
    const next = !folder.isStickerFolder;
    const ok = await confirm(
      next
        ? {
            title: `Marcar "${folder.name}" como pasta de figurinhas?`,
            description:
              'Os arquivos .webp dela passam a aparecer na aba "Figurinhas" do compositor.',
            confirmLabel: 'Marcar',
          }
        : {
            title: `Desmarcar "${folder.name}" como pasta de figurinhas?`,
            description:
              'Os arquivos continuam na biblioteca, mas somem da aba "Figurinhas" do compositor.',
            confirmLabel: 'Desmarcar',
          },
    );
    if (!ok) return;
    try {
      await mediaLibraryService.updateFolder(folder.id, {
        isStickerFolder: next,
      });
      await invalidate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar pasta'));
    }
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    const ok = await confirm({
      title: `Excluir "${asset.title || asset.filename}"?`,
      description:
        'O arquivo sai da biblioteca para toda a equipe. O que já foi enviado a clientes continua nas conversas.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try {
      await mediaLibraryService.deleteAsset(asset.id);
      await invalidate();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Sem permissão para excluir'));
    }
  };

  const handleSend = async (asset: MediaAsset) => {
    setSendingId(asset.id);
    try {
      await inboxService.sendLibraryMedia(conversationId, asset);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Erro ao enviar'));
    } finally {
      setSendingId(null);
    }
  };

  const list = (assets.data ?? []).filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (a.title || a.filename).toLowerCase().includes(q);
  });
  const currentFolder = folders.data?.find((f) => f.id === folderId);
  const isSearching = search.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Biblioteca de arquivos"
      description="Clique em um arquivo para enviar ao cliente."
      size="xl"
      bodyClassName="p-0"
    >
      {/* Barra fixa no topo do corpo: pastas, ações e busca. */}
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFolderId(undefined)}
              aria-pressed={folderId === undefined}
              className={chip(folderId === undefined)}
            >
              Todos
            </button>
            {(folders.data ?? []).map((f: MediaFolder) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFolderId(f.id)}
                aria-pressed={folderId === f.id}
                className={chip(folderId === f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {currentFolder && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleToggleSticker(currentFolder)}
              >
                <Sticker aria-hidden="true" className="h-4 w-4" />
                {currentFolder.isStickerFolder ? 'Não é de figurinhas' : 'É de figurinhas'}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleNewFolder}>
              <FolderPlus aria-hidden="true" className="h-4 w-4" /> Nova pasta
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={uploading}
            >
              {!uploading && <Upload aria-hidden="true" className="h-4 w-4" />}
              Enviar arquivo
            </Button>
            <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
          </div>
        </div>

        <div className="px-5 pb-2.5">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome…"
              aria-label="Buscar arquivo por nome"
              className={`${controlCls} w-full pl-9`}
            />
          </div>
        </div>
      </div>

      {assets.isLoading ? (
        <LoadingState label="Carregando arquivos…" />
      ) : assets.isError ? (
        <p role="alert" className="m-5 rounded-lg bg-urgent-wash px-3 py-3 text-center text-sm text-urgent-ink">
          Erro ao carregar a biblioteca. Tente novamente.
        </p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          size="sm"
          title={isSearching ? 'Nenhum arquivo com esse nome' : 'Nenhum arquivo aqui ainda'}
          description={
            isSearching
              ? 'Confira a busca ou troque de pasta.'
              : 'Clique em “Enviar arquivo” para guardar imagens, PDFs e áudios que a equipe usa sempre.'
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          {list.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => handleSend(asset)}
                disabled={sendingId === asset.id}
                className="flex w-full flex-col text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                title="Enviar para o cliente"
              >
                <div className="flex h-28 items-center justify-center bg-muted">
                  {asset.mimeType.startsWith('image/') ? (
                    <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <AssetIcon mime={asset.mimeType} />
                  )}
                </div>
                <div className="w-full truncate px-2 py-1.5 text-xs text-foreground">
                  {asset.title || asset.filename}
                </div>
              </button>
              {sendingId === asset.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70">
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {can('media.delete') && (
                // No toque não existe hover: o botão fica sempre visível.
                <button
                  type="button"
                  onClick={() => handleDeleteAsset(asset)}
                  className="pointer-events-none absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950/60 text-white opacity-0 transition-opacity hover:bg-destructive focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                  aria-label={`Excluir ${asset.title || asset.filename}`}
                  title="Excluir arquivo"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {confirmDialog}
    </Dialog>
  );
}

function chip(active: boolean): string {
  return [
    'h-8 rounded-full px-3 text-xs font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:text-foreground',
  ].join(' ');
}

function AssetIcon({ mime }: { mime: string }) {
  const cls = 'h-8 w-8 text-muted-foreground';
  if (mime.startsWith('audio/')) return <Music className={cls} />;
  if (mime.startsWith('video/')) return <Film className={cls} />;
  return <FileText className={cls} />;
}
