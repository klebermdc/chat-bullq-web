/**
 * Baixar a mídia de uma mensagem (imagem/vídeo) direto pelo site.
 *
 * O atributo `download` do <a> é ignorado quando a URL é de outra origem
 * (API, CDN do Instagram) — o navegador só abre a imagem. Por isso o
 * arquivo é buscado como blob e salvo por um link local; se o fetch for
 * barrado (CORS), abre a mídia numa aba nova para salvar por lá.
 */

export type DownloadKind = 'IMAGE' | 'VIDEO';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'video/webm': 'webm',
};

const DEFAULTS: Record<DownloadKind, { prefix: string; ext: string }> = {
  IMAGE: { prefix: 'imagem', ext: 'jpg' },
  VIDEO: { prefix: 'video', ext: 'mp4' },
};

interface DownloadNameInput {
  fileName?: string | null;
  mimeType?: string | null;
  createdAt?: string | null;
  kind: DownloadKind;
}

export function mediaDownloadName({ fileName, mimeType, createdAt, kind }: DownloadNameInput): string {
  const original = fileName?.trim();
  if (original) return original.replace(/[\\/]/g, '_');

  const fallback = DEFAULTS[kind];
  const mime = (mimeType ?? '').trim().toLowerCase().split(';')[0];
  const ext = EXT_BY_MIME[mime] ?? fallback.ext;
  const date = createdAt ? new Date(createdAt) : null;
  const day = date && !Number.isNaN(date.getTime()) ? `-${date.toISOString().slice(0, 10)}` : '';
  return `${fallback.prefix}${day}.${ext}`;
}

function clickLink(href: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = href;
  if (filename) a.download = filename;
  a.rel = 'noopener noreferrer';
  a.target = filename ? '_self' : '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadMedia(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    clickLink(objectUrl, filename);
    // Dá tempo do navegador começar o download antes de liberar o blob.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch (err) {
    console.warn('[media-download] fetch bloqueado, abrindo em nova aba', err);
    clickLink(url);
  }
}
