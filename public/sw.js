const DB_NAME = 'notification_settings';
const STORE_NAME = 'muted_topics';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getMutedTopics() {
  return openDB().then(db => {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('muted');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }).catch(() => []);
}

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

  const topicId = data.data && data.data.topicId;
  const hasMention = data.data && data.data.hasMention;

  const showNotif = getMutedTopics().then(mutedList => {
    if (topicId && mutedList.includes(topicId) && !hasMention) {
      return;
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

    return self.registration.showNotification(data.title || 'Новое сообщение', options)
      .then(() => self.registration.getNotifications())
      .then((notifications) => {
        if (navigator.setAppBadge) {
          navigator.setAppBadge(notifications.length);
        }
      });
  });

  event.waitUntil(showNotif);
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