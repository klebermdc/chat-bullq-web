/**
 * Coleta de anexos que chegam FORA do clipe de papel: colar (Ctrl+V) um print
 * e arrastar arquivo pra dentro da conversa.
 *
 * A validação de verdade (mime permitido) é do backend — UploadsService só
 * aceita a whitelist dele. Aqui barramos só o que geraria 400 na certa
 * (pasta arrastada, arquivo vazio, arquivo acima do teto).
 */

/** Espelha UploadsService.MAX_MEDIA_BYTES (64MB). */
export const MAX_MEDIA_BYTES = 64 * 1024 * 1024;

/** Teto de anexos na fila — evita soltar uma pasta com 200 fotos sem querer. */
export const MAX_PENDING_FILES = 10;

export interface IntakeResult {
  accepted: File[];
  rejected: { name: string; reason: string }[];
}

/**
 * Pasta arrastada vira um DataTransferItem de kind "file" cujo getAsFile()
 * devolve um File de 0 byte — só o entry sabe que é diretório.
 */
function isDirectoryEntry(item: DataTransferItem): boolean {
  const getEntry = (item as unknown as {
    webkitGetAsEntry?: () => { isDirectory?: boolean } | null;
  }).webkitGetAsEntry;
  if (typeof getEntry !== 'function') return false;
  try {
    return !!getEntry.call(item)?.isDirectory;
  } catch {
    return false;
  }
}

/** Arquivos de um drop. Usa `items` quando disponível pra descartar pastas. */
export function filesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const items = dt.items ? Array.from(dt.items) : [];
  if (items.length) {
    return items
      .filter((item) => item.kind === 'file' && !isDirectoryEntry(item))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
  }
  return dt.files ? Array.from(dt.files) : [];
}

/** Arquivos de um paste. Texto puro não entra aqui (kind === "string"). */
export function filesFromClipboard(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const items = dt.items ? Array.from(dt.items) : [];
  if (items.length) {
    return items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);
  }
  return dt.files ? Array.from(dt.files) : [];
}

const GENERIC_PASTE_NAME = /^image\.(png|jpe?g|gif|webp)$/i;

/**
 * Print colado chega como "image.png" (ou sem nome). Renomeia pra algo que o
 * cliente entenda no WhatsApp e que não colida com o print anterior.
 */
export function renamePastedFile(file: File, now: Date = new Date()): File {
  if (file.name && !GENERIC_PASTE_NAME.test(file.name)) return file;
  const ext = (file.type.split('/')[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
  const pad = (n: number) => String(n).padStart(2, '0');
  const name =
    `print-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.${ext}`;
  return new File([file], name, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export function validateFiles(files: File[], slotsLeft: number): IntakeResult {
  const accepted: File[] = [];
  const rejected: { name: string; reason: string }[] = [];
  for (const file of files) {
    const name = file.name || 'arquivo';
    if (file.size === 0) {
      rejected.push({ name, reason: 'está vazio ou é uma pasta' });
    } else if (file.size > MAX_MEDIA_BYTES) {
      rejected.push({
        name,
        reason: `passa de ${MAX_MEDIA_BYTES / 1024 / 1024}MB`,
      });
    } else if (accepted.length >= slotsLeft) {
      rejected.push({
        name,
        reason: `o limite é ${MAX_PENDING_FILES} anexos por vez`,
      });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** True quando o arrasto carrega arquivo (e não texto/link da própria página). */
export function dragHasFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return Array.from(dt.types ?? []).includes('Files');
}
