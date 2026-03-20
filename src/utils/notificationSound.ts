import { shouldPlaySound, shouldShowPush } from './notificationSettings';
import { API_URLS } from '@/services/api';

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

let swRegistration: ServiceWorkerRegistration | null = null;

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    swRegistration = reg;
    console.log('[Push] SW registered');
    return reg;
  } catch (err) {
    console.error('[Push] SW registration failed:', err);
    return null;
  }
}

async function getVapidPublicKey(): Promise<string | null> {
  if (!API_URLS.push) return null;
  try {
    const resp = await fetch(`${API_URLS.push}?action=vapid-key`);
    const data = await resp.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendSubscriptionToServer(subscription: PushSubscription, userId: string): Promise<boolean> {
  if (!API_URLS.push) return false;
  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  if (!key || !auth) return false;

  const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
  const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)));

  try {
    const resp = await fetch(API_URLS.push, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      body: JSON.stringify({
        action: 'subscribe',
        endpoint: subscription.endpoint,
        p256dh,
        auth: authStr,
      }),
    });
    const data = await resp.json();
    console.log('[Push] Subscription saved:', data);
    return data.ok === true;
  } catch (err) {
    console.error('[Push] Failed to save subscription:', err);
    return false;
  }
}

export type PushStatus = 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'unsubscribed';

export async function getPushStatus(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);

  if (isIOS && !isStandalone) {
    return 'unsupported';
  }

  if (Notification.permission === 'denied') return 'denied';

  const reg = swRegistration || await registerServiceWorker();
  if (!reg) return 'unsupported';

  const sub = await reg.pushManager.getSubscription();
  if (sub) return 'subscribed';
  if (Notification.permission === 'default') return 'prompt';
  return 'unsubscribed';
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  console.log('[Push] Starting subscription for user:', userId);

  const reg = swRegistration || await registerServiceWorker();
  if (!reg) {
    console.error('[Push] No SW registration');
    return false;
  }

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) {
    console.error('[Push] No VAPID key');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    if (permission !== 'granted') return false;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    console.log('[Push] Subscribed:', subscription.endpoint);

    return await sendSubscriptionToServer(subscription, userId);
  } catch (err) {
    console.error('[Push] Subscribe failed:', err);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  const reg = swRegistration || await registerServiceWorker();
  if (!reg) return false;

  try {
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;

    if (API_URLS.push) {
      await fetch(API_URLS.push, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          action: 'unsubscribe',
          endpoint: subscription.endpoint,
        }),
      }).catch(() => {});
    }

    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

export async function ensurePushSubscription(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const reg = swRegistration || await registerServiceWorker();
  if (!reg) return;

  if (Notification.permission !== 'granted') return;

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return;

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    const currentKey = existing.options?.applicationServerKey;
    const expectedKey = urlBase64ToUint8Array(vapidKey);
    let keysMatch = false;
    if (currentKey) {
      const currentArr = new Uint8Array(currentKey);
      keysMatch = currentArr.length === expectedKey.length && currentArr.every((v, i) => v === expectedKey[i]);
    }
    if (keysMatch) {
      await sendSubscriptionToServer(existing, userId);
      return;
    }
    console.log('[Push] VAPID key changed, resubscribing...');
    await existing.unsubscribe();
  }

  try {
    const newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    console.log('[Push] Resubscribed:', newSub.endpoint);
    await sendSubscriptionToServer(newSub, userId);
  } catch (err) {
    console.error('[Push] Resubscribe failed:', err);
  }
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
}

export function updateDocumentTitle(totalUnread: number) {
  const baseTitle = 'ЛинэяСкул-мессенджер';
  if (totalUnread > 0) {
    document.title = `(${totalUnread}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

type UnreadInfo = { id: string; name: string; unread: number; unreadMentions?: number };

let lastUnreadMap: Record<string, number> = {};
let lastMentionsMap: Record<string, number> = {};
let initialized = false;

export function resetNotificationState() {
  lastUnreadMap = {};
  lastMentionsMap = {};
  initialized = false;
}

export function markSoundPlayed(itemId: string, unread: number, unreadMentions: number) {
  if (initialized) {
    lastUnreadMap[itemId] = unread;
    lastMentionsMap[itemId] = unreadMentions;
  }
}

export function checkAndPlaySound(chats: UnreadInfo[], topics?: UnreadInfo[]) {
  const allItems = [...chats, ...(topics || [])];
  const currentMap: Record<string, number> = {};
  const currentMentions: Record<string, number> = {};
  for (const c of allItems) {
    currentMap[c.id] = c.unread;
    currentMentions[c.id] = c.unreadMentions || 0;
  }

  if (!initialized) {
    lastUnreadMap = currentMap;
    lastMentionsMap = currentMentions;
    initialized = true;
    return;
  }

  let needSound = false;
  for (const item of allItems) {
    const prev = lastUnreadMap[item.id] || 0;
    const prevMentions = lastMentionsMap[item.id] || 0;
    const curMentions = item.unreadMentions || 0;

    if (curMentions > prevMentions) {
      needSound = true;
    } else if (item.unread > prev) {
      if (shouldPlaySound(item.id)) needSound = true;
    }
  }

  if (needSound) playNotificationSound();
  lastUnreadMap = currentMap;
  lastMentionsMap = currentMentions;
}

export function requestNotificationPermission() {
  registerServiceWorker();
}