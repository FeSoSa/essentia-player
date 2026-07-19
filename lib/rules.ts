import type { Attributes, AutoEffect } from '@/types';

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

export function xpParaNivel(n: number): number {
  if (n <= 1) return 0;
  if (n <= 20) return 75 * (n * (n + 1) / 2 - 1) - 50 * (n - 1);
  const m = n - 20;
  return 14725 + m * (2750 + 150 * m);
}

export function xpProgress(totalExp: number, level: number): { xpInLevel: number; xpNeeded: number } {
  const floor   = xpParaNivel(level);
  const next    = xpParaNivel(level + 1);
  const xpNeeded = next - floor;
  return {
    xpInLevel: Math.max(0, Math.min(xpNeeded, totalExp - floor)),
    xpNeeded,
  };
}

export function initiativeBonus(agiMod: number): number {
  return Math.floor(agiMod / 2);
}

export type ArmorWeight = 'none' | 'light' | 'medium' | 'heavy';

// Cumulative bonus per number of aumento/otimizacao choices (index = N-1)
const MAESTRIA_DANO_BONUS   = [0.10, 0.20, 0.32, 0.45, 0.60] as const;
const MAESTRIA_CUSTO_AUMENTO = [0.08, 0.16, 0.24, 0.32, 0.40] as const;
const MAESTRIA_CUSTO_REDUCAO = [0.08, 0.16, 0.24, 0.32, 0.40] as const;

// Usos acumulados necessários para subir ao próximo nível (índice = nível atual 1-4)
export const MAESTRIA_THRESHOLDS = [0, 3, 8, 16, 28] as const;

export function computeMaestriaEffects(choices: Array<'aumento' | 'otimizacao'>): {
  bonusDano: number;
  reducaoCusto: number;
  custoAumento: number;
} {
  const nA = choices.filter((c) => c === 'aumento').length;
  const nO = choices.filter((c) => c === 'otimizacao').length;
  return {
    bonusDano:    nA > 0 ? MAESTRIA_DANO_BONUS[nA - 1]    : 0,
    custoAumento: nA > 0 ? MAESTRIA_CUSTO_AUMENTO[nA - 1] : 0,
    reducaoCusto: nO > 0 ? MAESTRIA_CUSTO_REDUCAO[nO - 1] : 0,
  };
}

const ATTR_ABBREV: Record<string, string> = {
  strength: 'FOR', agility: 'AGI', intelligence: 'INT',
  resistance: 'RES', flow: 'FLX', wisdom: 'SAB', presence: 'PRE', defense: 'DEF',
};

export function weaponDamageFormula(w: { damageBase?: number; damageAttribute?: string; equilibrio?: number }): string {
  const parts: string[] = [];
  if (w.damageBase) parts.push(String(w.damageBase));
  if (w.damageAttribute) {
    // attribute is stored as abbreviation already ("FOR", "FOR/AGI"); fall back for legacy internal-key format
    const attr = w.damageAttribute.includes('/')
      ? w.damageAttribute
      : (ATTR_ABBREV[w.damageAttribute] ?? w.damageAttribute.slice(0, 3).toUpperCase());
    const eq = w.equilibrio != null ? `/${w.equilibrio}` : '';
    parts.push(`d20×${attr}${eq}`);
  }
  return parts.join(' + ') || '—';
}

export function resolveAtributeMod(atributo: string | undefined, attrs: Attributes): number {
  if (!atributo) return 0;
  const ABBREV_TO_KEY: Record<string, keyof Attributes> = {
    FOR: 'strength', AGI: 'agility', INT: 'intelligence',
    RES: 'resistance', FLX: 'flow', SAB: 'wisdom', PRE: 'presence', DEF: 'defense',
  };
  const values = atributo.split('/').map((a) => {
    const key = ABBREV_TO_KEY[a.trim() as keyof typeof ABBREV_TO_KEY];
    return key ? getModifier(attrs[key]) : 0;
  });
  return Math.max(...values, 0);
}

export function unarmedDamageFormula(a: { damageBase: number; attribute: string }): string {
  return `${a.damageBase} + d20×${a.attribute}/4`;
}

export function getArmorWeight(armorType?: string): ArmorWeight {
  if (!armorType) return 'none';
  const t = armorType.toLowerCase();
  if (t.includes('pesada') || t.includes('heavy')) return 'heavy';
  if (t.includes('média') || t.includes('media') || t.includes('medium')) return 'medium';
  if (t.includes('leve') || t.includes('light')) return 'light';
  return 'none';
}

const ATTR_LABEL: Record<string, string> = {
  strength: 'Força', agility: 'Agilidade', intelligence: 'Intelecto', resistance: 'Resistência',
  flow: 'Fluxo', wisdom: 'Sabedoria', presence: 'Presença', defense: 'Defesa',
};

const COST_LABEL: Record<string, string> = {
  flow: 'Fluxo', hp: 'HP', ether: 'Éter', charge: 'Carga',
  percentual_flow: 'Fluxo %', percentual_hp: 'HP %', pressao: 'Pressão',
};

const AUTO_EFFECT_TYPE_LABEL: Record<string, string> = {
  damage_hp: 'Dano HP',
  damage_flow: 'Dano Flow',
  heal_hp: 'Cura HP',
  heal_flow: 'Cura Flow',
  block_skill: 'Bloquear skill',
  modify_attribute: 'Modificar atributo',
  modify_damage_dealt: 'Mod. dano causado',
  modify_damage_received: 'Mod. dano recebido',
  modify_resource_cost: 'Reduzir custo por recurso',
};

function signedNum(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Descrição curta e legível de um AutoEffect, ex: "Força +3" ou "Dano HP 12". */
export function describeAutoEffect(eff: AutoEffect): string {
  switch (eff.type) {
    case 'modify_attribute': {
      const attr = eff.attribute ? (ATTR_LABEL[eff.attribute] ?? eff.attribute) : '?';
      const parts: string[] = [];
      if (eff.value) parts.push(signedNum(eff.value));
      if (eff.percentual) parts.push(`${signedNum(eff.percentual)}%`);
      return `${attr} ${parts.join(' ') || '+0'}`;
    }
    case 'modify_resource_cost': {
      const cost = eff.costType ? (COST_LABEL[eff.costType] ?? eff.costType) : '?';
      return `Custo ${cost} ${signedNum(eff.percentual ?? 0)}%`;
    }
    case 'modify_damage_dealt':
    case 'modify_damage_received': {
      const parts: string[] = [];
      if (eff.value) parts.push(signedNum(eff.value));
      if (eff.percentual) parts.push(`${signedNum(eff.percentual)}%`);
      return `${AUTO_EFFECT_TYPE_LABEL[eff.type]} ${parts.join(' ') || '+0'}`;
    }
    case 'block_skill':
      return AUTO_EFFECT_TYPE_LABEL[eff.type] ?? eff.type;
    default:
      return `${AUTO_EFFECT_TYPE_LABEL[eff.type] ?? eff.type} ${eff.value ?? 0}`;
  }
}
