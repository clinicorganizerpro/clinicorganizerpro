const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { LocalDatabase } = require('./localDatabase.cjs');
const { createLocalBackend } = require('./localBackend.cjs');

const isDev = process.env.ELECTRON_DEV === 'true';
let localDatabase;
let localBackend;

function loadEmbeddedEnv(baseDir) {
  if (isDev) return;
  const envPath = path.join(baseDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
    console.log('[electron] Loaded embedded .env from', envPath);
  }
}

function ensureRuntimeFolders(baseDir) {
  const folders = [
    path.join(baseDir, 'backend'),
    path.join(baseDir, 'backend', 'routes'),
    path.join(baseDir, 'backend', 'services'),
    path.join(baseDir, 'backend', 'database'),
    path.join(baseDir, 'database'),
    path.join(baseDir, 'backups'),
    path.join(baseDir, 'logs'),
  ];
  folders.forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
  const serverPath = path.join(baseDir, 'backend', 'server.js');
  if (!fs.existsSync(serverPath)) {
    fs.writeFileSync(
      serverPath,
      '/* Backend local embutido no Electron. API ativa em http://127.0.0.1:8788 ao abrir o EXE. */\n',
      'utf8',
    );
  }
}

function getLocalDatabase() {
  if (!localDatabase) {
    localDatabase = new LocalDatabase(app, isDev);
  }

  return localDatabase;
}

function registerLocalDatabaseHandlers() {
  ipcMain.handle('local-db:info', () => getLocalDatabase().getInfo());
  ipcMain.handle('local-db:auth:sign-in', (_event, input) => {
    return getLocalDatabase().signIn(input?.email, input?.password);
  });
  ipcMain.handle('local-db:records:list', (_event, input) => {
    return getLocalDatabase().list(input?.relation, input?.filters ?? []);
  });
  ipcMain.handle('local-db:records:find-by-id', (_event, input) => {
    return getLocalDatabase().findById(input?.relation, input?.id);
  });
  ipcMain.handle('local-db:records:create', (_event, input) => {
    return getLocalDatabase().create(input?.relation, input?.payload ?? {});
  });
  ipcMain.handle('local-db:records:update', (_event, input) => {
    return getLocalDatabase().update(input?.relation, input?.id, input?.payload ?? {});
  });
  ipcMain.handle('local-db:records:delete', (_event, input) => {
    return getLocalDatabase().delete(input?.relation, input?.id);
  });
}

async function startLocalBackend() {
  if (!localBackend) {
    const baseDir = path.dirname(process.execPath);
    ensureRuntimeFolders(baseDir);
    localBackend = await createLocalBackend({
      database: getLocalDatabase(),
      baseDir,
    });
    await localBackend.start();
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0f172a',
    title: 'Clinic Organizer Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.setMenuBarVisibility(false);

  if (isDev) {
    window.loadURL(process.env.ELECTRON_DEV_URL || 'http://localhost:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  const baseDir = path.dirname(process.execPath);
  loadEmbeddedEnv(baseDir);
  getLocalDatabase();
  registerLocalDatabaseHandlers();
  startLocalBackend()
    .catch((error) => {
      console.error('[local-backend] failed to start:', error);
    })
    .finally(() => {
      createWindow();
    });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  try {
    localBackend?.stop();
  } catch {
    // ignore shutdown errors
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
