'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BusinessHoursEditor } from './business-hours-editor';
import { membersService, type Member } from '../services/members.service';
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursConfig,
} from '@/features/ai-agents/services/ai-settings.service';

interface Props {
  open: boolean;
  onClose: () => void;
  member: Member | null;
}

/**
 * Drawer de horário de trabalho por membro (espelha MemberChannelsDrawer).
 * Salva a grade semanal (BusinessHoursConfig) e o toggle de aviso de
 * fora-do-horário desse atendente específico.
 */
export function MemberWorkingHoursDrawer({ open, onClose, member }: Props) {
  const qc = useQueryClient();

  const [hours, setHours] = useState<BusinessHoursConfig>(DEFAULT_BUSINESS_HOURS);
  const [noticeEnabled, setNoticeEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setHours(member.workingHours ?? DEFAULT_BUSINESS_HOURS);
    setNoticeEnabled(!!member.offHoursNoticeEnabled);
  }, [member, open]);

  if (!open || !member) return null;

  const save = async () => {
    setSaving(true);
    try {
      await membersService.updateWorkingHours(member.id, {
        workingHours: hours,
        offHoursNoticeEnabled: noticeEnabled,
      });
      toast.success('Horário de atendimento salvo');
      qc.invalidateQueries({ queryKey: ['members'] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o horário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-zinc-900">
        <header className="flex items-start justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h3 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <Clock className="h-4 w-4 text-primary" />
              Horário de {member.user.name}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Defina a grade semanal e se o cliente recebe aviso quando esse
              atendente estiver fora do horário.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Avisar cliente fora do horário
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Quando ligado, o cliente recebe um aviso automático se
                escrever fora da grade abaixo.
              </p>
            </div>
            <Toggle checked={noticeEnabled} onChange={setNoticeEnabled} />
          </label>

          <BusinessHoursEditor value={hours} onChange={setHours} />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
      type="button"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
