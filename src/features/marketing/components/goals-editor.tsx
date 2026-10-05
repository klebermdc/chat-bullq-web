'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { marketingService, type MarketingGoals } from '../services/marketing.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';

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
    <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Metas do farol</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Deixe um campo em branco para remover a meta — o indicador correspondente volta a ficar cinza.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          title="Fechar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span>{f.label} {f.unit && <span className="font-normal">({f.unit})</span>}</span>
            <input
              type="number"
              step={f.step}
              value={form[f.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder="Sem meta"
              className={`${controlCls} w-full font-mono tabular-nums`}
            />
          </label>
        ))}
        <div className="col-span-full flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isPending}>
            {isPending ? 'Salvando…' : 'Salvar metas'}
          </Button>
        </div>
      </form>
    </section>
  );
}
