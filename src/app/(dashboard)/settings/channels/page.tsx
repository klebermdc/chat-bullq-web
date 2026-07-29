'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChannelsList } from '@/features/channels/components/channels-list';

// `useSearchParams` opta a página inteira fora da renderização estática a
// menos que fique isolada num filho envolto em Suspense — por isso o efeito
// mora num componente à parte, e não direto em `SettingsChannelsPage`.
function InstagramOAuthReturnHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ig = searchParams.get('ig');
    if (!ig) return;

    if (ig === 'ok') {
      toast.success('Instagram conectado!');
    } else {
      const motivos: Record<string, string> = {
        state_invalido: 'O link de conexão expirou. Tente de novo.',
        code_expirado: 'A autorização expirou no meio do caminho. Tente de novo.',
        permissao_negada: 'Você cancelou a autorização no Instagram.',
        sem_conta_business:
          'Essa conta do Instagram não é profissional. Converta para Comercial ou Criador de Conteúdo no app do Instagram e tente de novo.',
        falha_inscricao:
          'Conectamos a conta, mas não conseguimos assinar os webhooks. Fale com o suporte.',
        erro_interno: 'Algo deu errado ao conectar. Tente de novo.',
      };
      const motivo = searchParams.get('motivo') ?? 'erro_interno';
      toast.error(motivos[motivo] ?? motivos.erro_interno);
    }

    // Limpa a query pra um F5 não repetir o toast.
    router.replace('/settings/channels');
  }, [searchParams, router]);

  return null;
}

export default function SettingsChannelsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <InstagramOAuthReturnHandler />
      </Suspense>
      <ChannelsList />
    </>
  );
}
