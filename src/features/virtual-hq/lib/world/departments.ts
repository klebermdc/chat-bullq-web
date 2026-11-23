import { DEPARTMENTS, type Department } from '../../api';

export const DEPARTMENT_LABEL: Record<Department, string> = {
  diretoria: 'Diretoria',
  comercial: 'Comercial',
  guiamento: 'Guiamento',
  tecnologia: 'Tecnologia',
};

const MANAGER_ROLES = new Set(['OWNER', 'ADMIN']);

export function isManagerRole(role: string | null | undefined): boolean {
  return !!role && MANAGER_ROLES.has(role);
}

const isDepartment = (v: unknown): v is Department =>
  typeof v === 'string' && (DEPARTMENTS as readonly string[]).includes(v);

/** Departamento da sala; se a API não mandar (ou mandar um desconhecido), vale o padrão pelo papel. */
export function resolveDepartment(room: { role: string; department?: unknown }): Department {
  if (isDepartment(room.department)) return room.department;
  return isManagerRole(room.role) ? 'diretoria' : 'comercial';
}
