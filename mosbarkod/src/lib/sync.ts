import Peer from 'peerjs';

/**
 * WebRTC bağlantısı: masaüstü ve telefon aynı veya farklı ağlarda çalışabilir.
 *
 * v16 iyileştirmeleri:
 * - Heartbeat (ping/pong) + watchdog: sessizce kopan bağlantılar ~30sn içinde
 *   tespit edilir ve otomatik yeniden bağlanılır (artık "BAĞLI" görünüp ölü kalma yok).
 * - İstemci, ana cihaz bulunamazsa veya bağlantı koparsa kademeli aralıklarla
 *   (2.5s → 30s) otomatik olarak yeniden bağlanmayı dener.
 * - Ana cihaz, sinyal sunucusunda bayat kimlik kalırsa (unavailable-id) yeniden kaydolur.
 * - Hatalar kullanıcıya anlaşılır Türkçe mesajlarla gösterilir.
 * - Ek STUN sunucusu (Cloudflare) NAT geçişini güçlendirir.
 */

const PREFIX = 'mosbarkod-v16-';
const THROTTLE_MS = 350;
const MAX_CLIENTS = 2;
const FIXED_ADMIN_CODE = '1588';
const FIXED_ORDER_CODE = '1111';

const HEARTBEAT_MS = 8000;      // ne sıklıkla ping atılır
const DEAD_AFTER_MS = 30000;    // bu süre sessizlik = bağlantı ölü kabul edilir
const CLIENT_RETRY_MAX = 8;     // istemci kaç kez yeniden bağlanmayı dener
const HOST_RETRY_MAX = 6;       // ana cihaz kimlik kaydını kaç kez yeniler
const CLIENT_RETRY_DELAYS = [2500, 4000, 6000, 9000, 13000, 18000, 24000, 30000];

export interface SyncStatus {
  role: 'off' | 'host' | 'client';
  code: string;
  connected: boolean;
  clients?: number;
  clientRoles?: string[];
  deviceRole?: 'admin' | 'order';
  bridge?: boolean;
  error?: string;
  reconnecting?: boolean;
  attempt?: number;
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
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  },
};

let current: SyncStatus = { role: 'off', code: '', connected: false, clients: 0 };
let activeRole: 'off' | 'host' | 'client' = 'off';
let peer: Peer | null = null;
let hostPeers: Peer[] = [];
let clientConnection: Connection | null = null;
let hostConnections: Connection[] = [];
let hostRoles = new Map<string, string>();
let lastSeen = new Map<string, number>(); // connectionId -> son mesaj zamanı
let lastSent = 0;
let pendingState: unknown = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let deviceId = '';
let clientAttempt = 0;
let hostAttempt = 0;

const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const emit = (handler?: StatusHandler) => handler?.(current);
const openHosts = () => hostConnections.filter((connection) => connection.open);
const touch = (connection: Connection) => lastSeen.set(connection.connectionId, Date.now());

const friendlyError = (type: string): string => {
  switch (type) {
    case 'peer-unavailable':
      return 'Ana cihaz bulunamadı — kod doğru mu, ana cihaz açık mı kontrol edin';
    case 'network':
      return 'Sinyal sunucusuna ulaşılamıyor — internet bağlantınızı kontrol edin';
    case 'server-error':
      return 'Sinyal sunucusu geçici olarak yanıt vermiyor — yeniden deneniyor';
    case 'socket-error':
    case 'socket-closed':
      return 'Sinyal sunucusu bağlantısı koptu — yeniden deneniyor';
    case 'unavailable-id':
      return 'Bu bağlantı kodu başka bir cihazda kullanılıyor';
    case 'invalid-id':
      return 'Geçersiz bağlantı kodu';
    case 'webrtc':
      return 'Tarayıcı WebRTC hatası oluştu';
    case 'ssl-unavailable':
      return 'Güvenli bağlantı (SSL) kurulamadı';
    default:
      return `WebRTC: ${type}`;
  }
};

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

