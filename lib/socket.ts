import { Client } from '@stomp/stompjs';
import { getServerIp, buildWsUrl } from './storage';

let client: Client | null = null;
let onReconnectCallback: (() => void) | null = null;
let initialConnectDone = false;

export async function connectStomp(onReconnect?: () => void): Promise<Client> {
  if (client?.active) return client;

  onReconnectCallback = onReconnect ?? null;
  initialConnectDone = false;

  const ip = await getServerIp();
  const url = buildWsUrl(ip);
  console.log('[STOMP] connecting to', url);

  return new Promise((resolve, reject) => {
    client = new Client({
      webSocketFactory: () => {
        const ws = new WebSocket(url, ['v10.stomp', 'v11.stomp', 'v12.stomp']);
        // Android/OkHttp strips null bytes from text frames — send as binary
        const _send = ws.send.bind(ws);
        (ws as any).send = (data: string | ArrayBuffer | ArrayBufferView) => {
          if (typeof data === 'string') {
            const buf = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) buf[i] = data.charCodeAt(i) & 0xff;
            _send(buf);
          } else {
            _send(data);
          }
        };
        return ws;
      },
      connectHeaders: { host: ip },
      // Heartbeat detects silent drops — 20s in/out
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      reconnectDelay: 3000,
      onConnect: (frame) => {
        console.log('[STOMP] connected', frame.headers);
        if (!initialConnectDone) {
          initialConnectDone = true;
          resolve(client!);
        } else {
          // Reconnect — re-fetch current state
          console.log('[STOMP] reconnected, refreshing state…');
          onReconnectCallback?.();
        }
      },
      onStompError: (frame) => {
        console.error('[STOMP] error', frame.headers['message'], frame.body);
        if (!initialConnectDone) reject(new Error(frame.headers['message'] ?? 'STOMP error'));
      },
      onWebSocketError: (evt) => {
        console.error('[STOMP] websocket error', evt);
        if (!initialConnectDone) reject(new Error('WebSocket connection failed'));
      },
      onWebSocketClose: (evt) => {
        console.warn('[STOMP] websocket closed', evt.code, evt.reason, '— will retry in 3s');
      },
      onDisconnect: () => {
        console.warn('[STOMP] STOMP disconnected');
      },
    });
    client.activate();
  });
}

export function disconnectStomp(): void {
  onReconnectCallback = null;
  initialConnectDone = false;
  client?.deactivate();
  client = null;
}

export function getStompClient(): Client | null {
  return client;
}
