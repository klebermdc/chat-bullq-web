import { describe, expect, it } from 'vitest';
import {
  BUBBLE_ALERT_ROWS, BUBBLE_SLEEP_ROWS, CHAR_H, CHAR_W, characterRows, ROBOT_ROWS, SUITCASE_ROWS, VISITOR_ROWS,
} from './character-templates';

const isRect = (rows: readonly string[]) => rows.every((r) => r.length === rows[0].length);

describe('desenhos em texto', () => {
  it('todo quadro do boneco tem 16x19', () => {
    for (const view of ['front', 'back', 'side'] as const) {
      for (const frame of [0, 1, 2] as const) {
        const rows = characterRows(view, frame);
        expect(rows).toHaveLength(CHAR_H);
        expect(rows.every((r) => r.length === CHAR_W), `${view} ${frame}`).toBe(true);
      }
    }
  });

  it('os outros desenhos são retangulares', () => {
    for (const rows of [VISITOR_ROWS, SUITCASE_ROWS, ROBOT_ROWS, BUBBLE_ALERT_ROWS, BUBBLE_SLEEP_ROWS]) {
      expect(isRect(rows)).toBe(true);
    }
  });
});
