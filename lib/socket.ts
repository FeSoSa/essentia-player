import { Client } from '@stomp/stompjs';
import { getServerIp } from './storage';

let client: Client | null = null;

export async function connectStomp(): Promise<Client> {
  if (client?.active) return client;

  const ip = await getServerIp();
  const url = `ws://${ip}:8080/ws-native`;
  console.log('[STOMP] connecting to', url);

  return new Promise((resolve, reject) => {
    client = new Client({
      webSocketFactory: () => {
        const ws = new WebSocket(url, ['v10.stomp', 'v11.stomp', 'v12.stomp']);
        // Android/OkHttp strips null bytes (\0) from text frames, breaking STOMP framing.
        // Convert strings to binary so the \0 terminator is preserved.
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
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      reconnectDelay: 2000,
      debug: (msg) => console.log('[STOMP]', msg),
      onConnect: (frame) => {
        console.log('[STOMP] connected', frame.headers);
        resolve(client!);
      },
      onStompError: (frame) => {
        console.error('[STOMP] error', frame.headers['message'], frame.body);
        reject(new Error(frame.headers['message'] ?? 'STOMP error'));
      },
      onWebSocketError: (evt) => {
        console.error('[STOMP] websocket error', evt);
        reject(new Error('WebSocket connection failed'));
      },
      onWebSocketClose: (evt) => {
        console.warn('[STOMP] websocket closed', evt.code, evt.reason);
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
