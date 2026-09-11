import Peer from 'peerjs';

/* WebRTC bağlantısı: masaüstü ve telefon aynı veya farklı ağlarda çalışabilir. */
const PREFIX = 'mosbarkod-v15-';
const THROTTLE_MS = 350;
const MAX_CLIENTS = 2;
const FIXED_ADMIN_CODE = '1588';
const FIXED_ORDER_CODE = '1111';

export interface SyncStatus {
  role: 'off' | 'host' | 'client';
  code: string;
  connected: boolean;
  clients?: number;
  clientRoles?: string[];
  deviceRole?: 'admin' | 'order';
  bridge?: boolean;
  error?: string;
}

type Connection = ReturnType<Peer['connect']>;
type StateHandler = (state: unknown) => void;
type StatusHandler = (status: SyncStatus) => void;

const PEER_OPTIONS = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
};

let current: SyncStatus = { role: 'off', code: '', connected: false, clients: 0 };
let peer: Peer | null = null;
let hostPeers: Peer[] = [];
let clientConnection: Connection | null = null;
let hostConnections: Connection[] = [];
let hostRoles = new Map<string, string>();
let lastSent = 0;
let pendingState: unknown = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let deviceId = '';

const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const emit = (handler?: StatusHandler) => handler?.(current);
const openHosts = () => hostConnections.filter((connection) => connection.open);

