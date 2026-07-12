'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X, Upload, FolderPlus, Trash2, Loader2, FileText, Music, Film, Search,
} from 'lucide-react';
import {
  mediaLibraryService,
  type MediaAsset,
  type MediaFolder,
} from '../services/media-library.service';
import { inboxService } from '@/features/inbox/services/inbox.service';

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

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
      toast.error(err?.response?.data?.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleNewFolder = async () => {
    const name = window.prompt('Nome da nova pasta:')?.trim();
    if (!name) return;
    try {
      await mediaLibraryService.createFolder(name);
      await invalidate();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar pasta');
    }
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    if (!window.confirm(`Excluir "${asset.title || asset.filename}" da biblioteca?`)) return;
    try {
      await mediaLibraryService.deleteAsset(asset.id);
      await invalidate();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Sem permissão para excluir');
    }
  };

  const handleSend = async (asset: MediaAsset) => {
    setSendingId(asset.id);
    try {
      await inboxService.sendLibraryMedia(conversationId, asset);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setSendingId(null);
    }
  };

  if (!open) return null;

  const list = (assets.data ?? []).filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (a.title || a.filename).toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Biblioteca de arquivos
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* toolbar: pastas + ações */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-5 py-2.5 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFolderId(undefined)}
              className={chip(folderId === undefined)}
            >
              Todos
            </button>
            {(folders.data ?? []).map((f: MediaFolder) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFolderId(f.id)}
                className={chip(folderId === f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewFolder}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <FolderPlus className="h-4 w-4" /> Nova pasta
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Enviar arquivo
            </button>
            <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
          </div>
        </div>

        {/* busca */}
        <div className="border-b border-zinc-200 px-5 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-800">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* grid */}
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {assets.isLoading && (
            <p className="col-span-full py-8 text-center text-sm text-zinc-500">Carregando…</p>
          )}
          {!assets.isLoading && list.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-zinc-500">
              Nenhum arquivo aqui ainda. Clique em “Enviar arquivo”.
            </p>
          )}
          {list.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <button
                type="button"
                onClick={() => handleSend(asset)}
                disabled={sendingId === asset.id}
                className="flex w-full flex-col text-left"
                title="Enviar para o cliente"
              >
                <div className="flex h-28 items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                  {asset.mimeType.startsWith('image/') ? (
                    <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <AssetIcon mime={asset.mimeType} />
                  )}
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                  {asset.title || asset.filename}
                </div>
              </button>
              {sendingId === asset.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/60">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDeleteAsset(asset)}
                className="absolute right-1.5 top-1.5 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                aria-label="Excluir arquivo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): string {
  return [
    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'bg-violet-600 text-white'
      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
  ].join(' ');
}

function AssetIcon({ mime }: { mime: string }) {
  const cls = 'h-8 w-8 text-zinc-400';
  if (mime.startsWith('audio/')) return <Music className={cls} />;
  if (mime.startsWith('video/')) return <Film className={cls} />;
  return <FileText className={cls} />;
}
