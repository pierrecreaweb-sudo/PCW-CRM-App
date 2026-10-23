const CACHE_NAME = "pcw-gestion-client-v2";
const ASSETS = ["./", "./index.html", "./app.js", "./manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first pour tout : on essaie toujours d'aller chercher la version la
// plus récente en ligne, et on ne retombe sur le cache qu'en cas de perte de
// réseau (mode hors-ligne). Évite de rester bloqué sur une ancienne version
// de l'appli après une mise à jour de app.js.
self.addEventListener("fetch", event => {
  const url = event.request.url;
  if (url.includes("supabase.co")) return; // laisser passer les appels API tels quels
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---- Notifications push ----
self.addEventListener("push", event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: "PCW", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "PCW", {
    body: d.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
