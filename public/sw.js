// Service worker minimal — sengaja HANYA untuk memenuhi syarat teknis
// "installable PWA" di browser (terutama Android Chrome), yang mensyaratkan
// adanya service worker dengan fetch handler terdaftar.
//
// TIDAK melakukan caching data sama sekali, supaya ringkasan & transaksi
// yang ditampilkan selalu versi terbaru dari server — tidak ada risiko
// data keuangan yang basi/stale gara-gara ke-cache.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through murni — semua request tetap ditangani browser seperti biasa.
});
