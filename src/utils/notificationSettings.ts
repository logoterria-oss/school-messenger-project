export type ChatNotifSettings = {
  sound: boolean;
  push: boolean;
};

type AllSettings = {
  globalSound: boolean;
  globalPush: boolean;
  perChat: Record<string, ChatNotifSettings>;
};

const STORAGE_KEY_PREFIX = 'notification_settings';
let currentUserId: string | null = null;

function getStorageKey(): string {
  if (currentUserId) return `${STORAGE_KEY_PREFIX}_${currentUserId}`;
  return STORAGE_KEY_PREFIX;
}

export function initNotificationSettingsForUser(userId: string) {
  const prevUserId = currentUserId;
  currentUserId = userId;
  if (prevUserId && prevUserId !== userId) {
    syncMutedToSW(loadSettings());
  }
}

function loadSettings(): AllSettings {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { globalSound: true, globalPush: true, perChat: {} };
}

function saveSettings(s: AllSettings) {
  localStorage.setItem(getStorageKey(), JSON.stringify(s));
  syncMutedToSW(s);
}

function syncMutedToSW(s: AllSettings) {
  try {
    const mutedIds = Object.entries(s.perChat)
      .filter(([, v]) => !v.sound && !v.push)
      .map(([k]) => k);

    const req = indexedDB.open('notification_settings', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('muted_topics')) {
        db.createObjectStore('muted_topics');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('muted_topics', 'readwrite');
      tx.objectStore('muted_topics').put(mutedIds, 'muted');
    };
  } catch { /* ignore */ }
}

export function getGlobalSettings(): { sound: boolean; push: boolean } {
  const s = loadSettings();
  return { sound: s.globalSound, push: s.globalPush };
}

export function setGlobalSound(enabled: boolean) {
  const s = loadSettings();
  s.globalSound = enabled;
  saveSettings(s);
}

export function setGlobalPush(enabled: boolean) {
  const s = loadSettings();
  s.globalPush = enabled;
  saveSettings(s);
}

export function getChatSettings(chatId: string): ChatNotifSettings {
  const s = loadSettings();
  return s.perChat[chatId] || { sound: true, push: true };
}

export function setChatSound(chatId: string, enabled: boolean) {
  const s = loadSettings();
  if (!s.perChat[chatId]) s.perChat[chatId] = { sound: true, push: true };
  s.perChat[chatId].sound = enabled;
  saveSettings(s);
}

export function setChatPush(chatId: string, enabled: boolean) {
  const s = loadSettings();
  if (!s.perChat[chatId]) s.perChat[chatId] = { sound: true, push: true };
  s.perChat[chatId].push = enabled;
  saveSettings(s);
}

export function shouldPlaySound(chatId: string): boolean {
  const s = loadSettings();
  if (!s.globalSound) return false;
  const chatS = s.perChat[chatId];
  if (chatS && !chatS.sound) return false;
  return true;
}

export function shouldShowPush(chatId: string): boolean {
  const s = loadSettings();
  if (!s.globalPush) return false;
  const chatS = s.perChat[chatId];
  if (chatS && !chatS.push) return false;
  return true;
}

export function syncMutedSettingsToSW() {
  syncMutedToSW(loadSettings());
}

const ADMIN_MUTED_SUFFIXES = ['-zoom', '-homework', '-reports'];

export function applyAdminDefaults(topicIds: string[]) {
  const s = loadSettings();
  let changed = false;
  for (const id of topicIds) {
    if (ADMIN_MUTED_SUFFIXES.some(suffix => id.endsWith(suffix)) && !s.perChat[id]) {
      s.perChat[id] = { sound: false, push: false };
      changed = true;
    }
  }
  if (changed) saveSettings(s);
}

export function applyNonLeadDefaults(topicIds: string[]) {
  const s = loadSettings();
  let changed = false;
  for (const id of topicIds) {
    if (!s.perChat[id]) {
      s.perChat[id] = { sound: false, push: false };
      changed = true;
    }
  }
  if (changed) saveSettings(s);
}
