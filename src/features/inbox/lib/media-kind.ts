/**
 * Traduz o mime de um arquivo no tipo de mensagem que o provedor entende.
 *
 * Existe porque a mesma cadeia vivia duplicada no envio de anexo e no envio
 * pela Biblioteca — e as duas divergiram: só a da Biblioteca reconhecia áudio,
 * então um áudio anexado do dispositivo ia como DOCUMENT e chegava ao cliente
 * como arquivo pra baixar em vez de áudio tocável.
 */
export type MediaMessageType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

export function messageTypeForMime(mime?: string | null): MediaMessageType {
  // `audio/webm;codecs=opus` e variações de caixa chegam do navegador e do SO.
  const normalized = (mime ?? '').trim().toLowerCase().split(';')[0];
  if (normalized.startsWith('image/')) return 'IMAGE';
  if (normalized.startsWith('video/')) return 'VIDEO';
  if (normalized.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

/** True quando o arquivo deve seguir pelo caminho de áudio (transcode p/ MP3). */
export function isAudioMime(mime?: string | null): boolean {
  return messageTypeForMime(mime) === 'AUDIO';
}

const DOCUMENT_LABELS: Array<{ label: string; exts: string[]; mime?: (m: string) => boolean }> = [
  { label: 'PDF', exts: ['pdf'], mime: (m) => m === 'application/pdf' },
  { label: 'Planilha', exts: ['xlsx', 'xls', 'csv'], mime: (m) => m === 'text/csv' || m.includes('spreadsheet') || m.includes('excel') },
  { label: 'Documento Word', exts: ['doc', 'docx'], mime: (m) => m.includes('wordprocessing') || m === 'application/msword' },
  { label: 'Apresentação', exts: ['ppt', 'pptx'], mime: (m) => m.includes('presentation') || m.includes('powerpoint') },
  { label: 'Arquivo compactado', exts: ['zip', 'rar', '7z'], mime: (m) => m === 'application/zip' },
  { label: 'Imagem', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'], mime: (m) => m.startsWith('image/') },
  { label: 'Vídeo', exts: ['mp4', 'mov', '3gp', 'webm'], mime: (m) => m.startsWith('video/') },
  { label: 'Áudio', exts: ['mp3', 'm4a', 'wav', 'ogg'], mime: (m) => m.startsWith('audio/') },
  { label: 'Texto', exts: ['txt', 'md'], mime: (m) => m.startsWith('text/') },
];

/**
 * Nome do tipo de arquivo para o balão de documento ("PDF", "Planilha").
 * Antes o balão mostrava o mime cru ("application/pdf").
 */
export function documentTypeLabel(mime?: string | null, filename?: string | null): string {
  const normalized = (mime ?? '').trim().toLowerCase().split(';')[0];
  const ext = (filename ?? '').toLowerCase().split('.').pop() ?? '';
  const byExt = DOCUMENT_LABELS.find((d) => d.exts.includes(ext));
  if (byExt) return byExt.label;
  const byMime = normalized ? DOCUMENT_LABELS.find((d) => d.mime?.(normalized)) : undefined;
  return byMime ? byMime.label : 'Arquivo';
}
