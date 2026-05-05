import axios from 'axios';
import { getServerIp } from './storage';
import type { Player, SkillTreeEntry, Essencia, EnemyInstance, BossInstance } from '@/types';

const api = axios.create();

api.interceptors.request.use(async (config) => {
  const ip = await getServerIp();
  config.baseURL = `http://${ip}:8080`;
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

export async function useSkill(playerId: string, slotId: string): Promise<void> {
  await api.post(`/api/players/${playerId}/use-skill`, { slotId });
}

export async function unlockSkill(playerId: string, skillId: string): Promise<void> {
  await api.post(`/api/players/${playerId}/unlock-skill`, { skillId });
}

export async function voteFastAction(playerId: string, optionId: string): Promise<void> {
  await api.post('/api/fast-action/vote', { playerId, optionId });
}

export async function getCombatEnemies(): Promise<EnemyInstance[]> {
  const res = await api.get<EnemyInstance[]>('/api/combat/enemies');
  return res.data;
}

export async function getCombatBosses(): Promise<BossInstance[]> {
  const res = await api.get<BossInstance[]>('/api/combat/bosses');
  return res.data;
}
