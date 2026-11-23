/** FNV-1a 32 bits: mesmo id, mesmo número, em qualquer navegador. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const SKIN_TONES = ['#f6d3b3', '#e9b48a', '#c98e62', '#a5693f', '#7a4a2a'] as const;
export const HAIR_COLORS = ['#2b1d14', '#5a3820', '#9a5a2c', '#d9a441', '#1d1d2b', '#b8462e', '#8d8d99'] as const;
export const SHIRT_COLORS = [
  '#e4574b', '#f29e38', '#f2cf4a', '#4fb06c', '#2fa3a0',
  '#4a86e0', '#7a62d6', '#d55aa8', '#3c4a63', '#f4f1e8',
] as const;
export const PANTS_COLORS = ['#2e3a5c', '#3b3b44', '#5b4632', '#465a3a'] as const;
export const HAIR_STYLES = ['short', 'long', 'bun', 'cap'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export interface AvatarLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  pants: string;
}

const pick = <T>(list: readonly T[], n: number): T => list[n % list.length];

/** Visual estável por pessoa: cada pedaço do hash escolhe uma peça. */
export function lookFor(id: string): AvatarLook {
  const h = hashString(id);
  return {
    skin: pick(SKIN_TONES, h),
    hair: pick(HAIR_COLORS, h >>> 4),
    hairStyle: pick(HAIR_STYLES, h >>> 8),
    shirt: pick(SHIRT_COLORS, h >>> 12),
    pants: pick(PANTS_COLORS, h >>> 18),
  };
}

export function lookKey(look: AvatarLook): string {
  return `${look.skin}${look.hair}${look.hairStyle}${look.shirt}${look.pants}`;
}
