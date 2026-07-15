'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

async function getMyWebphone(): Promise<{ webphoneUrl: string | null }> {
  const { data } = await api.get('/organizations/members/me/webphone');
  return data.data ?? data;
}

/**
 * Injeta o script do Widget de Webphone da Sonax do ATENDENTE LOGADO (se ele
 * tiver um configurado em Membros). O widget é auto-injetado pela Sonax e roda
 * enquanto o atendente estiver logado — dá pra atender/desligar dentro do chat.
 * Idempotente: injeta o script uma vez só por sessão.
 */
export function WebphoneWidget() {
  const { data } = useQuery({
    queryKey: ['my-webphone'],
    queryFn: getMyWebphone,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    const url = data?.webphoneUrl;
    if (!url) return;
    // IMPORTANTE: o id TEM que ser 'widget-script' — o próprio widget da Sonax
    // faz document.getElementById('widget-script').src pra ler o data/dataClient.
    // Com outro id ele acha null e quebra ("Cannot read properties of null (reading 'src')").
    if (document.getElementById('widget-script')) return; // já injetado
    const s = document.createElement('script');
    s.id = 'widget-script';
    s.src = url;
    s.async = true;
    document.body.appendChild(s);
    // Não removemos no cleanup: o webphone deve persistir durante a sessão.
  }, [data?.webphoneUrl]);

  return null;
}
