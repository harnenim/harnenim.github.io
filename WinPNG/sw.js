self.addEventListener('install', (e) => {
	e.waitUntil(
		caches.open('ohli-store').then((cache) => cache.addAll([
				'/WinPNG/WinPNG_Viewer.html'
		]))
    );
});

self.addEventListener('fetch', (e) => {
	e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});