'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shield, ShieldCheck, User, Users, Copy, Link, X, Hash, KeyRound, Phone, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { membersService, type Member } from '@/features/settings/services/members.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { useAuthStore } from '@/stores/auth-store';
import { MemberChannelsDrawer } from '@/features/settings/components/member-channels-drawer';
import { MemberWorkingHoursDrawer } from '@/features/settings/components/member-working-hours-drawer';

const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: 'Proprietário', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
  ADMIN: { label: 'Admin', icon: Shield, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  AGENT: { label: 'Operador', icon: User, color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400' },
};

export default function SettingsMembersPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');
  const [inviting, setInviting] = useState(false);

  const orgId = useOrgId();
  const { data: members, isLoading } = useQuery({
    queryKey: ['members', orgId],
    queryFn: () => membersService.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['members'] });

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [drawerMember, setDrawerMember] = useState<Member | null>(null);
  const [workingHoursMember, setWorkingHoursMember] = useState<Member | null>(null);

  // Papel de quem está olhando a tela: o backend deixa OWNER trocar o
  // e-mail de qualquer um, e ADMIN só de operador. A UI espelha isso pra
  // não oferecer um botão que vai voltar 403.
  const myRole = useAuthStore(
    (s) => s.organizations.find((o) => o.id === s.activeOrgId)?.role ?? 'AGENT',
  );
  const canEditEmail = (m: Member) => myRole === 'OWNER' || m.role === 'AGENT';

  const [emailMember, setEmailMember] = useState<Member | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const openEmail = (m: Member) => {
    setEmailMember(m);
    setEmailValue(m.user.email);
  };
  const closeEmail = () => {
    setEmailMember(null);
    setEmailValue('');
  };

  const handleUpdateEmail = async () => {
    if (!emailMember) return;
    const email = emailValue.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Informe um e-mail válido');
      return;
    }
    if (email === emailMember.user.email.toLowerCase()) {
      closeEmail();
      return;
    }
    setSavingEmail(true);
    try {
      await membersService.updateMemberEmail(emailMember.id, email);
      toast.success(`E-mail de ${emailMember.user.name} atualizado. Ele passa a entrar com o novo e-mail.`);
      closeEmail();
      refresh();
    } catch (e: any) {
      // 409 = e-mail já em uso por outra conta. A mensagem do backend é
      // específica e útil, então mostramos ela em vez de um genérico.
      toast.error(e?.response?.data?.message || 'Não foi possível alterar o e-mail');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const result = await membersService.invite({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      refresh();
      if (result.autoAccepted) {
        toast.success('Membro adicionado com sucesso!');
      } else {
        const link = `${window.location.origin}/register?invite=${result.token}`;
        setInviteLink(link);
        toast.success('Convite criado! Compartilhe o link com o membro.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Link copiado!');
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      await membersService.updateRole(memberId, role);
      toast.success('Role atualizada');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar role');
    }
  };

  const [resetMember, setResetMember] = useState<Member | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);

  const closeReset = () => {
    setResetMember(null);
    setResetPw('');
    setResetConfirm('');
  };

  const handleResetMemberPassword = async () => {
    if (!resetMember || !resetPw) return;
    if (resetPw.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (resetPw !== resetConfirm) {
      toast.error('A confirmação não confere com a nova senha');
      return;
    }
    setResetting(true);
    try {
      await membersService.resetMemberPassword(resetMember.id, resetPw);
      toast.success(`Senha de ${resetMember.user.name} redefinida!`);
      closeReset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao redefinir senha');
    } finally {
      setResetting(false);
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remover ${name} da organização?`)) return;
    try {
      await membersService.remove(memberId);
      toast.success('Membro removido');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  return (
    <div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Membros</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Gerencie os membros da sua organização</p>
      </div>

      <div className="mt-6 flex items-end gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex-1">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Email do membro</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="email@exemplo.com"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Role</label>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="AGENT">Operador</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          onClick={handleInvite}
          disabled={!inviteEmail.trim() || inviting}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> Convidar
        </button>
      </div>

      {inviteLink && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/30 dark:bg-primary/10">
          <Link className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Link de convite (expira em 7 dias)</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{inviteLink}</p>
          </div>
          <button
            onClick={copyInviteLink}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setInviteLink(null)}
            className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Membro</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Canais</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Entrou em</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800">
                  <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            ) : !members?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-zinc-200 dark:text-zinc-700" />
                  <p className="mt-3 text-sm text-zinc-500">Nenhum membro encontrado</p>
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const roleMeta = roleLabels[m.role] || roleLabels.AGENT;
                const RoleIcon = roleMeta.icon;
                return (
                  <tr key={m.id} className="border-b border-zinc-50 dark:border-zinc-800">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium dark:bg-zinc-800">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{m.user.name}</p>
                          <p className="text-[11px] text-zinc-400">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.role === 'OWNER' ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${roleMeta.color}`}>
                          <RoleIcon className="h-3 w-3" /> {roleMeta.label}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="AGENT">Operador</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* OWNER tem acesso intrínseco a tudo (mesmo canais
                          PRIVATE). ADMIN herda os ORG por padrão mas
                          precisa de grant explícito pra PRIVATE — daí
                          ganha o botão "Gerenciar" também. AGENT só vê
                          o que tem grant. */}
                      {m.role === 'OWNER' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Acesso total
                        </span>
                      ) : (
                        <button
                          onClick={() => setDrawerMember(m)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          data-testid="member-channels-btn"
                        >
                          <Hash className="h-3 w-3" /> Gerenciar
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(m.joinedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RamalInput member={m} onSaved={refresh} />
                        {canEditEmail(m) && (
                          <button
                            onClick={() => openEmail(m)}
                            title="Alterar e-mail de login"
                            className="rounded p-1.5 text-zinc-400 hover:bg-primary/10 hover:text-primary"
                            data-testid="member-edit-email-btn"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {m.role !== 'OWNER' && (
                          <>
                            <button
                              onClick={() => setWorkingHoursMember(m)}
                              title="Horário de atendimento"
                              className="rounded p-1.5 text-zinc-400 hover:bg-primary/10 hover:text-primary"
                              data-testid="member-working-hours-btn"
                            >
                              <Clock className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setResetMember(m)}
                              title="Redefinir senha"
                              className="rounded p-1.5 text-zinc-400 hover:bg-primary/10 hover:text-primary"
                              data-testid="member-reset-password-btn"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemove(m.id, m.user.name)}
                              title="Remover membro"
                              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {emailMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeEmail}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Alterar e-mail</h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              O e-mail de login de <span className="font-medium text-zinc-700 dark:text-zinc-300">{emailMember.user.name}</span>.
              A senha continua a mesma.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">E-mail</label>
              <input
                type="email"
                autoComplete="off"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmail()}
                placeholder="nome@empresa.com.br"
                autoFocus
                data-testid="member-email-input"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <p className="mt-2 text-xs text-zinc-500">
                A partir de agora ele entra com este e-mail. Sessões já abertas continuam
                valendo até expirar.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeEmail}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateEmail}
                disabled={!emailValue || savingEmail}
                data-testid="member-email-save-btn"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingEmail ? 'Salvando...' : 'Salvar e-mail'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeReset}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Redefinir senha</h3>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Defina uma nova senha para <span className="font-medium text-zinc-700 dark:text-zinc-300">{resetMember.user.name}</span>. Ela poderá entrar imediatamente com a nova senha.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nova senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetMemberPassword()}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeReset}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetMemberPassword}
                disabled={!resetPw || !resetConfirm || resetting}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {resetting ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberChannelsDrawer
        open={!!drawerMember}
        member={
          drawerMember
            ? {
                // Backend resolves member by userId; the existing list returns
                // userOrganization rows where `userId` is the field we need.
                id: drawerMember.userId,
                name: drawerMember.user.name,
                role: drawerMember.role,
              }
            : null
        }
        onClose={() => setDrawerMember(null)}
        onSaved={refresh}
      />

      <MemberWorkingHoursDrawer
        open={!!workingHoursMember}
        member={workingHoursMember}
        onClose={() => setWorkingHoursMember(null)}
      />
    </div>
  );
}

/**
 * Campo inline do ramal Sonax do membro. Salva no blur (quando muda) via
 * PATCH .../ramal — string vazia limpa o ramal.
 */
function RamalInput({ member, onSaved }: { member: Member; onSaved: () => void }) {
  const [value, setValue] = useState(member.sonaxRamal ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(member.sonaxRamal ?? '');
  }, [member.sonaxRamal]);

  const save = async () => {
    const next = value.trim();
    if (next === (member.sonaxRamal ?? '')) return;
    setSaving(true);
    try {
      await membersService.updateRamal(member.id, next);
      toast.success('Ramal atualizado');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar ramal');
      setValue(member.sonaxRamal ?? '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1" title="Ramal Sonax do atendente">
      <Phone className="h-3 w-3 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        disabled={saving}
        maxLength={6}
        inputMode="numeric"
        placeholder="Ramal"
        className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  );
}
