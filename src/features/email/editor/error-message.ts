/**
 * Extrai uma mensagem de erro legível de uma resposta de API (axios) ou de um
 * erro genérico do JS. Compartilhado entre o salvamento e a prévia — os dois
 * batem na mesma API e recebem o mesmo formato de erro de validação.
 */
export function extractErrorMessage(
  err: unknown,
  fallbackMessage = 'Não foi possível concluir. Tente novamente.',
): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  const fallback = (err as { message?: unknown })?.message;
  return typeof fallback === 'string' && fallback.trim() ? fallback : fallbackMessage;
}
