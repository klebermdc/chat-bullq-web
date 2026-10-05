/**
 * Rótulo em português para mensagem sem texto na prévia da lista.
 * Antes aparecia o tipo cru do banco entre colchetes ("[IMAGE]").
 */
const TYPE_LABELS: Record<string, string> = {
  IMAGE: 'Foto',
  AUDIO: 'Áudio',
  VIDEO: 'Vídeo',
  DOCUMENT: 'Documento',
  STICKER: 'Figurinha',
  LOCATION: 'Localização',
  CONTACT: 'Contato',
  TEMPLATE: 'Modelo de mensagem',
};

export function messageTypeLabel(type: string | null | undefined): string {
  return TYPE_LABELS[(type ?? '').toUpperCase()] ?? 'Mensagem';
}
