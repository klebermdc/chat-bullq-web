import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { QuotePage } from '@/features/quotes/components/public/quote-page';
import { QuoteUnavailable } from '@/features/quotes/components/public/quote-unavailable';
import { QuoteViewBeacon } from '@/features/quotes/components/public/quote-view-beacon';
import { quoteMetaDescription, quoteMetaTitle } from '@/features/quotes/lib/quote-metadata';
import { fetchPublicQuote, publicQuotePdfUrl } from '@/features/quotes/services/public-quotes.service';

/*
  Cotação pública. Server component: o HTML sai pronto para o cliente e para o
  robô de prévia do WhatsApp (que não roda JS e por isso não conta visita).
  Funciona em /cotacao/<token> e atrás de cotacao.orlandofastpass.com.br/<token>
  (o Caddy reescreve): por isso assets só por caminho absoluto.
*/

type Params = { params: Promise<{ token: string }> };

// generateMetadata e a página pedem a mesma cotação: um fetch só por request.
const loadQuote = cache(fetchPublicQuote);

/*
  Prévia do WhatsApp: imagem ESTÁTICA (scripts/gen-cotacao-og.mjs), não um
  opengraph-image dinâmico com nome e total. O WhatsApp guarda a prévia do
  momento do envio: um total ali envelhece (a cotação vence em 24h e a prévia
  continua mostrando o preço), e nome + valor viajariam em todo encaminhamento.
  Estática também não custa um request à API nem fontes no servidor a cada
  robô, e o caminho /cotacao/og.png vale igual no subdomínio da cotação.
*/
const OG_IMAGE = { url: '/cotacao/og.png', width: 1200, height: 630, alt: 'Sua cotação' };

/** Origem pública do request (domínio do app ou subdomínio da cotação). */
async function requestOrigin(): Promise<URL | undefined> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return undefined;
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  try {
    return new URL(`${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`);
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const result = await loadQuote(token);
  const metadataBase = await requestOrigin();
  if (result.kind !== 'ok') {
    return { metadataBase, title: 'Cotação', robots: { index: false, follow: false } };
  }
  const title = quoteMetaTitle(result.view);
  const description = quoteMetaDescription(result.view);
  return {
    metadataBase,
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', locale: 'pt_BR', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
  };
}

export default async function PublicQuotePage({ params }: Params) {
  const { token } = await params;
  const result = await loadQuote(token);
  if (result.kind === 'not-found') notFound();
  if (result.kind === 'error') return <QuoteUnavailable reason="error" />;
  return (
    <>
      <QuotePage view={result.view} pdfUrl={publicQuotePdfUrl(token)} now={new Date()} />
      <QuoteViewBeacon token={token} />
    </>
  );
}
