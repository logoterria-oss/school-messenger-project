import { shouldPlaySound, shouldShowPush } from './notificationSettings';

let audioContext: AudioContext | null = null;

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

export function requestNotificationPermission() {
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

  try {
    const notification = new Notification('Новое сообщение', {
      body: `Новое сообщение в "${chatName}"`,
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

type UnreadInfo = { id: string; name: string; unread: number };

let lastUnreadMap: Record<string, number> = {};
let initialized = false;

export function checkAndPlaySound(chats: UnreadInfo[], topics?: UnreadInfo[]) {
  const allItems = [...chats, ...(topics || [])];
  const currentMap: Record<string, number> = {};
  for (const c of allItems) {
    currentMap[c.id] = c.unread;
  }

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