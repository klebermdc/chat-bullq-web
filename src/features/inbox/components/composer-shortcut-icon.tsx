import {
  Calendar,
  Car,
  CreditCard,
  Gift,
  Heart,
  Hotel,
  Info,
  Link as LinkIcon,
  Map as MapIcon,
  MessageSquareText,
  Star,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import type { ShortcutIcon } from '../lib/composer-shortcuts';

export const SHORTCUT_ICON_COMPONENTS: Record<ShortcutIcon, LucideIcon> = {
  message: MessageSquareText,
  star: Star,
  heart: Heart,
  gift: Gift,
  ticket: Ticket,
  hotel: Hotel,
  car: Car,
  map: MapIcon,
  calendar: Calendar,
  'credit-card': CreditCard,
  info: Info,
  link: LinkIcon,
};

/** Nome do ícone para leitor de tela no seletor. */
export const SHORTCUT_ICON_LABELS: Record<ShortcutIcon, string> = {
  message: 'Mensagem',
  star: 'Estrela',
  heart: 'Coração',
  gift: 'Presente',
  ticket: 'Ingresso',
  hotel: 'Hotel',
  car: 'Carro',
  map: 'Mapa',
  calendar: 'Calendário',
  'credit-card': 'Cartão',
  info: 'Informação',
  link: 'Link',
};

export function ComposerShortcutIcon({ icon, className }: { icon: ShortcutIcon; className?: string }) {
  const Icon = SHORTCUT_ICON_COMPONENTS[icon];
  return <Icon aria-hidden="true" className={className} />;
}
