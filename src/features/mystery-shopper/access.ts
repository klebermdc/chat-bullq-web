export type AccessDecision = 'loading' | 'redirect' | 'show';

/** Só redireciona depois que a consulta de acesso terminou e negou. */
export function accessDecision({ allowed, isLoading }: { allowed: boolean; isLoading: boolean }): AccessDecision {
  if (isLoading) return 'loading';
  return allowed ? 'show' : 'redirect';
}
