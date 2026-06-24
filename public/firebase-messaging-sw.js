/* global importScripts, firebase, clients */
// Firebase Cloud Messaging background handler.
// The Firebase web config (which is public/safe to expose) is passed in via the
// service-worker registration URL query string, so no config is committed here.
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js')

const params = new URL(self.location).searchParams
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Fleet'
  const body = payload.notification?.body || payload.data?.body || ''
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { actionUrl: payload.data?.actionUrl || '/' },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.actionUrl || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes(url) && 'focus' in win) return win.focus()
      }
      return clients.openWindow(url)
    })
  )
})
