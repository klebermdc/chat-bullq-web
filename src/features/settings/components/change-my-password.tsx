'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { membersService } from '../services/members.service';

/**
 * Autosserviço de troca de senha do usuário logado (`/users/me/change-password`,
 * sem restrição de role — qualquer membro pode trocar a própria senha).
 * Extraído de settings/members pra viver em /minha-conta, já que o Operador
 * não vê mais a tela de Membros (gated por settings.view).
 */
export function ChangeMyPasswordCard() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação não confere com a nova senha');
      return;
    }
    setSaving(true);
    try {
      await membersService.changePassword({ currentPassword, newPassword });
      toast.success('Senha alterada com sucesso!');
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Senha</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Troque a senha que você usa para entrar.</p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <KeyRound aria-hidden="true" className="h-4 w-4" /> Alterar minha senha
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="my-current-password" className="mb-1 block text-sm font-medium text-foreground">
                Senha atual
              </label>
              <input
                id="my-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`${controlCls} w-full`}
              />
            </div>
            <div>
              <label htmlFor="my-new-password" className="mb-1 block text-sm font-medium text-foreground">
                Nova senha
              </label>
              <input
                id="my-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={`${controlCls} w-full`}
              />
            </div>
            <div>
              <label htmlFor="my-confirm-password" className="mb-1 block text-sm font-medium text-foreground">
                Confirmar nova senha
              </label>
              <input
                id="my-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                className={`${controlCls} w-full`}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || saving}
            >
              {saving ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
