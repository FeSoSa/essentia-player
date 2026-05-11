export type TabId = 'mapa' | 'geral' | 'atributos' | 'inventario' | 'habilidades' | 'docs' | 'config';

// --- Backend model types (field names match Spring Boot responses exactly) ---

export interface Vital {
  current: number;
  max: number;
}

export interface Ether {
  current: number;
  max: number;
  unlocked: boolean;
}

export interface Exp {
  available: number;
  total: number;
}

export interface Attributes {
  strength: number;
  agility: number;
  intelligence: number;
  resistance: number;
  flow: number;
  wisdom: number;
  presence: number;
  defense: number;
}

export interface CharInfo {
  name: string;
  classe: string;
  skillClass: string;
  race: string;
  level: number;
  slotsClass: number;
  slotsFree: number;
  slotsTotal: number;
  portraitUrl?: string;
  unarmedDamage?: string;
}

export interface Slot {
  id: string;
  type: 'class' | 'free' | 'human_bonus';
  skillId?: string;
  cooldownRemaining: number;
}

export interface Item {
  id: string;
  name: string;
  desc: string;
  qty: number;
  type: string;
  icon?: string;
  equipSlot?: string;
  twoHanded?: boolean;
  // Weapon
  weaponType?: string;
  damageBase?: number;
  damageDice?: { quantity: number; die: string };
  damageAttribute?: string;
  properties?: string;
  // Armor
  damageReduction?: number;
  armorWeight?: string;
  // Shared
  attributeBonus?: Record<string, number>;
  rarity?: string;
}

export interface DamageResult {
  skillName: string;
  damage: number | null;
  costPaid: Array<{ type: string; value?: number; percentual?: number }>;
  cooldownSet: number;
}

export interface WeaponEquip {
  id: string;
  name: string;
  type: string;
  icon?: string;
  twoHanded?: boolean;
  rarity?: string;
  damageBase?: number;
  damageDice?: { quantity: number; die: string };
  damageAttribute?: string;
}

export interface ArmorEquip {
  id: string;
  name: string;
  damageReduction?: number;
  attributeBonus?: Record<string, number>;
  armorWeight?: string;
  rarity?: string;
}

export interface AccessoryEquip {
  id: string;
  name: string;
  attributeBonus?: Record<string, number>;
  rarity?: string;
}

export interface Equipment {
  mainHand?: WeaponEquip;
  offHand?: WeaponEquip;
  armor?: ArmorEquip;
  amulet?: AccessoryEquip;
  ring?: AccessoryEquip;
  utility?: AccessoryEquip;
}

export interface EssenciaObtida {
  essenciaId: string;
  attributeBonusActive: boolean;
  unlockedSkillIds: string[];
}

export interface Essencia {
  id: string;
  name: string;
  type: string; // "Grande" | "Mitica" | "Derivada"
  desc: string;
  attributeBonus: Record<string, number>;
  skillIds: string[];
  icon?: string;
  color?: string;
}

export interface PendingRequest {
  id: string;
  type: string;
  itemId: string;
  timestamp: string;
}

export interface StatusEffect {
  id: string;
  name: string;
  desc: string;
  icon?: string;
  color?: string;
  durationTurns: number;
}

export interface CustomBar {
  id: string;
  name: string;
  color: string;
  current: number;
  max: number;
}

export type CollectiveBar = CustomBar;

export interface Player {
  id: string;
  code: string;
  char: CharInfo;
  hp: Vital;
  flow: Vital;
  ether: Ether;
  pressao?: Vital;
  exp: Exp;
  attributes: Attributes;
  effectiveAttributes?: Attributes;
  essenciasObtidas: EssenciaObtida[];
  slots: Slot[];
  equipment: Equipment;
  statusEffects: StatusEffect[];
  items: Item[];
  pendingRequests: PendingRequest[];
  gold: number;
  desviosRestantes: number;
  sobrecargaDesbloqueada?: boolean;
  customBars?: CustomBar[];
  sobrecargaAtiva?: boolean;
  sobrecargaNivel?: number;
}

export interface DamageResultNotification {
  requestId: string;
  approved: boolean;
}

export interface SobrecargaLevel {
  nivel: number;
  bonus: number;
  custo: number;
  cd: number;
  danoDado: string;
}

export const SOBRECARGA_LEVELS: SobrecargaLevel[] = [
  { nivel: 1, bonus: 2,  custo: 60,  cd: 10, danoDado: '2d6' },
  { nivel: 2, bonus: 4,  custo: 90,  cd: 12, danoDado: '3d6' },
  { nivel: 3, bonus: 6,  custo: 125, cd: 14, danoDado: '4d6' },
  { nivel: 4, bonus: 8,  custo: 165, cd: 16, danoDado: '5d6' },
  { nivel: 5, bonus: 10, custo: 210, cd: 18, danoDado: '6d6' },
  { nivel: 6, bonus: 12, custo: 260, cd: 20, danoDado: '8d6' },
];

// Skill tree entry — from GET /api/players/{id}/skill-tree
export interface SkillTreeEntry {
  skillId: string;
  nome: string;
  custo: string;
  descricao: string;
  categoria: string;
  unlocked: boolean;
  equipped: boolean;
  slotId?: string;
  requirementsText?: string;
  isPassive?: boolean;
  maestria?: {
    playerSkillId: string;
    level: number;
    totalUses: number;
    nextLevelUses: number;
    choices: Array<'aumento' | 'otimizacao'>;
    bonusDano: number;     // ex: 0.32 = +32%
    custoAumento: number;  // ex: 0.24 = +24%
    reducaoCusto: number;  // ex: 0.16 = -16%
  };
  danoFormula?: string;   // ex: "4 + 2d6 + INT"
  danoBase?: number;      // valor fixo adicionado ao dano antes do dado
  cooldownTurns?: number; // turnos de cooldown após uso
  skillType?: string;     // "class" | "weapon" | "essencia" | "mestre"
}

// Game state types (from WebSocket topics)
export interface GameImage {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  active: boolean;
}

export interface FastOption {
  id: string;
  text: string;
  color: string;
}

export interface FastAction {
  active: boolean;
  title: string;
  options: FastOption[];
  lockOnePerPlayer: boolean;
  lockedPlayers: string[];
  answers: Record<string, string>;
}

export interface InitiativeEntry {
  playerId: string;
  name: string;
  value: number;
}

export interface TurnUpdate {
  message: string;
}

export interface EnemyInstance {
  instanceId: string;
  templateId?: string;
  name: string;
  type: string;
  icon?: string;
  hpCurrent: number;
  hpMax: number;
  xp: number;
  notes?: string;
}

export interface BossPhase {
  phaseNumber: number;
  name: string;
  hpMax: number;
}

export interface BossInstance {
  instanceId: string;
  templateId?: string;
  name: string;
  icon?: string;
  phases: BossPhase[];
  currentPhase: number;
  hpCurrent: number;
  xp: number;
  notes?: string;
}
