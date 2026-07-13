import { api } from '@/lib/api';

export interface MediaFolder {
  id: string;
  name: string;
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

  async createFolder(name: string): Promise<MediaFolder> {
    const { data } = await api.post('/media-library/folders', { name });
    return data.data;
  },

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`/media-library/folders/${id}`);
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
