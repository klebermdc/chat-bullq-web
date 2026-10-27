'use client';

import { useMemo } from 'react';
import { CircleAlert, Ticket, TriangleAlert } from 'lucide-react';
import { INPUT_CLS, LABEL_CLS } from '@/features/quotes/components/editor/editor-field';
import { useTicketCatalog } from '../hooks/use-ticket-catalog';
import { matchTicketRule } from '../lib/match-ticket-rule';
import { checkTicketItem, formatAgeBands, lastValidDay, toBR, type TicketCheck } from '../lib/ticket-checks';
import type { TicketCatalog, TicketRule } from '../types';

interface Props {
  id: string;
  item: { provider: string; title: string; startDate: string; endDate: string; ruleId?: string };
  disabled: boolean;
  /** "" = nenhum ingresso da base. */
  onPick: (ruleId: string) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Regras do ingresso para o ATENDENTE montar a cotação (o cliente não vê).
 * Sugere o ingresso pelo texto do print, confere as datas e lista o que avisar.
 */
export function TicketRulesPanel({ id, item, disabled, onPick }: Props) {
  const catalog = useTicketCatalog();
  const { provider, title } = item;
  const suggested = useMemo(
    () => (catalog ? matchTicketRule(catalog.rules, { provider, title }) : null),
    [catalog, provider, title],
  );
  if (!catalog) return null;
  const rule = item.ruleId === undefined ? suggested : (catalog.rules.find((r) => r.id === item.ruleId) ?? null);
  const isSuggestion = item.ruleId === undefined && rule !== null;

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
      <label htmlFor={id} className={`${LABEL_CLS} flex items-center gap-1.5`}>
        <Ticket aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        Regras do ingresso <span className="font-normal text-muted-foreground">(só você vê)</span>
      </label>
      <select id={id} className={INPUT_CLS} value={rule?.id ?? ''} disabled={disabled} onChange={(e) => onPick(e.target.value)}>
        <option value="">Não está na base / não é ingresso</option>
        <RuleOptions catalog={catalog} />
      </select>
      {isSuggestion && <p className="text-xs text-muted-foreground">Sugestão pelo nome do produto. Confira se é este.</p>}
      {rule && <RuleSummary rule={rule} item={item} verifiedAt={catalog.verifiedAt} />}
    </div>
  );
}

function RuleOptions({ catalog }: { catalog: TicketCatalog }) {
  return catalog.operators.map((op) => {
    const rules = catalog.rules.filter((r) => r.operatorId === op.id);
    if (rules.length === 0) return null;
    return (
      <optgroup key={op.id} label={op.name}>
        {rules.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </optgroup>
    );
  });
}

function CheckLine({ check }: { check: TicketCheck }) {
  const isError = check.level === 'error';
  const Icon = isError ? CircleAlert : TriangleAlert;
  return (
    <li className={`flex gap-1.5 ${isError ? 'font-medium text-destructive' : 'text-warning-ink'}`}>
      <Icon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{check.text}</span>
    </li>
  );
}

function Fact({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <p>
      <span className="font-medium text-foreground">{label}:</span> {text}
    </p>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <ul className="ml-4 list-disc space-y-0.5">
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}

function RuleSummary({ rule, item, verifiedAt }: { rule: TicketRule; item: Props['item']; verifiedAt: string }) {
  const checks = checkTicketItem(rule, item, todayISO());
  const last = lastValidDay(rule, item.startDate);
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      {checks.length > 0 && (
        <ul className="space-y-1" aria-label="Pontos de atenção">
          {checks.map((c) => (
            <CheckLine key={c.text} check={c} />
          ))}
        </ul>
      )}
      {last && (
        <p className="font-medium text-foreground">
          Começando em {toBR(item.startDate)}, vale até {toBR(last)}.
        </p>
      )}
      <Fact label="Validade" text={rule.windowRule} />
      <Fact label="Idades" text={formatAgeBands(rule)} />
      <details className="group">
        <summary className="cursor-pointer select-none font-medium text-foreground">Ver regras completas</summary>
        <div className="mt-1.5 space-y-1.5">
          <Fact label="Troca de parque" text={rule.hoppingRule} />
          <Fact label="Idade/altura" text={rule.ageHeight} />
          <List label="Avisar o cliente" items={rule.sellerAlerts} />
          <List label="Não inclui" items={rule.excludes} />
          <Fact label="Troca de data" text={rule.dateChange} />
          <Fact label="Reembolso" text={rule.refund} />
          <Fact label="Uso" text={rule.identification} />
          <List label="Confirmar com o fornecedor" items={rule.pending} />
          <p>Base de regras verificada em {toBR(verifiedAt)}.</p>
        </div>
      </details>
    </div>
  );
}
