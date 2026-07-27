import { describe, it, expect } from 'vitest';
import { insertAtCursor } from './text-insert';

describe('insertAtCursor', () => {
  it('insere no meio do texto e devolve o cursor depois do emoji', () => {
    const r = insertAtCursor('bom dia', 3, 3, '😀');
    expect(r.text).toBe('bom😀 dia');
    expect(r.caret).toBe(3 + '😀'.length);
  });

  it('insere no fim quando o cursor está no fim', () => {
    const r = insertAtCursor('oi', 2, 2, '👍');
    expect(r.text).toBe('oi👍');
    expect(r.caret).toBe(2 + '👍'.length);
  });

  it('insere em texto vazio', () => {
    const r = insertAtCursor('', 0, 0, '🎉');
    expect(r.text).toBe('🎉');
    expect(r.caret).toBe('🎉'.length);
  });

  it('substitui a seleção quando há texto selecionado', () => {
    const r = insertAtCursor('bom dia', 0, 3, '👋');
    expect(r.text).toBe('👋 dia');
    expect(r.caret).toBe('👋'.length);
  });

  it('trata seleção invertida (usuário arrastou da direita para a esquerda)', () => {
    const r = insertAtCursor('bom dia', 3, 0, '👋');
    expect(r.text).toBe('👋 dia');
    expect(r.caret).toBe('👋'.length);
  });

  it('limita índices maiores que o texto em vez de gerar "undefined"', () => {
    const r = insertAtCursor('oi', 99, 99, '🙂');
    expect(r.text).toBe('oi🙂');
    expect(r.caret).toBe(2 + '🙂'.length);
  });

  it('limita índices negativos', () => {
    const r = insertAtCursor('oi', -5, -5, '🙂');
    expect(r.text).toBe('🙂oi');
    expect(r.caret).toBe('🙂'.length);
  });
});
