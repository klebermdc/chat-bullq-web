import { AlertCircle } from 'lucide-react';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';

/** Campo das telas de entrada: mesmo controle do app, um pouco mais alto. */
export const authFieldCls = cn(controlCls, 'h-11 w-full');
export const authLabelCls = 'text-sm font-medium text-foreground';

export function AuthFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-urgent-ink">
      <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

/**
 * O símbolo é um PNG de cor fixa (índigo escuro): sobre o cartão do tema
 * escuro ele some. Por isso a placa é branca nos dois temas — é a marca
 * sobre o próprio fundo, não uma superfície do app.
 */
export function AuthLogo({ alt = '' }: { alt?: string }) {
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white shadow-soft">
      <img src="/sendtur-symbol.png" alt={alt} className="h-10 w-auto" />
    </div>
  );
}
