import { EmailBlock, EmailTheme, BlockStyle } from '@/lib/email-api';

export const DEFAULT_THEME: EmailTheme = {
  primaryColor: '#7c3aed',
  textColor: '#18181b',
  backgroundColor: '#f4f4f5',
  containerColor: '#ffffff',
  fontFamily: 'sans',
};

/**
 * Bloco com identidade local. O `id` NÃO é persistido — serve para o React
 * saber qual item é qual na lista e para a seleção sobreviver a reordenação.
 * Índice não serve: ele muda quando o bloco anda.
 */
export type EditorBlock = EmailBlock & { id: string };

export interface EditorState {
  blocks: EditorBlock[];
  theme: EmailTheme;
  selectedId: string | null;
  dirty: boolean;
}

export type BlockType = EmailBlock['type'];

const DEFAULTS: Record<BlockType, () => Omit<EmailBlock, 'id'>> = {
  heading: () => ({ type: 'heading', text: 'Seu título aqui' }),
  text: () => ({ type: 'text', text: 'Escreva seu texto aqui. Use {{nome}} para personalizar.' }),
  image: () => ({ type: 'image', src: '', alt: '' }),
  button: () => ({ type: 'button', label: 'Clique aqui', href: '' }),
  divider: () => ({ type: 'divider' }),
  logo: () => ({ type: 'logo', src: '', href: '' }),
  spacer: () => ({ type: 'spacer', size: 'md' }),
  offer: () => ({ type: 'offer', title: 'Nome do pacote', price: '', label: 'Quero esse', href: '' }),
  social: () => ({ type: 'social', links: [{ network: 'instagram', href: '' }] }),
};

let seq = 0;
const nextId = () => `b${++seq}_${Math.random().toString(36).slice(2, 8)}`;

export function createInitialState(content?: { theme?: Partial<EmailTheme>; blocks?: EmailBlock[] }): EditorState {
  return {
    blocks: (content?.blocks ?? []).map((b) => ({ ...b, id: nextId() })),
    theme: { ...DEFAULT_THEME, ...(content?.theme ?? {}) },
    selectedId: null,
    dirty: false,
  };
}

export function addBlock(state: EditorState, type: BlockType): EditorState {
  const block = { ...DEFAULTS[type](), id: nextId() } as EditorBlock;
  return { ...state, blocks: [...state.blocks, block], selectedId: block.id, dirty: true };
}

export function removeBlock(state: EditorState, id: string): EditorState {
  return {
    ...state,
    blocks: state.blocks.filter((b) => b.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId,
    dirty: true,
  };
}

export function moveBlock(state: EditorState, from: number, to: number): EditorState {
  // Fora dos limites não é erro: é o usuário clicando "subir" no primeiro item.
  // Devolver o mesmo estado evita marcar sujeira por uma ação que não fez nada.
  if (to < 0 || to >= state.blocks.length || from === to) return state;
  const blocks = [...state.blocks];
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return { ...state, blocks, dirty: true };
}

export function updateBlock(state: EditorState, id: string, patch: Record<string, unknown>): EditorState {
  return {
    ...state,
    blocks: state.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EditorBlock) : b)),
    dirty: true,
  };
}

export function updateBlockStyle(state: EditorState, id: string, patch: BlockStyle): EditorState {
  return {
    ...state,
    blocks: state.blocks.map((b) =>
      b.id === id ? ({ ...b, style: { ...(b.style ?? {}), ...patch } } as EditorBlock) : b,
    ),
    dirty: true,
  };
}

export function updateTheme(state: EditorState, patch: Partial<EmailTheme>): EditorState {
  return { ...state, theme: { ...state.theme, ...patch }, dirty: true };
}

export function selectBlock(state: EditorState, id: string | null): EditorState {
  return { ...state, selectedId: id };
}

export function markSaved(state: EditorState): EditorState {
  return { ...state, dirty: false };
}

/** Formato de persistência: sem os ids locais. */
export interface EditorContent {
  theme: EmailTheme;
  blocks: EmailBlock[];
}

export function toContent(state: EditorState): EditorContent {
  return {
    theme: state.theme,
    blocks: state.blocks.map(({ id, ...block }) => block),
  };
}

/**
 * Compara dois conteúdos por igualdade estrutural. `toContent` sempre monta o
 * objeto na mesma ordem de chaves, então `JSON.stringify` é uma comparação
 * profunda válida aqui — não seria em geral.
 *
 * Existe para decidir, depois de um salvamento, se o estado atual ainda é o
 * mesmo que acabou de ser persistido: se o usuário editou durante o
 * salvamento, o conteúdo mudou e a tela não pode se declarar "salva".
 */
export function contentEquals(a: EditorContent, b: EditorContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