function getDeviceId() {
  if (deviceId) return deviceId;
  try {
    const saved = localStorage.getItem('mosbarkod-webrtc-device');
    deviceId = saved || `device-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('mosbarkod-webrtc-device', deviceId);
  } catch {
    deviceId = `temporary-${Math.random().toString(36).slice(2, 10)}`;
  }
  return deviceId;
}

export const syncStatus = () => current;

function stopPeer() {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingState = null;
  try { clientConnection?.close(); } catch { /* yoksay */ }
  for (const connection of hostConnections) {
    try { connection.close(); } catch { /* yoksay */ }
  }
  clientConnection = null;
  hostConnections = [];
  hostRoles = new Map();
  try { peer?.destroy(); } catch { /* yoksay */ }
  peer = null;
  for (const hostPeer of hostPeers) {
    try { hostPeer.destroy(); } catch { /* yoksay */ }
  }
  hostPeers = [];
}

export const stopSync = (onStatus?: StatusHandler) => {
  stopPeer();
  current = { role: 'off', code: '', connected: false, clients: 0 };
  emit(onStatus);
};

function send(connection: Connection, state: unknown) {
  if (connection.open) connection.send({ type: 'state', state });
}

function broadcastPeer(state: unknown) {
  const targets = current.role === 'host'
    ? openHosts()
    : clientConnection?.open
      ? [clientConnection]
      : [];
  if (!targets.length) return;

  const now = Date.now();
  if (now - lastSent >= THROTTLE_MS) {
    lastSent = now;
    targets.forEach((connection) => send(connection, state));
    pendingState = null;
    return;
  }

  pendingState = state;
  if (!pendingTimer) {
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      if (!pendingState) return;
      const delayedTargets = current.role === 'host'
        ? openHosts()
        : clientConnection?.open
          ? [clientConnection]
          : [];
      delayedTargets.forEach((connection) => send(connection, pendingState));
      lastSent = Date.now();
      pendingState = null;
    }, THROTTLE_MS + 30);
  }
}

export const broadcast = (state: unknown) => {
  if (current.connected) broadcastPeer(state);
};

function updateHostStatus(patch: Partial<SyncStatus>, onStatus?: StatusHandler) {
  const open = openHosts();
  hostConnections = open;
  const roles = open.map((connection) => hostRoles.get(connection.connectionId) || 'Telefon');
  current = {
    ...current,
    connected: open.length > 0,
    clients: open.length,
    clientRoles: roles,
    bridge: false,
    ...patch,
  };
  emit(onStatus);
}

function attachHostPeer(
  listenCode: string,
  onRemote: StateHandler,
  getState: () => unknown,
  onStatus?: StatusHandler
) {
  const hostPeer = new Peer(`${PREFIX}${listenCode}`, PEER_OPTIONS);
  hostPeers.push(hostPeer);

  hostPeer.on('connection', (connection) => {
    if (openHosts().length >= MAX_CLIENTS) {
      connection.on('open', () => connection.send({ type: 'error', message: 'Bağlantı sınırı dolu' }));
      connection.close();
      return;
    }

    hostConnections.push(connection);
    connection.on('open', () => {
      updateHostStatus({ error: undefined }, onStatus);
      send(connection, getState());
    });
    connection.on('data', (data) => {
      const message = data as { type?: string; state?: unknown; deviceRole?: string };
      if (message.type === 'join') {
        hostRoles.set(connection.connectionId, message.deviceRole === 'admin' ? 'Admin Telefon' : 'Sipariş Telefonu');
        updateHostStatus({}, onStatus);
        send(connection, getState());
      } else if (message.type === 'state') {
        onRemote(message.state);
        openHosts().filter((item) => item !== connection).forEach((item) => send(item, message.state));
      }
    });
    connection.on('close', () => {
      hostRoles.delete(connection.connectionId);
      updateHostStatus({}, onStatus);
    });
    connection.on('error', () => {
      hostRoles.delete(connection.connectionId);
      updateHostStatus({}, onStatus);
    });
  });

  hostPeer.on('error', (error) => {
    const type = (error as { type?: string })?.type || String(error);
    updateHostStatus({ error: `WebRTC: ${type}` }, onStatus);
  });
  hostPeer.on('disconnected', () => {
    try { hostPeer.reconnect(); } catch { /* yoksay */ }
  });
}

/** Masaüstü/ana cihazı WebRTC bağlantılarını kabul edecek şekilde başlatır. */
export const startHost = (
  onRemote: StateHandler,
  getState: () => unknown,
  onStatus?: StatusHandler,
  fixedCode?: string
) => {
  stopPeer();
  const custom = normalize(fixedCode || '');
  const codes = Array.from(new Set([FIXED_ADMIN_CODE, FIXED_ORDER_CODE, ...(custom.length >= 4 ? [custom] : [])]));
  current = { role: 'host', code: codes[0], connected: false, clients: 0, bridge: false };
  emit(onStatus);
  codes.forEach((code) => attachHostPeer(code, onRemote, getState, onStatus));
  return codes[0];
};

/** Telefon/istemciyi WebRTC ile bağlar. Aynı Wi-Fi şartı yoktur. */
export const joinHost = (
  codeRaw: string,
  onRemote: StateHandler,
  _getState: () => unknown,
  onStatus?: StatusHandler,
  deviceRole: 'admin' | 'order' = 'order'
) => {
  stopPeer();
  const code = normalize(codeRaw);
  if (!code) {
    current = { role: 'client', code: '', connected: false, deviceRole, bridge: false, error: 'Bağlantı kodu boş' };
    emit(onStatus);
    return code;
  }

  const role = code === FIXED_ADMIN_CODE || deviceRole === 'admin' ? 'admin' : 'order';
  current = { role: 'client', code, connected: false, clients: 0, deviceRole: role, bridge: false };
  emit(onStatus);

  const update = (patch: Partial<SyncStatus>) => {
    current = { ...current, ...patch };
    emit(onStatus);
  };

  peer = new Peer(PEER_OPTIONS);
  peer.on('open', () => {
    const connection = peer!.connect(`${PREFIX}${code}`, { reliable: true, metadata: { deviceRole: role } });
    clientConnection = connection;
    connection.on('open', () => {
      update({ connected: true, error: undefined });
      connection.send({ type: 'join', deviceRole: role, deviceId: getDeviceId() });
    });
    connection.on('data', (data) => {
      const message = data as { type?: string; state?: unknown; message?: string };
      if (message.type === 'state') onRemote(message.state);
      if (message.type === 'error') update({ connected: false, error: message.message });
    });
    connection.on('close', () => {
      clientConnection = null;
      update({ connected: false, error: 'WebRTC bağlantısı kapandı' });
    });
    connection.on('error', () => {
      clientConnection = null;
      update({ connected: false, error: 'WebRTC veri bağlantısı hatası' });
    });
  });
  peer.on('error', (error) => {
    const type = (error as { type?: string })?.type || String(error);
    update({ connected: false, error: type === 'peer-unavailable' ? 'Ana cihaz çevrimdışı veya bağlantı kodu bulunamadı' : `WebRTC: ${type}` });
  });
  peer.on('disconnected', () => {
    try { peer?.reconnect(); } catch { /* yoksay */ }
  });
  return code;
};
