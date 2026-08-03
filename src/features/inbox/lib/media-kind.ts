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