function clearTimers() {
  if (pendingTimer) clearTimeout(pendingTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (watchdogTimer) clearInterval(watchdogTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  pendingTimer = null;
  heartbeatTimer = null;
  watchdogTimer = null;
  reconnectTimer = null;
  pendingState = null;
}

function stopPeer() {
  activeRole = 'off'; // geç kalan callback'ler zombie emit yapmasın
  clearTimers();
  try { clientConnection?.close(); } catch { /* yoksay */ }
  for (const connection of hostConnections) {
    try { connection.close(); } catch { /* yoksay */ }
  }
  clientConnection = null;
  hostConnections = [];
  hostRoles = new Map();
  lastSeen = new Map();
  try { peer?.destroy(); } catch { /* yoksay */ }
  peer = null;
  for (const hostPeer of hostPeers) {
    try { hostPeer.destroy(); } catch { /* yoksay */ }
  }
  hostPeers = [];
  clientAttempt = 0;
  hostAttempt = 0;
}

export const stopSync = (onStatus?: StatusHandler) => {
  activeRole = 'off';
  stopPeer();
  current = { role: 'off', code: '', connected: false, clients: 0 };
  emit(onStatus);
};

/* ------------------ heartbeat + watchdog ------------------ */

function startHeartbeat() {
  clearInterval(heartbeatTimer!);
  heartbeatTimer = setInterval(() => {
    const msg = { type: 'ping', t: Date.now() };
    if (activeRole === 'host') {
      for (const connection of openHosts()) {
        try { connection.send(msg); } catch { /* yoksay */ }
      }
    } else if (activeRole === 'client' && clientConnection?.open) {
      try { clientConnection.send(msg); } catch { /* yoksay */ }
    }
  }, HEARTBEAT_MS);
}

function startWatchdog(onDead: () => void) {
  clearInterval(watchdogTimer!);
  watchdogTimer = setInterval(() => {
    if (activeRole === 'off') return;
    const now = Date.now();
    if (activeRole === 'host') {
      for (const connection of [...hostConnections]) {
        const seen = lastSeen.get(connection.connectionId) ?? 0;
        if (seen && now - seen > DEAD_AFTER_MS) {
          hostRoles.delete(connection.connectionId);
          lastSeen.delete(connection.connectionId);
          try { connection.close(); } catch { /* yoksay */ }
          onDead();
        }
      }
    } else if (activeRole === 'client' && clientConnection) {
      const seen = lastSeen.get(clientConnection.connectionId) ?? 0;
      if (seen && now - seen > DEAD_AFTER_MS) {
        const dead = clientConnection;
        clientConnection = null;
        lastSeen.delete(dead.connectionId);
        try { dead.close(); } catch { /* yoksay */ }
        onDead();
      }
    }
  }, HEARTBEAT_MS);
}

/* ------------------ gönderim ------------------ */

function send(connection: Connection, state: unknown) {
  if (connection.open) {
    try {
      connection.send({ type: 'state', state });
    } catch { /* yoksay */ }
  }
}

function broadcastPeer(state: unknown) {
  const targets = activeRole === 'host'
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
      if (!pendingState || activeRole === 'off') return;
      const delayedTargets = activeRole === 'host'
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

/* ------------------ ana cihaz (host) ------------------ */

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

  hostPeer.on('open', () => {
    if (activeRole !== 'host') return;
    if (hostAttempt > 0) hostAttempt = 0;
    updateHostStatus({ error: undefined }, onStatus);
  });

  hostPeer.on('connection', (connection) => {
    if (activeRole !== 'host') {
      try { connection.close(); } catch { /* yoksay */ }
      return;
    }
    hostConnections.push(connection);
    touch(connection);

    connection.on('open', () => {
      if (activeRole !== 'host') return;
      // Sınır kontrolü bağlantı AÇILDIKTAN sonra yapılır (yarış koşulu yok).
      if (openHosts().length > MAX_CLIENTS) {
        try { connection.send({ type: 'error', message: 'Bağlantı sınırı dolu (en fazla 2 cihaz)' }); } catch { /* yoksay */ }
        hostConnections = hostConnections.filter((item) => item !== connection);
        lastSeen.delete(connection.connectionId);
        try { connection.close(); } catch { /* yoksay */ }
        updateHostStatus({}, onStatus);
        return;
      }
      updateHostStatus({ error: undefined }, onStatus);
      send(connection, getState());
    });

    connection.on('data', (data) => {
      const message = data as { type?: string; state?: unknown; deviceRole?: string; t?: number };
      touch(connection);
      if (message.type === 'join') {
        hostRoles.set(connection.connectionId, message.deviceRole === 'admin' ? 'Admin Telefon' : 'Sipariş Telefonu');
        updateHostStatus({}, onStatus);
        send(connection, getState());
      } else if (message.type === 'ping') {
        try { connection.send({ type: 'pong', t: message.t }); } catch { /* yoksay */ }
      } else if (message.type === 'state') {
        onRemote(message.state);
        openHosts().filter((item) => item !== connection).forEach((item) => send(item, message.state));
      }
    });

    connection.on('close', () => {
      lastSeen.delete(connection.connectionId);
      hostRoles.delete(connection.connectionId);
      hostConnections = hostConnections.filter((item) => item !== connection);
      updateHostStatus({}, onStatus);
    });

    connection.on('error', () => {
      try { connection.close(); } catch { /* yoksay */ }
      lastSeen.delete(connection.connectionId);
      hostRoles.delete(connection.connectionId);
      hostConnections = hostConnections.filter((item) => item !== connection);
      updateHostStatus({}, onStatus);
    });
  });

  hostPeer.on('error', (error) => {
    const type = (error as { type?: string })?.type || String(error);
    if (activeRole !== 'host') return;

    if (type === 'unavailable-id') {
      // Sunucuda bayat kimlik kalmış olabilir; kısa süre sonra yeniden kaydol.
      const failed = hostPeer;
      hostPeers = hostPeers.filter((p) => p !== failed);
      try { failed.destroy(); } catch { /* yoksay */ }
      scheduleHostRetry(listenCode, onRemote, getState, onStatus);
      return;
    }
    updateHostStatus({ error: friendlyError(type) }, onStatus);
  });

  hostPeer.on('disconnected', () => {
    if (activeRole !== 'host') return;
    if (hostPeer.destroyed) return;
    try { hostPeer.reconnect(); } catch { /* yoksay */ }
  });
}

function scheduleHostRetry(
  listenCode: string,
  onRemote: StateHandler,
  getState: () => unknown,
  onStatus?: StatusHandler
) {
  if (activeRole !== 'host') return;
  if (hostAttempt >= HOST_RETRY_MAX) {
    updateHostStatus({ error: `Bağlantı kodu (${listenCode}) alınamadı — sunucu meşgul. Bağlantıyı kapatıp tekrar deneyin.` }, onStatus);
    return;
  }
  hostAttempt += 1;
  updateHostStatus({ error: `Bağlantı kodu kaydediliyor (${listenCode}) — deneme ${hostAttempt}/${HOST_RETRY_MAX}...` }, onStatus);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (activeRole !== 'host') return;
    attachHostPeer(listenCode, onRemote, getState, onStatus);
  }, 2500 * hostAttempt);
}

