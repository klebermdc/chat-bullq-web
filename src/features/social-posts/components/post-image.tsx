'use client';

import { useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { ChevronDown, ImageOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { imageTextMutationKey, useRegenerateImage } from '../hooks/use-social-posts';
import type { SocialPost } from '../services/social-posts.service';

/**
 * Imagem do post no formato do feed (4:5), com os estados de geração. Usa
 * `object-contain` para não cortar o texto escrito na imagem nem os posts
 * antigos, que são quadrados.
 */
export function PostImage({ post }: { post: SocialPost }) {
  const regenerate = useRegenerateImage();
  const isWritingText = useIsMutating({ mutationKey: imageTextMutationKey(post.id) }) > 0;
  const retry = () => regenerate.mutate({ id: post.id });

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
      {post.imageStatus === 'PENDING' && (
        <div role="status" className="absolute inset-0">
          <Skeleton className="h-full w-full rounded-none" />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
            Gerando imagem…
          </span>
        </div>
      )}

      {post.imageStatus === 'FAILED' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <ImageOff aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Não deu para gerar a imagem.</p>
          <Button size="sm" variant="outline" onClick={retry} loading={regenerate.isPending}>
            Tentar de novo
          </Button>
        </div>
      )}

      {post.imageStatus === 'READY' && post.imageUrl && (
        // Imagem externa gerada pela IA: o next/image exigiria liberar o domínio.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt={`Imagem do post: ${post.topic}`} className="h-full w-full object-contain" />
      )}

      {isWritingText && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-background/70">
          <span className="text-sm font-medium text-foreground">Escrevendo o texto na imagem…</span>
        </div>
      )}
    </div>
  );
}

/**
 * "Descrição da imagem" recolhida: quem quiser ajusta o pedido feito à IA e
 * gera outra imagem. Só para posts que ainda não foram agendados.
 */
export function ImagePromptEditor({ post }: { post: SocialPost }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const regenerate = useRegenerateImage();
  const prompt = draft ?? post.imagePrompt;
  const isGenerating = post.imageStatus === 'PENDING';

  const submit = () => {
    const trimmed = prompt.trim();
    const changed = trimmed.length > 0 && trimmed !== post.imagePrompt;
    regenerate.mutate(
      { id: post.id, imagePrompt: changed ? trimmed : undefined },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Descrição da imagem
        <ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="space-y-2 border-t border-border p-3">
          <label htmlFor={`prompt-${post.id}`} className="sr-only">
            Descrição da imagem
          </label>
          <textarea
            id={`prompt-${post.id}`}
            rows={4}
            value={prompt}
            onChange={(event) => setDraft(event.target.value)}
            className={cn(controlCls, 'h-auto w-full resize-y py-2')}
          />
          <p className="text-xs text-muted-foreground">Mude o texto se quiser outra cena. A imagem atual é trocada.</p>
          <Button size="sm" variant="outline" onClick={submit} loading={regenerate.isPending} disabled={isGenerating}>
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Gerar outra imagem
          </Button>
        </div>
      )}
    </div>
  );
}
