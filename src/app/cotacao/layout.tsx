import type { Metadata, Viewport } from 'next';
import { QUOTE_FONT_CLASSES } from '@/features/quotes/components/public/quote-fonts';
import './cotacao.css';

/*
  Página que o CLIENTE FINAL abre pelo WhatsApp, quase sempre no 4G. As faces
  do design aprovado (quote-fonts.ts) entram aqui, e não no layout raiz, para
  pesarem só nesta rota. Título e descrição de verdade vêm do
  `generateMetadata` da página.

  noindex/nofollow: a cotação traz nome do cliente, datas e valores. O token na
  URL não impede indexação se o link vazar num print ou encaminhamento.
*/
export const metadata: Metadata = {
  title: 'Sua cotação',
  description: 'Confira os itens, as datas e os valores da sua cotação.',
  robots: { index: false, follow: false },
};

// A barra do navegador no celular acompanha o céu do topo, não o roxo do app.
export const viewport: Viewport = { themeColor: '#17133F' };

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`qt ${QUOTE_FONT_CLASSES}`}>{children}</div>;
}
