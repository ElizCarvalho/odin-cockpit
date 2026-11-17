/* Service worker: recebe os lembretes com o app fechado. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
importScripts('/config.js');
firebase.initializeApp(self.ODIN_FIREBASE.config);
firebase.messaging();
self.addEventListener('notificationclick', ev => {
  const link = (ev.notification.data && ev.notification.data.FCM_MSG && ev.notification.data.FCM_MSG.notification && ev.notification.data.FCM_MSG.notification.click_action)
    || (ev.notification.tag ? '/?n=' + encodeURIComponent(ev.notification.tag) + '#rotina' : '/#rotina');
  ev.notification.close();
  ev.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { c.navigate(link).catch(() => {}); return c.focus(); }
    return clients.openWindow(link);
  }));
});