/** Masaüstü/ana cihazı WebRTC bağlantılarını kabul edecek şekilde başlatır. */
export const startHost = (
  onRemote: StateHandler,
  getState: () => unknown,
  onStatus?: StatusHandler,
  fixedCode?: string
) => {
  stopPeer();
  activeRole = 'host';
  const custom = normalize(fixedCode || '');
  const codes = Array.from(
    new Set([
      ...(custom.length >= 4 ? [custom] : []),
      FIXED_ADMIN_CODE,
      FIXED_ORDER_CODE,
    ])
  );
  const primary = codes[0];
  current = { role: 'host', code: primary, connected: false, clients: 0, bridge: false };
  emit(onStatus);

  startHeartbeat();
  startWatchdog(() => updateHostStatus({}, onStatus));
  codes.forEach((code) => attachHostPeer(code, onRemote, getState, onStatus));
  return primary;
};

/* ------------------ telefon/istemci ------------------ */

function attemptClientConnection(
  code: string,
  role: 'admin' | 'order',
  onRemote: StateHandler,
  onStatus?: StatusHandler
) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;

  const update = (patch: Partial<SyncStatus>) => {
    if (activeRole !== 'client') return;
    current = { ...current, ...patch };
    emit(onStatus);
  };

  const p = new Peer(PEER_OPTIONS);
  peer = p;
  let opened = false;

  p.on('open', () => {
    if (activeRole !== 'client') return;
    opened = true;
    const connection = p.connect(`${PREFIX}${code}`, { reliable: true, metadata: { deviceRole: role } });
    clientConnection = connection;
    touch(connection);

    connection.on('open', () => {
      if (activeRole !== 'client') return;
      clientAttempt = 0;
      update({ connected: true, reconnecting: false, attempt: 0, error: undefined });
      try { connection.send({ type: 'join', deviceRole: role, deviceId: getDeviceId() }); } catch { /* yoksay */ }
    });

    connection.on('data', (data) => {
      const message = data as { type?: string; state?: unknown; message?: string; t?: number };
      touch(connection);
      if (message.type === 'state') onRemote(message.state);
      else if (message.type === 'ping') {
        try { connection.send({ type: 'pong', t: message.t }); } catch { /* yoksay */ }
      } else if (message.type === 'error') {
        update({ connected: false, error: message.message });
      }
    });

    connection.on('close', () => {
      if (!opened || activeRole !== 'client') return;
      clientConnection = null;
      lastSeen.delete(connection.connectionId);
      update({ connected: false });
      scheduleClientRetry(code, role, onRemote, onStatus);
    });

    connection.on('error', () => {
      if (!opened || activeRole !== 'client') return;
      clientConnection = null;
      lastSeen.delete(connection.connectionId);
      update({ connected: false });
      scheduleClientRetry(code, role, onRemote, onStatus);
    });
  });

  p.on('error', (error) => {
    const type = (error as { type?: string })?.type || String(error);
    if (activeRole !== 'client') return;

    if (type === 'peer-unavailable') {
      update({ connected: false, reconnecting: true, error: 'Ana cihaz bulunamadı — yeniden deneniyor...' });
      scheduleClientRetry(code, role, onRemote, onStatus);
    } else if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') {
      update({ connected: false, reconnecting: true, error: friendlyError(type) });
      scheduleClientRetry(code, role, onRemote, onStatus);
    } else {
      update({ connected: false, error: friendlyError(type) });
    }
  });

  p.on('disconnected', () => {
    if (activeRole !== 'client') return;
    if (!opened) return;
    if (p.destroyed) return;
    try { p.reconnect(); } catch { /* yoksay */ }
  });
}

