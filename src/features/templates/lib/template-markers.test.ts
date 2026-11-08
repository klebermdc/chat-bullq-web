import { describe, expect, it } from 'vitest';
import type { Template } from '../services/templates.service';
import { TEMPLATE_MARKERS, canToggleMarker, isMarked } from './template-markers';

const base = { id: 't1', status: 'APPROVED' } as Template;
const distribution = TEMPLATE_MARKERS.find((m) => m.key === 'distribution')!;
const reengagement = TEMPLATE_MARKERS.find((m) => m.key === 'reengagement')!;

describe('template-markers', () => {
  it('tem marcador de retomada e de distribuição em campos distintos', () => {
    expect(TEMPLATE_MARKERS.map((m) => m.field)).toEqual(['isReengagement', 'isDistribution']);
  });

  it('isMarked lê só o campo do próprio marcador', () => {
    const t = { ...base, isDistribution: true } as Template;
    expect(isMarked(t, distribution)).toBe(true);
    expect(isMarked(t, reengagement)).toBe(false);
  });

  it('permite marcar só template aprovado', () => {
    expect(canToggleMarker(base, distribution)).toBe(true);
    expect(canToggleMarker({ ...base, status: 'PENDING' } as Template, distribution)).toBe(false);
  });

  it('permite desmarcar mesmo se o template deixou de estar aprovado', () => {
    const t = { ...base, status: 'PAUSED', isDistribution: true } as Template;
    expect(canToggleMarker(t, distribution)).toBe(true);
  });
});
