/**
 * MOSBARKODYAZILIM — Electron preload
 * Güvenli contextBridge ile ana sürece köprü kurar.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mosEmail', {
  send: (payload) => ipcRenderer.invoke('mos-email-send', payload),
  hostInfo: () => ipcRenderer.invoke('mos-host-info'),
});

contextBridge.exposeInMainWorld('mosSmtp', {
  send: (payload) => ipcRenderer.invoke('mos-smtp', payload),
});

contextBridge.exposeInMainWorld('mosCloud', {
  http: (req) => ipcRenderer.invoke('mos-cloud-http', req),
});

contextBridge.exposeInMainWorld('mosStore', {
  get: (key) => ipcRenderer.invoke('mos-store', { action: 'get', key }),
  set: (key, value) => ipcRenderer.invoke('mos-store', { action: 'set', key, value }),
  del: (key) => ipcRenderer.invoke('mos-store', { action: 'del', key }),
});

contextBridge.exposeInMainWorld('mosLicense', {
  read: () => ipcRenderer.invoke('mos-license', { action: 'read' }),
  write: (patch) => ipcRenderer.invoke('mos-license', { action: 'write', patch }),
});

contextBridge.exposeInMainWorld('mosPrint', {
  sendTcp: (payload) => ipcRenderer.invoke('mos-print-tcp', payload),
});
