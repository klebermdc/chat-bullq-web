import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';

/*
  Faces do design aprovado da página pública. Vivem aqui (e não no layout
  raiz) para pesarem só onde a página aparece: na rota /cotacao e na prévia
  antes do envio, dentro do painel.
*/
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-qt-display',
  display: 'swap',
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-qt-body',
  display: 'swap',
});

/** Classes que definem `--font-qt-display` e `--font-qt-body` para o `.qt`. */
export const QUOTE_FONT_CLASSES = `${display.variable} ${body.variable}`;
