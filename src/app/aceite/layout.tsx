import { Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './aceite.css';

/*
  As faces vivem AQUI, e não no layout raiz, para pesarem só nesta rota: é a
  única tela que o cliente final abre, quase sempre no 4G do celular, e o app
  inteiro não precisa carregar uma serifada por causa dela.

  A serifada é a personalidade do documento — título, nome da empresa e a
  assinatura que o cliente digita. A sans carrega o resto.
*/
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-aceite-sans',
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-aceite-serif',
  display: 'swap',
});

export default function AcceptanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`${sans.variable} ${serif.variable}`}>{children}</div>;
}
