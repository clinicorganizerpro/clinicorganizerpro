const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clinicLocalDb', {
  isAvailable: true,
  localBackendUrl: 'http://127.0.0.1:8788',
  info: () => ipcRenderer.invoke('local-db:info'),
  auth: {
    signIn: (email, password) => ipcRenderer.invoke('local-db:auth:sign-in', { email, password }),
  },
  records: {
    list: (relation, filters) => ipcRenderer.invoke('local-db:records:list', { relation, filters }),
    findById: (relation, id) => ipcRenderer.invoke('local-db:records:find-by-id', { relation, id }),
    create: (relation, payload) => ipcRenderer.invoke('local-db:records:create', { relation, payload }),
    update: (relation, id, payload) => ipcRenderer.invoke('local-db:records:update', { relation, id, payload }),
    delete: (relation, id) => ipcRenderer.invoke('local-db:records:delete', { relation, id }),
  },
});
