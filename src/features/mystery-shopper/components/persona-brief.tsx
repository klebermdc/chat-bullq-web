'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { generatePersona } from '../api';
import { isBriefValid, MAX_BRIEF_CHARS } from '../bot-status';

const BRIEF_PLACEHOLDER = 'ex.: casal com 2 filhos pequenos, acha caro, viaja em julho';

interface PersonaBriefProps {
  /** Recebe a persona gerada pela IA para preencher o cenário. */
  onGenerated: (persona: string) => void;
}

export function PersonaBrief({ onGenerated }: PersonaBriefProps) {
  const [brief, setBrief] = useState('');
  const generate = useMutation({
    mutationFn: generatePersona,
    onSuccess: (persona) => onGenerated(persona),
    onError: (err) => toast.error(getErrorMessage(err, 'Não foi possível criar a persona.')),
  });
  const canGenerate = isBriefValid(brief) && !generate.isPending;
  const submit = () => {
    if (canGenerate) generate.mutate(brief.trim());
  };

  return (
    <fieldset className="space-y-1.5 rounded-lg border border-dashed border-border px-3 py-2">
      <legend className="px-1 text-sm font-medium">Criar persona com IA</legend>
      <label htmlFor="sim-persona-brief" className="text-xs text-muted-foreground">
        Prévia
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="sim-persona-brief"
          type="text"
          maxLength={MAX_BRIEF_CHARS}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            submit();
          }}
          placeholder={BRIEF_PLACEHOLDER}
          aria-describedby="sim-persona-brief-help"
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={generate.isPending}
          disabled={!canGenerate}
          onClick={submit}
        >
          {generate.isPending ? 'Criando…' : '✨ Criar persona'}
        </Button>
      </div>
      <p id="sim-persona-brief-help" className="text-xs text-muted-foreground">
        A IA usa o que o Sendtur sabe (FAQ da Aline e produtos) para montar o cliente.
      </p>
    </fieldset>
  );
}
