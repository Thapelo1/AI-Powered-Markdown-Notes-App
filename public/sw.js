const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "local";
const CACHE_NAME = `margin-app-${BUILD_ID}`;
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/margin-icon.svg",
  "/margin-icon-192.png",
  "/margin-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch("/asset-manifest.json")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the app asset manifest.");
        return response.json();
      })
      .then((manifest) => {
        const assets = Object.values(manifest)
          .flatMap((entry) => [entry.file, ...(entry.css || []), ...(entry.assets || [])])
          .filter((path) => path.startsWith("assets/"))
          .map((path) => `/${path}`);
        return caches.open(CACHE_NAME).then((cache) => cache.addAll([...APP_SHELL, ...assets]));
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("margin-app-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET"
    || url.origin !== self.location.origin
    || url.pathname === "/api"
    || url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  if (!url.pathname.startsWith("/assets/")) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response.ok || response.type !== "basic") return response;
      return caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())).then(() => response);
    })),
  );
});
