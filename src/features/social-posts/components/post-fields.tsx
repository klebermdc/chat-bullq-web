'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { controlCls } from '@/components/ui/control';
import { cn } from '@/lib/utils';
import { useUpdatePost } from '../hooks/use-social-posts';
import { normalizeKeyword } from '../lib/post-groups';
import type { SocialPost } from '../services/social-posts.service';

const CAPTION_MAX = 2200; // limite do Instagram
const KEYWORD_MAX = 30;

const labelCls = 'text-xs font-medium text-muted-foreground';

/**
 * Legenda e palavra para comentar. Cada campo guarda o rascunho só enquanto
 * difere do que está salvo; ao sair do campo (ou em "Salvar") vai com PATCH.
 */
export function PostTextFields({ post, isEditable }: { post: SocialPost; isEditable: boolean }) {
  // Um por campo: salvar a legenda não trava a palavra, e vice-versa.
  const updateCaption = useUpdatePost();
  const updateKeyword = useUpdatePost();
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const [keywordDraft, setKeywordDraft] = useState<string | null>(null);

  const caption = captionDraft ?? post.caption;
  const keyword = keywordDraft ?? post.commentKeyword ?? '';
  const isCaptionDirty = captionDraft !== null && captionDraft !== post.caption;
  const shownKeyword = normalizeKeyword(keyword);

  const saveCaption = () => {
    // O clique em "Salvar" vem logo depois do blur do campo: não manda duas vezes.
    if (updateCaption.isPending) return;
    if (!isCaptionDirty) return setCaptionDraft(null);
    updateCaption.mutate({ id: post.id, changes: { caption } }, { onSuccess: () => setCaptionDraft(null) });
  };

  const saveKeyword = () => {
    if (updateKeyword.isPending) return;
    const next = normalizeKeyword(keyword);
    if (keywordDraft === null || next === post.commentKeyword) return setKeywordDraft(null);
    updateKeyword.mutate({ id: post.id, changes: { commentKeyword: next } }, { onSuccess: () => setKeywordDraft(null) });
  };

  if (!isEditable) {
    return (
      <div className="space-y-2">
        <p className="whitespace-pre-line text-sm text-foreground">{post.caption}</p>
        {post.commentKeyword && <KeywordHint keyword={post.commentKeyword} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={`caption-${post.id}`} className={labelCls}>
          Legenda
        </label>
        <textarea
          id={`caption-${post.id}`}
          rows={6}
          maxLength={CAPTION_MAX}
          value={caption}
          onChange={(event) => setCaptionDraft(event.target.value)}
          onBlur={saveCaption}
          className={cn(controlCls, 'h-auto w-full resize-y py-2')}
        />
        {isCaptionDirty && (
          <div className="flex justify-end">
            <Button size="sm" onClick={saveCaption} loading={updateCaption.isPending}>
              Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={`keyword-${post.id}`} className={labelCls}>
          Palavra para comentar
        </label>
        <input
          id={`keyword-${post.id}`}
          value={keyword}
          maxLength={KEYWORD_MAX}
          placeholder="Ex.: GUIAMENTO"
          onChange={(event) => setKeywordDraft(event.target.value)}
          onBlur={saveKeyword}
          className={cn(controlCls, 'w-full uppercase')}
        />
        {shownKeyword && <KeywordHint keyword={shownKeyword} />}
      </div>
    </div>
  );
}

function KeywordHint({ keyword }: { keyword: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      No post: <span className="font-semibold text-primary">Comenta {keyword}</span>
    </p>
  );
}
