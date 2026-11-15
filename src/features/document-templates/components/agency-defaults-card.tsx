'use client';

import { useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { LoadingState } from '@/components/ui/empty-state';
import { settingsCardCls, settingsCardHelpCls, settingsCardTitleCls } from '@/features/settings/components/settings-page-header';
import { useOrgId } from '@/hooks/use-org-query-key';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { buildAgencyDefaultsForm } from '../lib/agency-defaults';
import { placeholderLabel } from '../lib/placeholders';
import { documentTemplatesService } from '../services/document-templates.service';
import type { FieldDefaults } from '../types';

const fieldDefaultsKey = (orgId: string | null) => ['document-field-defaults', orgId] as const;

function AgencyDefaultsForm({ initial }: { initial: FieldDefaults }) {
  const baseId = useId();
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [form] = useState(() => buildAgencyDefaultsForm(initial));
  const [draft, setDraft] = useState<Record<string, string>>(form.draft);
  const [isSaving, setIsSaving] = useState(false);
  const { fields } = form;

  async function save() {
    setIsSaving(true);
    try {
      const values = Object.fromEntries(fields.map((key) => [key, (draft[key] ?? '').trim()]));
      const saved = await documentTemplatesService.saveFieldDefaults(values);
      queryClient.setQueryData(fieldDefaultsKey(orgId), saved);
      toast.success('Dados da agência salvos.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Não foi possível salvar os dados da agência.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (fields.length === 0) {
    return <p className={settingsCardHelpCls}>Nenhum campo de agência sugerido ainda.</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((key, index) => (
          <div key={key} className="space-y-1.5">
            <label htmlFor={`${baseId}-${index}`} className="text-sm font-medium text-foreground">
              {placeholderLabel(key)}
            </label>
            <input
              id={`${baseId}-${index}`}
              type="text"
              value={draft[key] ?? ''}
              disabled={isSaving}
              onChange={(e) => setDraft((current) => ({ ...current, [key]: e.target.value }))}
              className={cn(controlCls, 'w-full')}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isSaving} disabled={isSaving}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

/** "Dados da agência": valores que entram sozinhos em todos os contratos. */
export function AgencyDefaultsCard() {
  const orgId = useOrgId();
  const query = useQuery({
    queryKey: fieldDefaultsKey(orgId),
    queryFn: () => documentTemplatesService.getFieldDefaults(),
    enabled: !!orgId,
  });

  return (
    <section aria-labelledby="agency-defaults-title" className={cn(settingsCardCls, 'space-y-4')}>
      <div className="flex items-start gap-3">
        <Building2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <h3 id="agency-defaults-title" className={settingsCardTitleCls}>Dados da agência</h3>
          <p className={settingsCardHelpCls}>Preenchidos automaticamente em todos os contratos. Campo vazio não é usado.</p>
        </div>
      </div>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !query.data ? (
        <p role="alert" className="text-sm text-foreground">
          {getErrorMessage(query.error, 'Não foi possível carregar os dados da agência.')}
        </p>
      ) : (
        <AgencyDefaultsForm key={query.dataUpdatedAt} initial={query.data} />
      )}
    </section>
  );
}
