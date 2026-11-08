import Constants from 'expo-constants';
import type { LiveMessage } from './liveTypes';

const RETRY_MS = 2000;

/**
 * Where the live inference service is.
 *
 * It cannot be localhost on a real phone, so it defaults to the host serving the
 * Expo bundle, which is the development machine running the service.
 */
export function liveApiUrl(): string {
  const configured = Constants.expoConfig?.extra?.liveApiUrl as string | undefined;
  if (configured) return configured;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `ws://${host}:8000/live` : 'ws://127.0.0.1:8000/live';
}

type Handlers = {
  onMessage: (message: LiveMessage) => void;
  onOpen: () => void;
  onClose: () => void;
};

/**
 * A WebSocket that keeps trying. Returns a function that stops it for good;
 * without that, a reconnect timer outlives the screen that created it.
 */
export function connectLive(url: string, handlers: Handlers): () => void {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const open = () => {
    if (stopped) return;
    socket = new WebSocket(url);

    socket.onopen = () => handlers.onOpen();
    socket.onmessage = (event) => {
      try {
        handlers.onMessage(JSON.parse(String(event.data)) as LiveMessage);
      } catch {
        // A malformed frame is not worth tearing the session down for.
      }
    };
    socket.onerror = () => socket?.close();
    socket.onclose = () => {
      socket = null;
      handlers.onClose();
      if (!stopped) retry = setTimeout(open, RETRY_MS);
    };
  };

  open();

  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket?.close();
    socket = null;
  };
}
