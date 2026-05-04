import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYER_ID_KEY = 'essentia_player_id';
const PLAYER_CODE_KEY = 'essentia_player_code';
const SERVER_IP_KEY = 'essentia_server_ip';
const DEFAULT_IP = '192.168.1.100';

export async function getPlayerId(): Promise<string | null> {
  return AsyncStorage.getItem(PLAYER_ID_KEY);
}

export async function setPlayerId(id: string): Promise<void> {
  await AsyncStorage.setItem(PLAYER_ID_KEY, id);
}

export async function getPlayerCode(): Promise<string | null> {
  return AsyncStorage.getItem(PLAYER_CODE_KEY);
}

export async function setPlayerCode(code: string): Promise<void> {
  await AsyncStorage.setItem(PLAYER_CODE_KEY, code);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([PLAYER_ID_KEY, PLAYER_CODE_KEY]);
}

export async function getServerIp(): Promise<string> {
  const ip = await AsyncStorage.getItem(SERVER_IP_KEY);
  return ip ?? DEFAULT_IP;
}

export async function setServerIp(ip: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_IP_KEY, ip);
}
