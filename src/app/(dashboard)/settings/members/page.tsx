'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, ShieldCheck, User, Users, Copy, Link, X, Hash, KeyRound, Phone, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { membersService, type Member } from '@/features/settings/services/members.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { useAuthStore } from '@/stores/auth-store';
import { MemberChannelsDrawer } from '@/features/settings/components/member-channels-drawer';
import { MemberWorkingHoursDrawer } from '@/features/settings/components/member-working-hours-drawer';
import { RoleAccessLegend } from '@/features/settings/components/role-access-legend';
import { getErrorMessage } from '@/lib/errors';
import { getInitials } from '@/lib/initials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { controlCls, controlSmCls } from '@/components/ui/control';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  SettingsPageHeader,
  settingsCardCls,
  settingsCardHelpCls,
  settingsCardTitleCls,
} from '@/features/settings/components/settings-page-header';

const thCls = 'whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground';
/** Vaga vazia do tamanho de um botão de ícone: mantém os controles de toda linha na mesma coluna. */
const rowIconSlot = <span aria-hidden="true" className="h-8 w-8 shrink-0" />;
/** Botão só de ícone da linha: área de toque de 32px. */
const rowIconBtnBaseCls =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const rowIconBtnCls = `${rowIconBtnBaseCls} hover:bg-primary/10 hover:text-primary`;

