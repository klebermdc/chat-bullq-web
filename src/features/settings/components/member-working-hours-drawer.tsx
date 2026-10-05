'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BusinessHoursEditor } from './business-hours-editor';
import { Toggle } from './toggle';
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

  // Esc fecha o painel, como nos diálogos do app.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
        className="absolute inset-0 bg-zinc-950/50"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Horário de ${member.user.name}`}
        className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-overlay"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Horário de {member.user.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Defina a grade semanal e se o cliente recebe aviso quando esse
              atendente estiver fora do horário.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Avisar cliente fora do horário
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Quando ligado, o cliente recebe um aviso automático se
                escrever fora da grade abaixo.
              </p>
            </div>
            <Toggle checked={noticeEnabled} onChange={setNoticeEnabled} label="Avisar cliente fora do horário" />
          </label>

          <BusinessHoursEditor value={hours} onChange={setHours} />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Salvar
          </Button>
        </footer>
      </aside>
    </div>
  );
}
