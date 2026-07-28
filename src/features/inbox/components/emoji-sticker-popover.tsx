'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { StickerGrid } from './sticker-grid';
import type { MediaAsset } from '@/features/media-library/services/media-library.service';

/**
 * Carregado sob demanda: os dados do emoji-mart são grandes e não podem entrar
 * no bundle inicial do inbox.
 */
const EmojiPickerPanel = dynamic(
  () => import('./emoji-picker-panel').then((m) => m.EmojiPickerPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

interface Props {
  onPickEmoji: (emoji: string) => void;
  onPickSticker: (asset: MediaAsset) => void;
}

type Tab = 'emoji' | 'sticker';

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ['emoji', 'Emojis'],
  ['sticker', 'Figurinhas'],
];

export function EmojiStickerPopover({ onPickEmoji, onPickSticker }: Props) {
  const [tab, setTab] = useState<Tab>('emoji');

  return (
    <div className="w-[352px]">
      <div className="flex border-b border-zinc-200 dark:border-zinc-700">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'flex-1 border-b-2 border-violet-600 px-3 py-2 text-sm font-medium text-foreground'
                : 'flex-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'emoji' ? (
        <EmojiPickerPanel onPick={onPickEmoji} />
      ) : (
        <StickerGrid onPick={onPickSticker} />
      )}
    </div>
  );
}
