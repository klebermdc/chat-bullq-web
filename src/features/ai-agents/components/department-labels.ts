/**
 * Nome do departamento como o time fala. O banco guarda o valor em caixa alta
 * e sem acento ("CONTABIL"); a tela mostra "Contábil".
 */
const DEPARTMENT_LABELS: Record<string, string> = {
  VENDAS: 'Vendas',
  SUPORTE: 'Suporte',
  CS: 'CS',
  CONTABIL: 'Contábil',
  JURIDICO: 'Jurídico',
  FINANCEIRO: 'Financeiro',
  OPERACOES: 'Operações',
  TECNOLOGIA: 'Tecnologia',
  MARKETING: 'Marketing',
  OUTRO: 'Outro',
};

export function departmentLabel(department: string | null | undefined): string {
  if (!department) return 'Sem departamento';
  const known = DEPARTMENT_LABELS[department.toUpperCase()];
  if (known) return known;
  const text = department.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
