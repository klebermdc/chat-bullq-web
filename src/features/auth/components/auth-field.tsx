import { AlertCircle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
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

/** Logo no topo das telas de entrada; troca sozinho para a versão branca no tema escuro. */
export function AuthLogo({ alt = 'Sendtur' }: { alt?: string }) {
  return (
    <div className="flex justify-center pb-2">
      <BrandLogo alt={alt} className="h-12" />
    </div>
  );
}
