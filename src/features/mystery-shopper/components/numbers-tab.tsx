'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/errors';
import {
  formatDate,
  TableCard,
  tbodyCls,
  tdCls,
  tdMutedCls,
  theadCls,
  thCls,
  trCls,
} from '@/features/crm-reports/components/table-parts';
import {
  addNumber,
  fetchNumbers,
  NUMBERS_QUERY_KEY,
  removeNumber,
} from '../api';
import { SimulatedForm } from './simulated-form';

const INPUT_CLS = 'h-9 rounded-lg border border-border bg-card px-3 text-sm';

export function NumbersTab() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('');
  const { data, isLoading, isError } = useQuery({ queryKey: NUMBERS_QUERY_KEY, queryFn: fetchNumbers });
  const refresh = () => queryClient.invalidateQueries({ queryKey: NUMBERS_QUERY_KEY });
  const canSubmit = phone.trim() !== '' && label.trim() !== '';

  const add = useMutation({
    mutationFn: addNumber,
    onSuccess: () => {
      toast.success('Número cadastrado. As próximas conversas dele viram visita.');
      setPhone('');
      setLabel('');
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível cadastrar o número.')),
  });
  const remove = useMutation({
    mutationFn: removeNumber,
    onSuccess: () => {
      toast.success('Número removido. As visitas antigas continuam.');
      refresh();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível remover.')),
  });

  return (
    <div className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) add.mutate({ phone: phone.trim(), label: label.trim() });
        }}
      >
        <label htmlFor="shopper-phone" className="sr-only">
          Telefone
        </label>
        <input
          id="shopper-phone"
          required
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone com DDD"
          className={INPUT_CLS}
        />
        <label htmlFor="shopper-label" className="sr-only">
          Apelido
        </label>
        <input
          id="shopper-label"
          required
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Apelido (só você vê)"
          className={`${INPUT_CLS} flex-1`}
        />
        <Button type="submit" size="sm" loading={add.isPending} disabled={!canSubmit}>
          Cadastrar
        </Button>
      </form>

      <SimulatedForm />

      {isLoading && <LoadingState label="Carregando números…" />}
      {isError && (
        <p role="alert" className="text-sm text-urgent-ink">
          Não foi possível carregar os números.
        </p>
      )}
      {data && data.length === 0 && (
        <EmptyState title="Nenhum número" description="Cadastre o chip de teste para começar." size="sm" />
      )}
      {data && data.length > 0 && (
        <TableCard label="Números de cliente oculto" minWidth="min-w-[560px]">
          <thead className={theadCls}>
            <tr>
              <th className={thCls}>Apelido</th>
              <th className={thCls}>Tipo</th>
              <th className={thCls}>Telefone</th>
              <th className={thCls}>Desde</th>
              <th className={thCls}>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {data.map((n) => (
              <tr key={n.id} className={trCls}>
                <td className={tdCls}>{n.label}</td>
                <td className={tdMutedCls}>{n.isSimulated ? 'Simulado' : 'Chip'}</td>
                <td className={tdMutedCls}>{n.contact.phone ?? '—'}</td>
                <td className={tdMutedCls}>{formatDate(n.createdAt)}</td>
                <td className={tdCls}>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remover ${n.label}`}
                    loading={remove.isPending && remove.variables === n.id}
                    onClick={() => {
                      if (window.confirm(`Remover "${n.label}"? Novas conversas dele deixam de virar visita.`)) {
                        remove.mutate(n.id);
                      }
                    }}
                  >
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
