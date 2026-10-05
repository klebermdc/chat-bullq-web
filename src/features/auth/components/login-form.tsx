'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';
import { authService } from '../services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { AuthFieldError, AuthLogo, authFieldCls, authLabelCls } from './auth-field';

export function LoginForm() {
  const router = useRouter();
  const { setAuth, setActiveOrg } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await authService.login(data);

      localStorage.setItem('access_token', result.accessToken);
      localStorage.setItem('refresh_token', result.refreshToken);

      setAuth(result.user, result.organizations);
      // setAuth already picks the best org (stored or first available)

      toast.success(`Bem-vindo, ${result.user.name}!`);
      router.push('/inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-8">
      <div className="space-y-2 text-center">
        <AuthLogo />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sendtur</h1>
        <p className="text-sm text-muted-foreground">
          Entre na sua conta para acessar o painel
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className={authLabelCls}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={authFieldCls}
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
            autoComplete="current-password"
            className={authFieldCls}
            placeholder="••••••"
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
            {...form.register('password')}
          />
          <AuthFieldError id="password-error" message={form.formState.errors.password?.message} />
        </div>

        <Button type="submit" size="lg" loading={isLoading} className="h-11 w-full">
          Entrar
        </Button>
      </form>

      {/* Sem "Criar conta": o atendente entra pelo link de convite, e o
          cadastro solto criava uma empresa nova e vazia com ele como dono.
          /register continua existindo para o link de convite. */}
      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p className="mx-auto max-w-xs text-balance">Esqueceu a senha? Peça ao seu gestor para redefinir em Configurações › Membros.</p>
        <p className="mx-auto max-w-xs text-balance">Primeiro acesso? Use o link de convite que o gestor enviou.</p>
      </div>
    </div>
  );
}
