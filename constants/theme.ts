import { Platform } from 'react-native';

export const Colors = {
  bg:         '#09090b',
  surface:    '#18181b',
  card:       '#27272a',
  border:     '#3f3f46',
  text:       '#fafafa',
  muted:      '#a1a1aa',
  faint:      '#52525b',
  ember:      '#a3e635',
  emberDim:   'rgba(163, 230, 53, 0.08)',
  emberGlow:  '#bef264',
  tealBright: '#4ade80',
  gold:       '#d4a84e',
  danger:     '#ef4444',
};

export type Rarity = 'branco' | 'verde' | 'azul' | 'roxo' | 'amarelo' | 'rosa';

export const RARITY_COLORS: Record<Rarity, string> = {
  branco:  '#e4e4e7',
  verde:   '#4ade80',
  azul:    '#3b82f6',
  roxo:    '#a855f7',
  amarelo: '#eab308',
  rosa:    '#ec4899',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  branco:  'Comum',
  verde:   'Incomum',
  azul:    'Raro',
  roxo:    'Épico',
  amarelo: 'Lendário',
  rosa:    'Mítico',
};

const sans   = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const sansMd = Platform.OS === 'ios' ? 'System' : 'sans-serif-medium';

export const Fonts = {
  title:        sansMd,
  titleRegular: sans,
  body:         sans,
  bodyItalic:   sans,
  bodySemiBold: sansMd,
};
