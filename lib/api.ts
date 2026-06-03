import axios from 'axios';
import { getServerIp, buildHttpBase } from './storage';
import type { Player, SkillTreeEntry, Essencia, EnemyInstance, BossInstance, GameImage, DamageResult, CollectiveBar, MultiTargetDamagePayload, Shop, ItemCatalogEntry } from '@/types';

const api = axios.create();

api.interceptors.request.use(async (config) => {
  const host = await getServerIp();
  config.baseURL = buildHttpBase(host);
  return config;
});

export async function login(code: string): Promise<Player> {
  const res = await api.post<Player>('/api/auth/login', { code });
  return res.data;
}

export async function getSkillTree(playerId: string): Promise<SkillTreeEntry[]> {
  const res = await api.get<SkillTreeEntry[]>(`/api/players/${playerId}/skill-tree`);
  return res.data;
}

export async function updateAttribute(
  playerId: string,
  attribute: string,
  delta: number
): Promise<Player> {
  const res = await api.put<Player>(`/api/players/${playerId}/attributes`, { attribute, delta });
  return res.data;
}

export async function adjustHp(playerId: string, delta: number): Promise<Player> {
  const res = await api.put<Player>(`/api/players/${playerId}/hp`, { delta });
  return res.data;
}

export async function adjustFlow(playerId: string, delta: number): Promise<Player> {
  const res = await api.put<Player>(`/api/players/${playerId}/flow`, { delta });
  return res.data;
}

export async function adjustEther(playerId: string, delta: number): Promise<Player> {
  const res = await api.put<Player>(`/api/players/${playerId}/ether`, { delta });
  return res.data;
}

export async function adjustPressao(playerId: string, delta: number): Promise<Player> {
  const res = await api.put<Player>(`/api/players/${playerId}/pressao`, { delta });
  return res.data;
}

export async function getEssencias(): Promise<Essencia[]> {
  const res = await api.get<Essencia[]>('/api/master/essencias');
  return res.data;
}

export async function updateSlot(
  playerId: string,
  slotId: string,
  skillId: string | null
): Promise<Player> {
  const res = await api.put<Player>(`/api/players/${playerId}/slots`, { slotId, skillId });
  return res.data;
}

export async function requestItem(playerId: string, itemId: string): Promise<Player> {
  const res = await api.post<Player>(`/api/players/${playerId}/request-item`, { itemId });
  return res.data;
}

export async function useSkill(
  playerId: string,
  slotId: string,
  options: { diceRoll?: number; targetId?: string; targetType?: 'enemy' | 'boss' } = {}
): Promise<DamageResult> {
  const res = await api.post<DamageResult>(`/api/players/${playerId}/use-skill`, {
    slotId,
    diceRoll: options.diceRoll,
  });
  return res.data;
}

export async function applyEnemyDamage(instanceId: string, damage: number): Promise<void> {
  await api.put(`/api/combat/enemies/${instanceId}/hp`, { delta: -damage });
}

export async function applyBossDamage(instanceId: string, damage: number): Promise<void> {
  await api.put(`/api/combat/bosses/${instanceId}/hp`, { delta: -damage });
}

export async function unlockSkill(playerId: string, skillId: string): Promise<void> {
  await api.post(`/api/players/${playerId}/unlock-skill`, { skillId });
}

export async function chooseMasteryPath(
  playerId: string,
  playerSkillId: string,
  path: 'aumento' | 'otimizacao'
): Promise<void> {
  await api.post(`/api/players/${playerId}/maestria-upgrade`, { playerSkillId, path });
}

export async function equipItem(playerId: string, itemId: string): Promise<Player> {
  const res = await api.post<Player>(`/api/players/${playerId}/equip`, { itemId });
  return res.data;
}

export async function unequipItem(playerId: string, slot: string): Promise<Player> {
  const res = await api.delete<Player>(`/api/players/${playerId}/equipment/${slot}`);
  return res.data;
}

export async function executeDesvio(playerId: string): Promise<Player> {
  const res = await api.post<Player>(`/api/players/${playerId}/desvio`);
  return res.data;
}

export async function voteFastAction(playerId: string, optionId: string): Promise<void> {
  await api.post('/api/fast-action/vote', { playerId, optionId });
}

export async function skillMiss(playerId: string, costs: Record<string, number>): Promise<Player> {
  const res = await api.post<Player>(`/api/players/${playerId}/skill-miss`, costs);
  return res.data;
}

export async function requestDamage(
  playerId: string,
  opts: {
    requestId: string;
    targetId: string;
    targetType: 'enemy' | 'boss';
    targetName: string;
    damage: number;
    costs?: Record<string, number>;
    skillId?: string;
  }
): Promise<void> {
  await api.post(`/api/players/${playerId}/damage-request`, opts);
}

export async function requestMultiDamage(
  playerId: string,
  payload: MultiTargetDamagePayload
): Promise<void> {
  await api.post(`/api/players/${playerId}/multi-damage-request`, payload);
}

export async function requestSobrecarga(playerId: string, nivel: number): Promise<void> {
  await api.post(`/api/players/${playerId}/sobrecarga/request`, { nivel });
}

export async function deactivateSobrecarga(playerId: string): Promise<Player> {
  const res = await api.post<Player>(`/api/players/${playerId}/sobrecarga/deactivate`);
  return res.data;
}

export async function getImages(): Promise<GameImage[]> {
  const res = await api.get<GameImage[]>('/api/images');
  return res.data;
}

export async function getCombatEnemies(): Promise<EnemyInstance[]> {
  const res = await api.get<EnemyInstance[]>('/api/combat/enemies');
  return res.data;
}

export async function getCombatBosses(): Promise<BossInstance[]> {
  const res = await api.get<BossInstance[]>('/api/combat/bosses');
  return res.data;
}

export async function getCombatAllies(): Promise<import('@/types').CombatAlly[]> {
  const res = await api.get<import('@/types').CombatAlly[]>('/api/combat/allies');
  return res.data;
}

export async function getTurnState(): Promise<{ initiative: import('@/types').InitiativeEntry[]; totalTurns: number }> {
  const res = await api.get('/api/master/turn-state');
  return res.data;
}

export async function getCollectiveBars(): Promise<CollectiveBar[]> {
  const res = await api.get<CollectiveBar[]>('/api/master/collective-bars');
  return res.data;
}

export async function getActiveShops(): Promise<Shop[]> {
  const res = await api.get<Shop[]>('/api/shops/active');
  return res.data;
}

export async function getItemCatalog(): Promise<ItemCatalogEntry[]> {
  const res = await api.get<ItemCatalogEntry[]>('/api/items');
  return res.data;
}

export async function getPlayers(): Promise<import('@/types').Player[]> {
  const res = await api.get<import('@/types').Player[]>('/api/master/players');
  return res.data;
}

export async function transferItem(
  senderId: string,
  itemId: string,
  targetPlayerId: string,
  qty: number
): Promise<import('@/types').Player> {
  const res = await api.post<import('@/types').Player>(`/api/players/${senderId}/transfer-item`, {
    itemId,
    targetPlayerId,
    qty,
  });
  return res.data;
}

export async function purchaseShopItem(
  shopId: string,
  playerId: string,
  itemId: string,
  qty: number
): Promise<Player> {
  const res = await api.post<Player>(`/api/shops/${shopId}/purchase`, { playerId, itemId, qty });
  return res.data;
}
