self.addEventListener("install", e=>{
    e.waitUntil(
        caches.open("kpss").then(cache=>{
            return cache.addAll([
                "/",
                "/index.html",
                "/style.css",
                "/app.js"
            ])
        })
    )
})

self.addEventListener("fetch", e=>{
    e.respondWith(
        caches.match(e.request).then(resp=>{
            return resp || fetch(e.request)
        })
    )
})