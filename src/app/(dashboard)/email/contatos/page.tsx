'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Destinatários virou aba de /email; rota mantida como redirect. */
export default function EmailContatosRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/email?aba=destinatarios');
  }, [router]);
  return null;
}
