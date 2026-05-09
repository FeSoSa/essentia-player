export function getModifier(val: number): number {
  if (val <= 7) return -1;
  if (val <= 11) return 0;
  if (val <= 15) return 1;
  if (val <= 19) return 2;
  if (val <= 23) return 3;
  if (val <= 27) return 4;
  if (val <= 31) return 5;
  if (val <= 35) return 6;
  if (val <= 40) return 7;
  if (val <= 46) return 8;
  if (val <= 53) return 9;
  if (val <= 61) return 10;
  return 11;
}

export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getAttrCost(val: number): number {
  if (val <= 15) return 1;
  if (val <= 20) return 2;
  if (val <= 25) return 3;
  if (val <= 30) return 4;
  return 5;
}

export const ATTRIBUTE_POINTS_PER_LEVEL = 3;

const EXP_TABLE: readonly number[] = [
  0, 0, 100, 250, 450, 700, 1000, 1350, 1750, 2200,
  2700, 3300, 4000, 4800, 5700, 6700, 7800, 9000, 10300, 11700, 13200,
];

export function expForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 20) return EXP_TABLE[level];
  return EXP_TABLE[20] + (level - 20) * 2000;
}

export function xpProgress(totalExp: number, level: number): { xpInLevel: number; xpNeeded: number } {
  const floor = expForLevel(level);
  const next  = expForLevel(level + 1);
  return { xpInLevel: totalExp - floor, xpNeeded: next - floor };
}

export function initiativeBonus(agiMod: number): number {
  return Math.floor(agiMod / 2);
}

export type ArmorWeight = 'none' | 'light' | 'medium' | 'heavy';

export function getArmorWeight(armorType?: string): ArmorWeight {
  if (!armorType) return 'none';
  const t = armorType.toLowerCase();
  if (t.includes('pesada') || t.includes('heavy')) return 'heavy';
  if (t.includes('média') || t.includes('media') || t.includes('medium')) return 'medium';
  if (t.includes('leve') || t.includes('light')) return 'light';
  return 'none';
}
