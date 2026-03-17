self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Новое сообщение', body: '' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : '';
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.icon || '/favicon.ico',
    tag: data.tag || 'chat-notification',
    vibrate: [200, 100, 200],
    renotify: true,
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Новое сообщение', options)
      .then(() => self.registration.getNotifications())
      .then((notifications) => {
        if (navigator.setAppBadge) {
          navigator.setAppBadge(notifications.length);
        }
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.registration.getNotifications().then((notifications) => {
      if (notifications.length === 0 && navigator.clearAppBadge) {
        navigator.clearAppBadge();
      } else if (navigator.setAppBadge) {
        navigator.setAppBadge(notifications.length);
      }
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        return;
      }
      return self.clients.openWindow('/');
    })
  );
});