'use client';

import { useId } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { controlSmCls } from '@/components/ui/control';
import { DEPARTMENTS, updateRoomDepartment, VIRTUAL_HQ_KEY, type Department, type Room } from '../../api';
import { DEPARTMENT_LABEL } from '../../lib/world/departments';

const DEFAULT_VALUE = '';

/** Só gestão: muda a ala da sala. "Padrão pelo papel" devolve a decisão para o papel da pessoa. */
export function DepartmentSelect({ room }: { room: Room }) {
  const id = useId();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (department: Department | null) => updateRoomDepartment(room.userId, department),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VIRTUAL_HQ_KEY }),
    onError: (err) => {
      console.error('[escritorio] troca de departamento falhou', err);
      toast.error('Não deu para trocar o departamento. Tente de novo.');
    },
  });
  const current = room.departmentSource === 'custom' && room.department ? room.department : DEFAULT_VALUE;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-2">
      <label htmlFor={id} className="text-sm font-medium">
        Departamento
      </label>
      <select
        id={id}
        className={controlSmCls}
        value={current}
        disabled={mutation.isPending}
        onChange={(e) => mutation.mutate(e.target.value ? (e.target.value as Department) : null)}
      >
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {DEPARTMENT_LABEL[d]}
          </option>
        ))}
        <option value={DEFAULT_VALUE}>Padrão pelo papel</option>
      </select>
    </div>
  );
}
