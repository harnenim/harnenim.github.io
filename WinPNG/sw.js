const VERSION = "2024.03.05.v900";

if (self.window) {
	setTimeout(async function() {
		if (navigator.serviceWorker) {
			console.log(window.CURRENT_VERSION);
			if (!window.CURRENT_VERSION || CURRENT_VERSION < VERSION) {
				navigator.serviceWorker.register("sw.js?" + Math.random());
			}
		}
	}, 10);
	
} else {
	console.log(self);
	self.addEventListener('install', (e) => {
		console.log("install")
		e.waitUntil(
			caches.open('ohli-store').then((cache) => cache.addAll([
					'/WinPNG/Viewer.html'
			]))
	    );
	});
	
	self.addEventListener('fetch', (e) => {
		e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
	});
}