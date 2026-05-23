const COOKIE_PREFIX = 'cop_store_';
const CHUNK_SIZE = 3000;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type CookieMeta = {
  chunks: number;
};

const cookieOptions = `path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
const expiredCookieOptions = 'path=/; max-age=0; SameSite=Lax';

function encodeKey(key: string) {
  return encodeURIComponent(key).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getMetaCookieName(key: string) {
  return `${COOKIE_PREFIX}${encodeKey(key)}_meta`;
}

function getChunkCookieName(key: string, index: number) {
  return `${COOKIE_PREFIX}${encodeKey(key)}_${index}`;
}

function getCookieMap() {
  return document.cookie.split(';').reduce<Record<string, string>>((acc, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split('=');
    if (!rawName) return acc;
    acc[rawName] = rawValue.join('=');
    return acc;
  }, {});
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; ${cookieOptions}`;
}

function removeCookie(name: string) {
  document.cookie = `${name}=; ${expiredCookieOptions}`;
}

function readMeta(key: string): CookieMeta | null {
  try {
    const raw = getCookieMap()[getMetaCookieName(key)];
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CookieMeta>;
    return typeof parsed.chunks === 'number' ? { chunks: parsed.chunks } : null;
  } catch {
    return null;
  }
}

function removeCookieValue(key: string) {
  const meta = readMeta(key);
  const cookieMap = getCookieMap();
  const encodedKey = encodeKey(key);

  removeCookie(getMetaCookieName(key));

  if (meta) {
    for (let index = 0; index < meta.chunks; index += 1) {
      removeCookie(getChunkCookieName(key, index));
    }
    return;
  }

  Object.keys(cookieMap)
    .filter((name) => name.startsWith(`${COOKIE_PREFIX}${encodedKey}_`))
    .forEach(removeCookie);
}

function writeCookieValue(key: string, value: string) {
  const encodedValue = encodeURIComponent(value);
  const chunks = encodedValue.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [''];

  removeCookieValue(key);
  setCookie(getMetaCookieName(key), encodeURIComponent(JSON.stringify({ chunks: chunks.length } satisfies CookieMeta)));
  chunks.forEach((chunk, index) => setCookie(getChunkCookieName(key, index), chunk));
}

function readCookieValue(key: string): string | null {
  const meta = readMeta(key);
  if (!meta) return null;

  const cookieMap = getCookieMap();
  const encodedValue = Array.from({ length: meta.chunks }, (_, index) => cookieMap[getChunkCookieName(key, index)] ?? '').join('');

  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return null;
  }
}

function getCookieStoredKeys() {
  return Object.keys(getCookieMap())
    .filter((name) => name.startsWith(COOKIE_PREFIX) && name.endsWith('_meta'))
    .map((name) => {
      const encodedKey = name.slice(COOKIE_PREFIX.length, -'_meta'.length);
      try {
        return decodeURIComponent(encodedKey);
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

function hydrateLocalStorageFromCookies(storage: Storage) {
  getCookieStoredKeys().forEach((key) => {
    try {
      if (storage.getItem(key) !== null) return;
      const cookieValue = readCookieValue(key);
      if (cookieValue !== null) {
        storage.setItem(key, cookieValue);
      }
    } catch {
      // Alguns navegadores podem bloquear storage/cookies em modo privado.
    }
  });
}

export function installCookieBackedLocalStorage() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as Window & { __cookieBackedStorageInstalled?: boolean }).__cookieBackedStorageInstalled) return;

  const storage = window.localStorage;
  hydrateLocalStorageFromCookies(storage);

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  Storage.prototype.getItem = function getItem(key: string) {
    const storedValue = originalGetItem.call(this, key);
    if (this !== storage || storedValue !== null) return storedValue;

    const cookieValue = readCookieValue(key);
    if (cookieValue !== null) {
      try {
        originalSetItem.call(this, key, cookieValue);
      } catch {
        // Ainda devolve o valor do cookie mesmo se não der para reidratar o localStorage.
      }
    }
    return cookieValue;
  };

  Storage.prototype.setItem = function setItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === storage) {
      writeCookieValue(key, value);
    }
  };

  Storage.prototype.removeItem = function removeItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this === storage) {
      removeCookieValue(key);
    }
  };

  Storage.prototype.clear = function clear() {
    if (this === storage) {
      getCookieStoredKeys().forEach(removeCookieValue);
    }
    originalClear.call(this);
  };

  (window as Window & { __cookieBackedStorageInstalled?: boolean }).__cookieBackedStorageInstalled = true;
}
