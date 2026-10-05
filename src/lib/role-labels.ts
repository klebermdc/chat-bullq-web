/** Cargo do membro como o time fala, em vez do enum do banco. */
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  AGENT: 'Operador',
};

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABELS[(role ?? '').toUpperCase()] ?? 'Operador';
}
