/**
 * Tipos de canal usados como ESCOPO de página do inbox.
 *
 * "WhatsApp" não é um tipo só: são três sabores no enum da API
 * (oficial, Zappfy e Wasender). Deixar essa lista num lugar só evita que
 * um canal novo suma do inbox por engano.
 */
export const WHATSAPP_CHANNEL_TYPES =
  'WHATSAPP_OFFICIAL,WHATSAPP_ZAPPFY,WHATSAPP_WASENDER';

export const INSTAGRAM_CHANNEL_TYPES = 'INSTAGRAM';

/**
 * Inbox único: WhatsApp e Instagram na mesma lista. Quem não tem
 * `inbox.instagram.view` (Operador) continua sem ver Instagram — a API
 * tira INSTAGRAM do filtro pelo cargo (enforceInstagramAccess).
 */
export const INBOX_CHANNEL_TYPES = `${WHATSAPP_CHANNEL_TYPES},${INSTAGRAM_CHANNEL_TYPES}`;
