/**
 * Tipos de canal usados como ESCOPO de página do inbox.
 *
 * "WhatsApp" não é um tipo só: são três sabores no enum da API
 * (oficial, Zappfy e Wasender). Deixar essa lista num lugar só evita que
 * um canal novo apareça no Instagram por engano — ou suma dos dois.
 */
export const WHATSAPP_CHANNEL_TYPES =
  'WHATSAPP_OFFICIAL,WHATSAPP_ZAPPFY,WHATSAPP_WASENDER';

export const INSTAGRAM_CHANNEL_TYPES = 'INSTAGRAM';
