import type { PublicQuoteStatus } from '../types';
import { firstName } from './quote-format';

/** DDI + DDD + número: menos que isso o wa.me não abre conversa nenhuma. */
const MIN_PHONE_DIGITS = 10;

/** https://wa.me/<dígitos>?text=<texto>; null sem telefone utilizável. */
export function buildWhatsAppLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < MIN_PHONE_DIGITS) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export interface QuoteContactLinks {
  close: string;
  question: string;
}

interface ContactInput {
  seller: { name: string; whatsapp: string | null };
  code: string;
  status: PublicQuoteStatus;
}

/** Links do CTA "Quero fechar" e do "Tenho uma dúvida"; null sem WhatsApp do vendedor. */
export function quoteContactLinks({ seller, code, status }: ContactInput): QuoteContactLinks | null {
  const name = firstName(seller.name);
  const greeting = name ? `Oi, ${name}!` : 'Oi!';
  const intent = status === 'EXPIRED' ? 'Quero atualizar' : 'Quero fechar';
  const close = buildWhatsAppLink(seller.whatsapp, `${greeting} ${intent} a cotação #${code}`);
  const question = buildWhatsAppLink(seller.whatsapp, `Tenho uma dúvida sobre a cotação #${code}`);
  return close && question ? { close, question } : null;
}
