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
  } catch {
    // ignore
  }
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

function showBrowserNotification(newMessages: number) {
  if (notificationPermission !== 'granted') return;
  if (!isPageHidden()) return;

  const title = 'Новое сообщение';
  const body = newMessages === 1
    ? 'У вас 1 новое непрочитанное сообщение'
    : `У вас ${newMessages} новых непрочитанных сообщений`;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-notification',
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    setTimeout(() => notification.close(), 5000);
  } catch {
    // ignore
  }
}

let lastTotalUnread = -1;

export function checkAndPlaySound(totalUnread: number) {
  if (lastTotalUnread === -1) {
    lastTotalUnread = totalUnread;
    return;
  }
  if (totalUnread > lastTotalUnread) {
    const diff = totalUnread - lastTotalUnread;
    playNotificationSound();
    showBrowserNotification(diff);
  }
  lastTotalUnread = totalUnread;
}
