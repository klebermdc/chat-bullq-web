import type { Metadata } from 'next';
import { Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './aceite.css';

/*
  O layout raiz titula tudo como "Sendtur", e esta é a única tela que sai da
  plataforma e chega no celular do cliente final — que pode ser cliente da OFP,
  da Sendtur ou de qualquer tenant futuro. Nome de empresa errada na aba de um
  documento que a pessoa vai assinar não é só feio: é confuso bem na hora de
  confirmar.

  O título é DELIBERADAMENTE neutro. Pôr o nome da organização aqui exigiria
  buscar o aceite por token no servidor (`generateMetadata` async), e este
  título não vale um fetch a mais no caminho crítico de quem abre o link.
*/
export const metadata: Metadata = {
  title: 'Confirmação de entrega',
  // Herdada, a descrição do layout raiz ("Omnichannel customer service
  // platform") aparecia em inglês na prévia do link dentro do WhatsApp — o
  // oposto do que a pessoa espera ler antes de abrir um documento para assinar.
  description: 'Confira os itens recebidos e confirme a entrega.',
  /*
    NÃO REMOVA ISTO ACHANDO QUE É AJUSTE DE SEO.

    Um aceite assinado exibe nome do cliente, itens comprados, localizadores de
    voucher e — desde a mescla de voucher — nomes e datas de nascimento dos
    passageiros. É dado pessoal com valor probatório.

    O token da URL não protege contra indexação: basta o link aparecer num
    histórico compartilhado, num print ou num encaminhamento para o buscador
    chegar nele. `follow: false` completa: sem isso o robô ainda seguiria os
    links dos vouchers a partir daqui.
  */
  robots: { index: false, follow: false },
};

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
