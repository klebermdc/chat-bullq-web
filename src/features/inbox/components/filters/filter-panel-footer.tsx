'use client';

import { useState } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import { SHORTCUT_NAME_MAX } from '../../lib/filter-shortcuts';
import { filterControlCls, focusRing } from './filter-ui';

const footerBtn = `flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

function NameForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string) => boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const submit = () => {
    if (onSave(name)) onCancel();
  };
  return (
    <div className="flex flex-col gap-1.5">
      <input
        autoFocus
        type="text"
        value={name}
        maxLength={SHORTCUT_NAME_MAX}
        aria-label="Nome do atalho"
        placeholder="Nome do atalho (ex.: Leads de anúncio)"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            // Fecha só o campo, não o painel inteiro.
            e.stopPropagation();
            onCancel();
          }
        }}
        className={`${filterControlCls} w-full`}
      />
      <div className="flex gap-1.5">
        <button type="button" onClick={onCancel} className={`${footerBtn} text-muted-foreground hover:bg-muted`}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className={`${footerBtn} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

/** Rodapé fixo: sempre à vista; a sombra avisa que há conteúdo rolando por baixo. */
export function FilterPanelFooter({
  onClear,
  canSaveShortcut,
  saveHint,
  onSaveShortcut,
}: {
  onClear: () => void;
  canSaveShortcut: boolean;
  /** Por que salvar está desligado (vai no title do botão). */
  saveHint?: string;
  onSaveShortcut: (name: string) => boolean;
}) {
  const [naming, setNaming] = useState(false);
  return (
    <div className="sticky bottom-0 border-t border-border bg-popover px-1.5 pb-0.5 pt-1.5 shadow-[0_-8px_12px_-10px_rgb(0_0_0/0.35)]">
      {naming ? (
        <NameForm onSave={onSaveShortcut} onCancel={() => setNaming(false)} />
      ) : (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onClear}
            className={`${footerBtn} text-muted-foreground hover:bg-primary/10 hover:text-primary`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={() => setNaming(true)}
            disabled={!canSaveShortcut}
            title={canSaveShortcut ? 'Salvar estes filtros como atalho' : saveHint}
            className={`${footerBtn} text-primary hover:bg-primary/10`}
          >
            <BookmarkPlus aria-hidden="true" className="h-4 w-4" />
            Salvar como atalho
          </button>
        </div>
      )}
    </div>
  );
}
