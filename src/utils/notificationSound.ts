import { shouldPlaySound, shouldShowPush } from './notificationSettings';

let audioContext: AudioContext | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

let notificationPermission: NotificationPermission = 'default';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    swRegistration = reg;
  } catch { /* ignore */ }
}

export function requestNotificationPermission() {
  registerServiceWorker();

  if (!('Notification' in window)) return;
  notificationPermission = Notification.permission;
  if (notificationPermission === 'default') {
    Notification.requestPermission().then(perm => {
      notificationPermission = perm;
    });
  }
}

function isPageHidden(): boolean {
  return document.hidden;
}

function showBrowserNotification(chatName: string) {
  if (notificationPermission !== 'granted') return;
  if (!isPageHidden()) return;

  const title = 'Новое сообщение';
  const body = `Новое сообщение в "${chatName}"`;
  const icon = 'https://cdn.poehali.dev/projects/4cb0cc95-18aa-46d6-b7e8-5e3a2e2fb412/files/favicon-1773208222088.jpg';
  const tag = `chat-${chatName}`;

  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      icon,
      tag,
    });
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `chat-notification-${Date.now()}`,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setTimeout(() => notification.close(), 5000);
  } catch { /* ignore */ }
}

export function updateAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        (navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(count);
      } else {
        (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
    } catch { /* ignore */ }
  }

  if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage({ type: 'SET_BADGE', count });
  }
}

export function updateDocumentTitle(totalUnread: number) {
  const baseTitle = 'ЛинэяСкул-мессенджер';
  if (totalUnread > 0) {
    document.title = `(${totalUnread}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

type UnreadInfo = { id: string; name: string; unread: number };

let lastUnreadMap: Record<string, number> = {};
let initialized = false;

export function resetNotificationState() {
  lastUnreadMap = {};
  initialized = false;
}

export function checkAndPlaySound(chats: UnreadInfo[], topics?: UnreadInfo[]) {
  const allItems = [...chats, ...(topics || [])];
  const currentMap: Record<string, number> = {};
  for (const c of allItems) {
    currentMap[c.id] = c.unread;
  }

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);
  updateAppBadge(totalUnread);
  updateDocumentTitle(totalUnread);

  if (!initialized) {
    lastUnreadMap = currentMap;
    initialized = true;
    return;
  }

  let needSound = false;
  for (const item of allItems) {
    const prev = lastUnreadMap[item.id] || 0;
    if (item.unread > prev) {
      if (shouldPlaySound(item.id)) needSound = true;
      if (shouldShowPush(item.id)) showBrowserNotification(item.name);
    }
  }

  if (needSound) playNotificationSound();
  lastUnreadMap = currentMap;
}