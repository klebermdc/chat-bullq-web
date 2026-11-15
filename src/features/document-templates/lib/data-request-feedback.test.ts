import { describe, expect, it } from 'vitest';
import { dataRequestFeedback } from './data-request-feedback';

describe('dataRequestFeedback', () => {
  it('confirms when queued or not reported', () => {
    expect(dataRequestFeedback({ queued: true }).kind).toBe('success');
    expect(dataRequestFeedback(null).kind).toBe('success');
  });

  it('warns with the reason and suggests copying', () => {
    const feedback = dataRequestFeedback({ queued: false, error: 'janela de 24h fechada' });
    expect(feedback.kind).toBe('warning');
    expect(feedback.message).toContain('janela de 24h fechada');
    expect(feedback.message).toContain('Copie o texto');
  });
});
