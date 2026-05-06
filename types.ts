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
  skillClass: string;
  subClass?: string;
  race: string;
  level: number;
  slotsClass: number;
  slotsFree: number;
  slotsTotal: number;
  portraitUrl?: string;
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
}

export interface WeaponEquip {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

export interface Equipment {
  mainHand?: WeaponEquip;
  offHand?: WeaponEquip;
  armor?: WeaponEquip;
  amulet?: WeaponEquip;
  ring?: WeaponEquip;
  utility?: WeaponEquip;
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
  durationTurns: number;
}

export interface Player {
  id: string;
  code: string;
  char: CharInfo;
  hp: Vital;
  flow: Vital;
  ether: Ether;
  exp: Exp;
  attributes: Attributes;
  essenciasObtidas: EssenciaObtida[];
  slots: Slot[];
  equipment: Equipment;
  statusEffects: StatusEffect[];
  items: Item[];
  pendingRequests: PendingRequest[];
  gold: number;
}

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
  maestria?: {
    level: number;
    totalUses: number;
    nextLevelUses: number;
  };
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
