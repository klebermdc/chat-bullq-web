import Image from 'next/image';

interface Props {
  reason: 'not-found' | 'error';
}

const COPY = {
  'not-found': {
    title: 'Não encontramos esta cotação',
    text: 'Confira se o link chegou inteiro. Se precisar, responda a mensagem no WhatsApp que a gente manda de novo.',
  },
  error: {
    title: 'Não consegui abrir a cotação agora',
    text: 'Pode ser a conexão. Tente de novo em alguns instantes ou responda a mensagem no WhatsApp.',
  },
} as const;

/** Página amigável para link inválido, inexistente ou API fora do ar. */
export function QuoteUnavailable({ reason }: Props) {
  const copy = COPY[reason];
  return (
    <main className="qt-unavailable qt-dark">
      <Image src="/cotacao/logo-branco.png" alt="Orlando Fast Pass" width={148} height={78} unoptimized />
      <h1>{copy.title}</h1>
      <p>{copy.text}</p>
    </main>
  );
}
