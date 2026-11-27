'use client';

import { useState } from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import { useApplyImageText } from '../hooks/use-social-posts';
import type { SocialPost } from '../services/social-posts.service';

export const HEADLINE_MAX = 32;
export const SUBLINE_MAX = 40;

const labelCls = 'text-xs font-medium text-muted-foreground';

/**
 * "Texto na imagem": título e subtítulo que a API escreve por cima do fundo.
 * Só vai ao clicar em "Aplicar na imagem", porque cada envio redesenha a imagem.
 * Campo vazio vai como string vazia (imagem sem aquele texto).
 */
export function ImageTextFields({ post }: { post: SocialPost }) {
  const apply = useApplyImageText(post.id);
  const [headlineDraft, setHeadlineDraft] = useState<string | null>(null);
  const [sublineDraft, setSublineDraft] = useState<string | null>(null);

  const headline = headlineDraft ?? post.headline ?? '';
  const subline = sublineDraft ?? post.subline ?? '';
  const isImageReady = post.imageStatus === 'READY';

  const submit = () => {
    if (apply.isPending) return;
    apply.mutate(
      { headline: headline.trim(), subline: subline.trim() },
      {
        onSuccess: () => {
          setHeadlineDraft(null);
          setSublineDraft(null);
        },
      },
    );
  };

  return (
    <section aria-labelledby={`image-text-${post.id}`} className="space-y-2 rounded-lg border border-border p-3">
      <h3 id={`image-text-${post.id}`} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Type aria-hidden="true" className="h-3.5 w-3.5" />
        Texto na imagem
      </h3>

      <CountedInput
        id={`headline-${post.id}`}
        label="Título"
        value={headline}
        max={HEADLINE_MAX}
        placeholder="Ex.: Fuja das filas na Disney"
        onChange={setHeadlineDraft}
      />
      <CountedInput
        id={`subline-${post.id}`}
        label="Subtítulo"
        value={subline}
        max={SUBLINE_MAX}
        placeholder="Ex.: Comenta GUIA"
        onChange={setSublineDraft}
      />

      <p className="text-xs text-muted-foreground">Deixe em branco para a imagem sair sem texto.</p>
      <Button size="sm" variant="outline" onClick={submit} loading={apply.isPending} disabled={!isImageReady}>
        Aplicar na imagem
      </Button>
    </section>
  );
}

interface CountedInputProps {
  id: string;
  label: string;
  value: string;
  max: number;
  placeholder: string;
  onChange: (value: string) => void;
}

function CountedInput({ id, label, value, max, placeholder, onChange }: CountedInputProps) {
  const counterId = `${id}-count`;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
        <span id={counterId} className="text-xs tabular-nums text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>
      <input
        id={id}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        aria-describedby={counterId}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlCls, 'w-full')}
      />
    </div>
  );
}
