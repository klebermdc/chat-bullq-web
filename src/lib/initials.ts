/**
 * Iniciais para avatar: primeira e última palavra do nome ("Maria Silva" → "MS").
 * Devolve vazio quando não há letra (telefone, nome em branco) — quem chama
 * decide o que mostrar no lugar, em vez de exibir "??" ou "+5".
 */
export function getInitials(name: string | null | undefined): string {
  const words = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w));
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
