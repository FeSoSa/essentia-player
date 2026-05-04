import { Client } from '@stomp/stompjs';
import { getServerIp } from './storage';

let client: Client | null = null;

export async function connectStomp(): Promise<Client> {
  if (client?.active) return client;

  const ip = await getServerIp();

  return new Promise((resolve, reject) => {
    client = new Client({
      // SockJS raw WebSocket transport path
      brokerURL: `ws://${ip}:8080/ws/websocket`,
      reconnectDelay: 2000,
      onConnect: () => resolve(client!),
      onStompError: (frame) => reject(new Error(frame.headers['message'] ?? 'STOMP error')),
      onDisconnect: () => {
        // client handles reconnect automatically via reconnectDelay
      },
    });
    client.activate();
  });
}

export function disconnectStomp(): void {
  client?.deactivate();
  client = null;
}

export function getStompClient(): Client | null {
  return client;
}
