/** Entrega um arquivo baixado pela API ao navegador com o nome escolhido. */
const REVOKE_DELAY_MS = 30_000;

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revogar na hora pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