export default function SettingsMembersPage() {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
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
  // Mesmo RBAC do reset de senha no backend: OWNER redefine qualquer um
  // (inclusive outro OWNER), ADMIN só operador. Espelhado aqui pra não
  // mostrar um botão que voltaria 403.
  const canResetPassword = (m: Member) => myRole === 'OWNER' || m.role === 'AGENT';

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
      toast.error(getErrorMessage(e, 'Não foi possível alterar o e-mail'));
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
      toast.success('Cargo atualizado');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar cargo');
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
    const confirmed = await confirm({
      title: `Remover ${name} da organização?`,
      description: `${name} perde o acesso a esta organização na hora e só volta com um novo convite.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
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
      <SettingsPageHeader title="Membros" description="Gerencie quem acessa a sua organização e o que cada pessoa pode fazer." />

      <div className="mt-6">
        <RoleAccessLegend />
      </div>

      <section className={`mt-4 ${settingsCardCls}`}>
        <h3 className={settingsCardTitleCls}>Convidar membro</h3>
        <p className={`mt-0.5 ${settingsCardHelpCls}`}>
          Quem já tem conta entra na hora; para os demais geramos um link de convite.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-foreground">
              E-mail do membro
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="email@exemplo.com"
              className={`${controlCls} w-full`}
            />
          </div>
          <div className="w-full sm:w-40">
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-foreground">
              Cargo
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className={`${controlCls} w-full`}
            >
              <option value="AGENT">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button
            onClick={handleInvite}
            disabled={!inviteEmail.trim() || inviting}
            className="w-full sm:w-auto"
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" /> Convidar
          </Button>
        </div>

        {inviteLink && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Link aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">Link de convite (expira em 7 dias)</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{inviteLink}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyInviteLink} className="shrink-0">
              <Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copiar
            </Button>
            <button
              type="button"
              onClick={() => setInviteLink(null)}
              aria-label="Fechar link de convite"
              title="Fechar"
              className={rowIconBtnCls}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[880px]">
          <caption className="sr-only">Membros da organização</caption>
          {/* Larguras fixas nas colunas de controle; o nome fica com a sobra. */}
          <colgroup>
            <col />
            <col className="w-40" />
            <col className="w-36" />
            <col className="w-32" />
            <col className="w-[19rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className={thCls}>Membro</th>
              <th scope="col" className={thCls}>Cargo</th>
              <th scope="col" className={thCls}>Canais</th>
              <th scope="col" className={thCls}>Entrou em</th>
              <th scope="col" className={`${thCls} pr-5 text-right`}>Ramal e ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                  <td className="py-3 pl-4 pr-5" />
                </tr>
              ))
            ) : !members?.length ? (
              <tr>
                <td colSpan={5} className="px-4">
                  <EmptyState
                    size="sm"
                    icon={Users}
                    title="Nenhum membro encontrado"
                    description="Convide alguém pelo e-mail no formulário acima."
                  />
                </td>
              </tr>
            ) : (
              members.map((m) => {
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                          {getInitials(m.user.name) || <User aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{m.user.name}</p>
                          <p className="text-xs text-muted-foreground">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.role === 'OWNER' ? (
                        <Badge variant="hot" className="whitespace-nowrap">
                          <ShieldCheck aria-hidden="true" className="h-3 w-3" /> Proprietário
                        </Badge>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          aria-label={`Cargo de ${m.user.name}`}
                          className={`${controlSmCls} w-28`}
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
                        <Badge className="whitespace-nowrap">Acesso total</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDrawerMember(m)}
                          data-testid="member-channels-btn"
                        >
                          <Hash aria-hidden="true" className="h-3 w-3" /> Gerenciar
                        </Button>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                      {new Date(m.joinedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 pl-4 pr-5 text-right">
                      {/* Quatro vagas fixas de ação: onde o botão não existe
                          (ex.: remover o proprietário) entra uma vaga vazia. */}
                      <div className="flex items-center justify-end gap-1">
                        <RamalInput member={m} onSaved={refresh} />
                        {canEditEmail(m) ? (
                          <button
                            type="button"
                            onClick={() => openEmail(m)}
                            title="Alterar e-mail de login"
                            aria-label={`Alterar e-mail de login de ${m.user.name}`}
                            className={rowIconBtnCls}
                            data-testid="member-edit-email-btn"
                          >
                            <Mail aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : (
                          rowIconSlot
                        )}
                        <button
                          type="button"
                          onClick={() => setWorkingHoursMember(m)}
                          title="Horário de atendimento"
                          aria-label={`Horário de atendimento de ${m.user.name}`}
                          className={rowIconBtnCls}
                          data-testid="member-working-hours-btn"
                        >
                          <Clock aria-hidden="true" className="h-4 w-4" />
                        </button>
                        {canResetPassword(m) ? (
                          <button
                            type="button"
                            onClick={() => setResetMember(m)}
                            title="Redefinir senha"
                            aria-label={`Redefinir senha de ${m.user.name}`}
                            className={rowIconBtnCls}
                            data-testid="member-reset-password-btn"
                          >
                            <KeyRound aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : (
                          rowIconSlot
                        )}
                        {/* Remover fica travado para OWNER: o backend recusa
                            apagar o dono da org (e ninguém apaga a si mesmo). */}
                        {m.role !== 'OWNER' ? (
                          <button
                            type="button"
                            onClick={() => handleRemove(m.id, m.user.name)}
                            title="Remover membro"
                            aria-label={`Remover ${m.user.name} da organização`}
                            className={`${rowIconBtnBaseCls} hover:bg-urgent-wash hover:text-urgent-ink`}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : (
                          rowIconSlot
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
      </div>

      <Dialog
        open={!!emailMember}
        onClose={closeEmail}
        title="Alterar e-mail"
        description={
          <>
            O e-mail de login de <span className="font-medium text-foreground">{emailMember?.user.name}</span>. A
            senha continua a mesma.
          </>
        }
        footer={
          <>
            <Button variant="outline" onClick={closeEmail}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateEmail}
              disabled={!emailValue || savingEmail}
              data-testid="member-email-save-btn"
            >
              {savingEmail ? 'Salvando…' : 'Salvar e-mail'}
            </Button>
          </>
        }
      >
        <label htmlFor="member-email" className="mb-1 block text-sm font-medium text-foreground">
          E-mail
        </label>
        <input
          id="member-email"
          type="email"
          autoComplete="off"
          value={emailValue}
          onChange={(e) => setEmailValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmail()}
          placeholder="nome@empresa.com.br"
          autoFocus
          data-testid="member-email-input"
          className={`${controlCls} w-full`}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          A partir de agora a pessoa entra com este e-mail. Sessões já abertas continuam valendo até expirar.
        </p>
      </Dialog>

      <Dialog
        open={!!resetMember}
        onClose={closeReset}
        title="Redefinir senha"
        description={
          <>
            Defina uma nova senha para <span className="font-medium text-foreground">{resetMember?.user.name}</span>.
            A pessoa poderá entrar imediatamente com a nova senha.
          </>
        }
        footer={
          <>
            <Button variant="outline" onClick={closeReset}>
              Cancelar
            </Button>
            <Button onClick={handleResetMemberPassword} disabled={!resetPw || !resetConfirm || resetting}>
              {resetting ? 'Salvando…' : 'Redefinir senha'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="reset-pw" className="mb-1 block text-sm font-medium text-foreground">
              Nova senha
            </label>
            <input
              id="reset-pw"
              type="password"
              autoComplete="new-password"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoFocus
              className={`${controlCls} w-full`}
            />
          </div>
          <div>
            <label htmlFor="reset-pw-confirm" className="mb-1 block text-sm font-medium text-foreground">
              Confirmar nova senha
            </label>
            <input
              id="reset-pw-confirm"
              type="password"
              autoComplete="new-password"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResetMemberPassword()}
              className={`${controlCls} w-full`}
            />
          </div>
        </div>
      </Dialog>

      {confirmDialog}

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
    <div className="mr-1 flex items-center gap-1.5" title="Ramal Sonax do atendente">
      <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        disabled={saving}
        maxLength={6}
        inputMode="numeric"
        placeholder="Ramal"
        aria-label={`Ramal Sonax de ${member.user.name}`}
        className={`${controlSmCls} w-20 font-mono tabular-nums placeholder:font-sans`}
      />
    </div>
  );
}
