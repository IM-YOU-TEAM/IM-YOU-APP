import Constants from 'expo-constants';
import type { LiveMessage } from './liveTypes';

const RETRY_MS = 2000;

function liveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_LIVE_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const extra = Constants.expoConfig?.extra?.liveApiUrl as string | undefined;
  if (extra) return extra.replace(/\/+$/, '');

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `ws://${host}:8000` : 'ws://127.0.0.1:8000';
}

/** Turn an http(s) origin into a websocket origin, then append the path. */
export function liveSocketUrl(path: '/live' | '/phone'): string {
  const base = liveApiBase().replace(/^http/i, 'ws');
  return `${base}${path}`;
}

/** Viewer socket the clinician (and session tally) subscribe to. */
export function liveApiUrl(): string {
  return liveSocketUrl('/live');
}

type Handlers = {
  onMessage?: (message: LiveMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export type LiveSocket = {
  stop: () => void;
  send: (message: object) => void;
  get ready(): boolean;
};

/**
 * A WebSocket that keeps trying. `stop` cancels reconnects so a timer cannot
 * outlive the screen that created it.
 */
export function connectSocket(url: string, handlers: Handlers = {}): LiveSocket {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const open = () => {
    if (stopped) return;
    socket = new WebSocket(url);

    socket.onopen = () => handlers.onOpen?.();
    socket.onmessage = (event) => {
      if (!handlers.onMessage) return;
      try {
        handlers.onMessage(JSON.parse(String(event.data)) as LiveMessage);
      } catch {
        // A malformed frame is not worth tearing the session down for.
      }
    };
    socket.onerror = () => socket?.close();
    socket.onclose = () => {
      socket = null;
      handlers.onClose?.();
      if (!stopped) retry = setTimeout(open, RETRY_MS);
    };
  };

  open();

  return {
    get ready() {
      return socket?.readyState === WebSocket.OPEN;
    },
    send: (message: object) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    },
    stop: () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
      socket = null;
    },
  };
}

export function connectLive(url: string, handlers: Required<Pick<Handlers, 'onMessage' | 'onOpen' | 'onClose'>>): () => void {
  return connectSocket(url, handlers).stop;
}
