'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '../schemas/register.schema';
import { authService } from '../services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AuthFieldError, AuthLogo, authFieldCls, authLabelCls } from './auth-field';

interface InviteInfo {
  email: string;
  role: string;
  organization: { id: string; name: string; slug: string };
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, setActiveOrg } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const inviteToken = searchParams.get('invite');

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    authService
      .validateInvitation(inviteToken)
      .then((info) => {
        setInviteInfo(info);
        form.setValue('email', info.email);
      })
      .catch(() => {
        toast.error('Convite inválido ou expirado');
      })
      .finally(() => setInviteLoading(false));
  }, [inviteToken, form]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const result = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
        inviteToken: inviteToken || undefined,
      });

      localStorage.setItem('access_token', result.accessToken);
      localStorage.setItem('refresh_token', result.refreshToken);

      setAuth(result.user, result.organizations);
      setActiveOrg(result.organizations[0].id);

      toast.success(
        inviteInfo
          ? `Bem-vindo! Você entrou em ${inviteInfo.organization.name}`
          : 'Conta criada com sucesso!',
      );
      router.push('/inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (inviteLoading) {
    return (
      <div
        role="status"
        aria-label="Carregando convite…"
        className="mx-auto flex w-full max-w-sm items-center justify-center py-16"
      >
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-8">
      <div className="space-y-2 text-center">
        <AuthLogo alt="Sendtur" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Criar conta</h1>
        {inviteInfo ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Você foi convidado para entrar em:
            </p>
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" />
              {inviteInfo.organization.name}
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-warning-wash px-3 py-2 text-sm text-warning-ink text-balance">
            Sem um link de convite, isto cria uma <strong>empresa nova e vazia</strong>. Se você faz
            parte de uma equipe, peça o link de convite ao seu gestor.
          </p>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className={authLabelCls}>
            Nome
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={authFieldCls}
            placeholder="Seu nome"
            aria-invalid={!!form.formState.errors.name}
            aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
            {...form.register('name')}
          />
          <AuthFieldError id="name-error" message={form.formState.errors.name?.message} />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={authLabelCls}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            readOnly={!!inviteInfo}
            className={cn(authFieldCls, inviteInfo && 'cursor-not-allowed bg-muted')}
            placeholder="seu@email.com"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
            {...form.register('email')}
          />
          <AuthFieldError id="email-error" message={form.formState.errors.email?.message} />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className={authLabelCls}>
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={authFieldCls}
            placeholder="Mínimo 6 caracteres"
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
            {...form.register('password')}
          />
          <AuthFieldError id="password-error" message={form.formState.errors.password?.message} />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className={authLabelCls}>
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={authFieldCls}
            placeholder="Repita a senha"
            aria-invalid={!!form.formState.errors.confirmPassword}
            aria-describedby={form.formState.errors.confirmPassword ? 'confirmPassword-error' : undefined}
            {...form.register('confirmPassword')}
          />
          <AuthFieldError id="confirmPassword-error" message={form.formState.errors.confirmPassword?.message} />
        </div>

        <Button type="submit" size="lg" loading={isLoading} className="h-11 w-full">
          {inviteInfo ? 'Criar conta e entrar' : 'Criar conta'}
        </Button>
      </form>

      <p className="mx-auto max-w-xs text-balance text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Fazer login
        </Link>
      </p>
    </div>
  );
}
