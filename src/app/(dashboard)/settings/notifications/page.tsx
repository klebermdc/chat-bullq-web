import { redirect } from 'next/navigation';

// Notificações são preferência pessoal: a tela mudou para Minha conta.
export default function SettingsNotificationsRedirect() {
  redirect('/minha-conta');
}
