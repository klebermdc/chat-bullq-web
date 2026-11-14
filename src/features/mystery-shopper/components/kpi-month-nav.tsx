'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canGoNext, monthLabel, shiftMonth } from '../kpis';

export function KpiMonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const label = monthLabel(month);
  const hasNext = canGoNext(month);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Mês dos indicadores">
      <Button size="sm" variant="ghost" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </Button>
      <span aria-live="polite" className="min-w-[10rem] text-center text-sm font-medium">
        {label}
      </span>
      <Button
        size="sm"
        variant="ghost"
        aria-label="Próximo mês"
        disabled={!hasNext}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}
