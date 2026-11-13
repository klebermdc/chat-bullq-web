'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SimulatorBot } from '../api';
import { describeBot, isPersonaValid, MAX_PERSONA_CHARS } from '../bot-status';

const PERSONA_PLACEHOLDER =
  'Ex.: Mariana, 38 anos, SP, família de 4 (filhos de 8 e 12), Orlando na 2ª quinzena de julho, ' +
  'quer Disney e Universal, orçamento apertado, achou mais barato em outro site';

interface BotPanelProps {
  bot: SimulatorBot | null;
  isStarting: boolean;
  isStopping: boolean;
  onStart: (persona: string) => void;
  onStop: () => void;
}

export function BotPanel({ bot, isStarting, isStopping, onStart, onStop }: BotPanelProps) {
  const [persona, setPersona] = useState('');
  const view = describeBot(bot);

  if (!view.showForm) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span role="status" className="text-sm font-medium">
          {view.badge}
        </span>
        {view.canStop && (
          <Button type="button" variant="outline" size="sm" loading={isStopping} onClick={onStop}>
            Parar robô
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-2 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (isPersonaValid(persona) && !isStarting) onStart(persona.trim());
      }}
    >
      {view.error && (
        <p role="alert" className="text-sm text-urgent-ink">
          O robô parou: {view.error}
        </p>
      )}
      <label htmlFor="sim-persona" className="text-sm font-medium">
        Cenário do cliente
      </label>
      <textarea
        id="sim-persona"
        rows={3}
        maxLength={MAX_PERSONA_CHARS}
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        placeholder={PERSONA_PLACEHOLDER}
        className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm"
      />
      <Button type="submit" size="sm" loading={isStarting} disabled={!isPersonaValid(persona)}>
        Iniciar visita com IA
      </Button>
    </form>
  );
}
