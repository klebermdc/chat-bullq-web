'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { marketingService, type MarketingGoals } from '../services/marketing.service';
import { useOrgId } from '@/hooks/use-org-query-key';

type GoalField = keyof MarketingGoals;
type FormState = Record<GoalField, string>;

const FIELDS: Array<{ key: GoalField; label: string; unit: string; step: string }> = [
  { key: 'monthlyBudget', label: 'Orçamento mensal', unit: 'R$', step: '0.01' },
  { key: 'targetCpl', label: 'CPL alvo', unit: 'R$', step: '0.01' },
  { key: 'targetCtrPct', label: 'CTR alvo', unit: '%', step: '0.1' },
  { key: 'targetLeadsPerDay', label: 'Leads por dia (alvo)', unit: '', step: '1' },
  { key: 'targetFrequencyMax', label: 'Frequência máxima', unit: '', step: '0.1' },
  { key: 'targetConversionPct', label: 'Conversão alvo', unit: '%', step: '0.1' },
];

const EMPTY_FORM: FormState = {
  monthlyBudget: '',
  targetCpl: '',
  targetCtrPct: '',
  targetLeadsPerDay: '',
  targetFrequencyMax: '',
  targetConversionPct: '',
};

function goalsToForm(goals: MarketingGoals | undefined): FormState {
  if (!goals) return EMPTY_FORM;
  const form = { ...EMPTY_FORM };
  for (const key of Object.keys(EMPTY_FORM) as GoalField[]) {
    const value = goals[key];
    form[key] = value === null || value === undefined ? '' : String(value);
  }
  return form;
}

interface GoalsEditorProps {
  open: boolean;
  onClose: () => void;
}

export function GoalsEditor({ open, onClose }: GoalsEditorProps) {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const { data: goals } = useQuery({
    queryKey: ['marketing-goals', orgId],
    queryFn: () => marketingService.goals(),
    enabled: open,
  });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (goals) setForm(goalsToForm(goals));
  }, [goals]);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: MarketingGoals) => marketingService.saveGoals(payload),
    onSuccess: () => {
      toast.success('Metas salvas');
      queryClient.invalidateQueries({ queryKey: ['marketing-goals'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-overview'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar metas');
    },
  });

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Campo vazio = meta removida (null), nunca vira 0 — é isso que permite
    // ao usuário "desfazer" uma meta que configurou antes.
    const payload = Object.fromEntries(
      (Object.keys(form) as GoalField[]).map((key) => {
        const raw = form[key].trim();
        return [key, raw === '' ? null : Number(raw)];
      }),
    ) as unknown as MarketingGoals;
    mutate(payload);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Metas do farol</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Deixe um campo em branco para remover a meta — o indicador correspondente volta a ficar cinza.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col text-xs text-zinc-500">
            {f.label} {f.unit && <span className="text-zinc-400">({f.unit})</span>}
            <input
              type="number"
              step={f.step}
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder="Sem meta"
              className="mt-0.5 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        ))}
        <div className="col-span-full flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending ? 'Salvando…' : 'Salvar metas'}
          </button>
        </div>
      </form>
    </section>
  );
}
