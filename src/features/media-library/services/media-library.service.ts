import { api } from '@/lib/api';

export interface MediaFolder {
  id: string;
  name: string;
  /** Pasta de figurinhas: seus .webp aparecem na aba "Figurinhas" do compositor. */
  isStickerFolder: boolean;
  createdById: string | null;
}

export interface MediaAsset {
  id: string;
  folderId: string | null;
  uploadedById: string | null;
  url: string;
  mimeType: string;
  size: number;
  filename: string;
  title: string | null;
  createdAt: string;
}

export const mediaLibraryService = {
  async listFolders(): Promise<MediaFolder[]> {
    const { data } = await api.get('/media-library/folders');
    return data.data;
  },

  async createFolder(
    name: string,
    opts?: { isStickerFolder?: boolean },
  ): Promise<MediaFolder> {
    const { data } = await api.post('/media-library/folders', {
      name,
      ...(opts?.isStickerFolder ? { isStickerFolder: true } : {}),
    });
    return data.data;
  },

  async updateFolder(
    id: string,
    patch: { name?: string; isStickerFolder?: boolean },
  ): Promise<MediaFolder> {
    const { data } = await api.patch(`/media-library/folders/${id}`, patch);
    return data.data;
  },

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/media-library/folders/${id}`);
  },

  /** Figurinhas disponíveis para o compositor (webp em pasta de figurinhas). */
  async listStickers(): Promise<MediaAsset[]> {
    const { data } = await api.get('/media-library/stickers');
    return data.data;
  },

  async listAssets(folderId?: string): Promise<MediaAsset[]> {
    const { data } = await api.get('/media-library/assets', {
      params: folderId ? { folderId } : undefined,
    });
    return data.data;
  },

  async uploadAsset(
    file: File,
    opts?: { folderId?: string; title?: string },
  ): Promise<MediaAsset> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (opts?.folderId) form.append('folderId', opts.folderId);
    if (opts?.title) form.append('title', opts.title);
    const { data } = await api.post('/media-library/assets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data.data;
  },

  async deleteAsset(id: string): Promise<void> {
    await api.delete(`/media-library/assets/${id}`);
  },
};
