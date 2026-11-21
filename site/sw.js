// Replaces the old planner's service worker at the site root: it removes itself
// and its own caches, so the root shows the redirect to the coach app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // caches are per origin: the coach app keeps its own (they name its scope)
      for (const key of await caches.keys()) if (!key.includes("/coach/")) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
    })(),
  );
});
