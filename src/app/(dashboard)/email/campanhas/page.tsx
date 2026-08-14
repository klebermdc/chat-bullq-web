'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Listagem de campanhas virou a aba "Campanhas" de /email. A rota fica
 * como redirect pra links e favoritos antigos — as sub-rotas
 * (/email/campanhas/<id>, /nova, /editar) seguem páginas próprias e não
 * passam por aqui.
 */
export default function EmailCampanhasRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/email?aba=campanhas');
  }, [router]);
  return null;
}