function scheduleClientRetry(
  code: string,
  role: 'admin' | 'order',
  onRemote: StateHandler,
  onStatus?: StatusHandler
) {
  if (activeRole !== 'client') return;
  // Zaten zamanlanmış bir yeniden bağlanma varsa tekrar planlama
  // (watchdog + 'close' olayı aynı anda tetikleyebilir).
  if (reconnectTimer) return;
  if (clientAttempt >= CLIENT_RETRY_MAX) {
    current = {
      ...current,
      reconnecting: false,
      attempt: undefined,
      error: 'Ana cihaza bağlanılamadı — kodu kontrol edip tekrar deneyin',
    };
    emit(onStatus);
    try { peer?.destroy(); } catch { /* yoksay */ }
    peer = null;
    return;
  }
  const delay = CLIENT_RETRY_DELAYS[clientAttempt] ?? 30000;
  clientAttempt += 1;
  current = {
    ...current,
    reconnecting: true,
    attempt: clientAttempt,
    connected: false,
    error: `Ana cihaz aranıyor (deneme ${clientAttempt}/${CLIENT_RETRY_MAX})...`,
  };
  emit(onStatus);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (activeRole !== 'client') return;
    try { peer?.destroy(); } catch { /* yoksay */ }
    peer = null;
    clientConnection = null;
    attemptClientConnection(code, role, onRemote, onStatus);
  }, delay);
}

/** Telefon/istemciyi WebRTC ile bağlar. Aynı Wi-Fi şartı yoktur. */
export const joinHost = (
  codeRaw: string,
  onRemote: StateHandler,
  _getState: () => unknown,
  onStatus?: StatusHandler,
  deviceRole: 'admin' | 'order' = 'order'
) => {
  stopPeer();
  activeRole = 'client';
  const code = normalize(codeRaw);
  if (!code) {
    current = { role: 'client', code: '', connected: false, deviceRole, bridge: false, error: 'Bağlantı kodu boş' };
    emit(onStatus);
    return code;
  }

  const role = code === FIXED_ADMIN_CODE || deviceRole === 'admin' ? 'admin' : 'order';
  current = { role: 'client', code, connected: false, clients: 0, deviceRole: role, bridge: false };
  emit(onStatus);

  startHeartbeat();
  startWatchdog(() => {
    current = { ...current, connected: false, reconnecting: true };
    emit(onStatus);
    scheduleClientRetry(code, role, onRemote, onStatus);
  });
  clientAttempt = 0;
  attemptClientConnection(code, role, onRemote, onStatus);
  return code;
};
