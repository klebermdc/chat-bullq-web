/**
 * Nome legível do tipo de canal. Antes as telas mostravam o enum do banco
 * em minúsculas ("whatsapp official", "whatsapp zappfy").
 */
const CHANNEL_TYPE_LABELS: Record<string, string> = {
  WHATSAPP_OFFICIAL: 'WhatsApp (API oficial)',
  WHATSAPP_ZAPPFY: 'WhatsApp (Zappfy)',
  WHATSAPP_WASENDER: 'WhatsApp (Wasender)',
  INSTAGRAM: 'Instagram',
  MESSENGER: 'Messenger',
  TELEGRAM: 'Telegram',
  EMAIL: 'E-mail',
  SMS: 'SMS',
};

export function channelTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Canal';
  const known = CHANNEL_TYPE_LABELS[type.toUpperCase()];
  if (known) return known;
  const words = type.toLowerCase().split('_').filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}
