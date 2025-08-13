const VERSION_ID = 1 // Версия самого ServiceWorker-а. Обычно увеличивается на 1 с каждым обновлением (т.к. Старые serviceworker-ы имеют старый контент.)
const TAG = "v" + VERSION_ID

async function populateCache(res) {
    const localCache = await caches.open(TAG)
    await localCache.addAll(res);
};

async function delCache(key) {
    await caches.delete(key);
}

async function cleanCache() {
    if ((await caches.keys()).length == 1) { return; }
    // Мы храним тольео один кэш, если при актвации действительно ксть только один кэш,
    // значит мы только что установились впервые
    const keyList = await caches.keys();
    const cacheToDelete = keyList.filter((key) => {
        return !(key == TAG)
    });
    console.log(cacheToDelete)
    await Promise.all(cacheToDelete.map(delCache))
}

// Я даже не знаю, хорошо ли это... Ну, по крайней мере сплэш теперь будет показываться быстрее...
// Хотя браузер сам по себе должен кэшировать это всё...
// Впрочем, когда будем сохранять сообщения это может быть полезно... Оставим пока как есть
// P.S: Введя IndexedDB в работу для сохранения сообщений и групп, можно будет ввести поиск по дате
// А если оставить расшифировку при получении (ожидаемо), то можно будет искать и по контенту.

// P.S: По какой-то причине в режиме PWA не работает кэш
// В некоторых браузерах, так что, возможно, стоит оставить этот функционал
const cachedList = [
    "/index.html",
    "/index.css",
    "/app.js",
    "/auth.js",
    "/firebase-config.js",
    "/globals.js",
    "/input.js",
    "/manifest.json",
    "/splash.js",
    "/storage.js",
    "/util.js"
]
self.addEventListener("install", (e) => {
    e.waitUntil(populateCache(cachedList));
})
self.addEventListener("activate", (e) => {
    e.waitUntil(cleanCache());
})

async function fetch_handler(request) {
    const cachedResp = caches.match(request);
    if (cachedResp) { return cachedResp; }
    try {
        return fetch(request);
    }
    catch (err) {
        console.debug("Fetch failed with " + err.toLocaleString())
        return new Response("", { status: 408 })
    }
}

self.addEventListener("fetch", fetch_handler)
