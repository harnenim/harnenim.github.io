self.addEventListener('install', (e) => {
	e.waitUntil(
		caches.open('kr-store').then((cache) => cache.addAll([
				'/_/WinPNG/WinPNG_Viewer.html'
		]))
    );
});

self.addEventListener('fetch', (e) => {
	e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});