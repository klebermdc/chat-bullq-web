/**
 * Bonecos em blocos, desenhados em texto (16x19). Letras:
 * O contorno · H cabelo · C boné · S pele · M boca · E olho · T camisa · t sombra da camisa
 * A manga · K mão · P calça · B sapato. '.' é transparente.
 */
export const CHAR_W = 16;
export const CHAR_H = 19;

const FRONT_HEAD = [
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHSSSSSSHO...',
  '...OSSSSSSSSO...',
  '...OSESSSSESO...',
  '...OSSSSSSSSO...',
  '...OSSSMMSSSO...',
  '....OOOOOOOO....',
];

const BACK_HEAD = [
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OSHHHHHHSO...',
  '....OOOOOOOO....',
];

const SIDE_HEAD = [
  '....OOOOOOOO....',
  '...OHHHHHHHHO...',
  '...OHHHHHHHHO...',
  '...OHHHSSSSSO...',
  '...OHHSSSSSSO...',
  '...OHHSSSSESO...',
  '...OHSSSSSSSO...',
  '...OSSSSSSMSO...',
  '....OOOOOOOO....',
];

const FRONT_BODY = [
  '.OOOTTTSSTTTOOO.',
  'OAAOTTTTTTTTOAAO',
  'OAAOTTTTTTTTOAAO',
  'OAAOTTTTTTTTOAAO',
  'OKKOttttttttOKKO',
];

const BACK_BODY = [
  '.OOOTTTTTTTTOOO.',
  'OAAOTTTTTTTTOAAO',
  'OAAOTTTTTTTTOAAO',
  'OAAOTTTTTTTTOAAO',
  'OKKOttttttttOKKO',
];

const SIDE_BODY = [
  '....OTTTTTTO....',
  '....OTTAATTO....',
  '....OTTAATTO....',
  '....OTTAATTO....',
  '....OttKKttO....',
];

const LEGS_IDLE = [
  '.OOOPPPPPPPPOOO.',
  '...OPPPOOPPPO...',
  '...OPPPOOPPPO...',
  '...OBBBOOBBBO...',
  '...OOOOOOOOOO...',
];

const LEGS_WALK_A = [
  '.OOOPPPPPPPPOOO.',
  '...OPPPOOPPPO...',
  '...OBBBOOPPPO...',
  '...OOOOOOBBBO...',
  '........OOOOO...',
];

const LEGS_WALK_B = [
  '.OOOPPPPPPPPOOO.',
  '...OPPPOOPPPO...',
  '...OPPPOOBBBO...',
  '...OBBBOOOOOO...',
  '...OOOOO........',
];

const SIDE_LEGS_IDLE = [
  '....OPPPPPPO....',
  '....OPPPPPPO....',
  '....OPPPPPPO....',
  '....OBBBBBBBO...',
  '....OOOOOOOOO...',
];

const SIDE_LEGS_WALK = [
  '....OPPPPPPO....',
  '...OPPPOOPPPO...',
  '..OPPPO..OPPPO..',
  '..OBBBO..OBBBBO.',
  '..OOOOO..OOOOOO.',
];

export type View = 'front' | 'back' | 'side';

/** Quadros: 0 parado, 1 e 2 passos. */
export function characterRows(view: View, frame: 0 | 1 | 2): string[] {
  if (view === 'side') return [...SIDE_HEAD, ...SIDE_BODY, ...(frame === 1 ? SIDE_LEGS_WALK : SIDE_LEGS_IDLE)];
  const head = view === 'front' ? FRONT_HEAD : BACK_HEAD;
  const body = view === 'front' ? FRONT_BODY : BACK_BODY;
  const legs = frame === 1 ? LEGS_WALK_A : frame === 2 ? LEGS_WALK_B : LEGS_IDLE;
  return [...head, ...body, ...legs];
}

/** Turista com chapéu (10x14). W chapéu · w faixa do chapéu. */
export const VISITOR_ROWS = [
  '..OOOOOO..',
  '.OWWWWWWO.',
  'OwwwwwwwwO',
  '.OSSSSSSO.',
  '.OSESSESO.',
  '.OSSSSSSO.',
  '..OOOOOO..',
  '.OTTTTTTO.',
  'OKTTTTTTKO',
  'OKTTTTTTKO',
  '.OPPPPPPO.',
  '.OPPOOPPO.',
  '.OBBOOBBO.',
  '.OOO..OOO.',
];

export const SUITCASE_ROWS = ['..OO..', '.O..O.', 'OOOOOO', 'OGGGGO', 'OYYYYO', 'OGGGGO', 'OOOOOO'];

/** Robô da IA (14x17). G metal · g sombra · D tela · C olhos · L luz que pisca. */
export const ROBOT_ROWS = [
  '......LL......',
  '......OO......',
  '..OOOOOOOOOO..',
  '.OGGGGGGGGGGO.',
  '.OGDDDDDDDDGO.',
  '.OGDCCDDCCDGO.',
  '.OGDDDDDDDDGO.',
  '.OGDDCCCCDDGO.',
  '.OGGGGGGGGGGO.',
  '..OOOOOOOOOO..',
  '.OOGGGGGGGGOO.',
  'OGOGggLLggGOGO',
  'OGOGggggggGOGO',
  'OGOGGGGGGGGOGO',
  '.OOOOOOOOOOOO.',
  '...OgO..OgO...',
  '...OOO..OOO...',
];

export const BUBBLE_ALERT_ROWS = [
  '.OOOOOOO.',
  'OYYYYYYYO',
  'OYYYKYYYO',
  'OYYYKYYYO',
  'OYYYKYYYO',
  'OYYYYYYYO',
  'OYYYKYYYO',
  'OYYYYYYYO',
  '.OOOYOOO.',
  '...OYO...',
  '....O....',
];

export const BUBBLE_SLEEP_ROWS = [
  '.OOOOOOOOOO.',
  'OWWWWWWWWWWO',
  'OWKKKKWWWWWO',
  'OWWWKWWKKKWO',
  'OWWKWWWWKWWO',
  'OWKKKKWKKKWO',
  'OWWWWWWWWWWO',
  '.OOOWOOOOOO.',
  '...OWO......',
  '....O.......',
];
