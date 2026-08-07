// ಶಾಲಾ MDM ವರದಿ - Service Worker
// ಕ್ಯಾಶ್ ಆವೃತ್ತಿ ಬದಲಾದಾಗ ಈ ಹೆಸರನ್ನು ಬದಲಿಸಿ (ಹಳೆಯ ಕ್ಯಾಶ್ ತೆರವುಗೊಳಿಸಲು)
const CACHE_NAME = "mdm-vardi-cache-v1";

// ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ಆ್ಯಪ್ ತೆರೆಯಲು ಬೇಕಾದ ಮೂಲ ಫೈಲ್‌ಗಳು
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ---- Install: ಮೂಲ ಫೈಲ್‌ಗಳನ್ನು ಕ್ಯಾಶ್ ಮಾಡಿ ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ---- Activate: ಹಳೆಯ ಕ್ಯಾಶ್‌ಗಳನ್ನು ತೆಗೆದುಹಾಕಿ ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch ----
// Google Apps Script ಗೆ ಹೋಗುವ ಫಾರ್ಮ್ ಸಲ್ಲಿಕೆ ವಿನಂತಿಗಳನ್ನು ಎಂದಿಗೂ ಕ್ಯಾಶ್ ಮಾಡಬಾರದು
// (ಅವು ಯಾವಾಗಲೂ ನೆಟ್‌ವರ್ಕ್ ಮೂಲಕವೇ ಹೋಗಬೇಕು). ಉಳಿದ ಮೂಲ ಫೈಲ್‌ಗಳಿಗೆ ಮತ್ತು
// Google Fonts (ಕನ್ನಡ ಫಾಂಟ್) ಗೆ cache-first, ನಂತರ ನೆಟ್‌ವರ್ಕ್ ಫಾಲ್‌ಬ್ಯಾಕ್ ಬಳಸಿ.
const FONT_ORIGINS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ಕೇವಲ GET ವಿನಂತಿಗಳನ್ನು ಮಾತ್ರ ಕ್ಯಾಶ್ ನಿಭಾಯಿಸಲಿ
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // ಕನ್ನಡ ಫಾಂಟ್ ಫೈಲ್‌ಗಳನ್ನು ಆಫ್‌ಲೈನ್ ಬಳಕೆಗಾಗಿ ಕ್ಯಾಶ್ ಮಾಡಿ
  if (FONT_ORIGINS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // ಬೇರೆ ಮೂಲ (Google Apps Script API ಇತ್ಯಾದಿ) - ಯಾವಾಗಲೂ ನೆಟ್‌ವರ್ಕ್
  if (url.origin !== self.location.origin) {
    return; // ಡೀಫಾಲ್ಟ್ ಬ್ರೌಸರ್ ನಿರ್ವಹಣೆಗೆ ಬಿಡಿ
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
