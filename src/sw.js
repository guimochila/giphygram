// SW Version
const cacheName = 'App__v{{version}}';

// Static cache - App Shell
const urlsToCache = [
  'index.html',
  'build/main.js',
  'images/flame.png',
  'images/logo.png',
  'images/sync.png',
  'vendor/bootstrap.min.css',
  'vendor/jquery.min.js',
];

// SW event listeners
self.addEventListener('install', onInstall);
self.addEventListener('activate', onActivate);
self.addEventListener('fetch', onFetch);

// **************
/**
 * Installation process of Service Worker
 */
async function onInstall() {
  await cacheFiles();
}

/**
 * Cache static files
 */
async function cacheFiles() {
  const cache = await caches.open(cacheName);

  return cache.addAll(urlsToCache);
}

/**
 * Activation event handler
 * @param {*} evt
 */
function onActivate(evt) {
  evt.waitUntil(handleActivation());
}

/**
 * Handle SW activation
 */
async function handleActivation() {
  await clearCache();
}

/**
 * Clear cache from old SW versions.
 */
async function clearCache() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(function matchOldCache(cacheName) {
    const [, cacheNameVersion] = cacheName.match(/^App__v(\d.\d.\d+)$/) || [];
    return compareCacheVersions(cacheNameVersion);
  });

  await Promise.all(
      oldCaches.map(function deleteCache(oldCacheName) {
        return caches.delete(oldCacheName);
      }),
  );
}

/**
 * Function to compare versions SEMVER
 * @param {string} cacheVersion
 * @return {boolean}
 */
function compareCacheVersions(cacheVersion) {
  const [, currentCache] = cacheName.match(/^App__v(\d.\d.\d+)$/);

  if (currentCache === cacheVersion) {
    return false;
  }

  const [currentMajor, currentMinor, currentPatch] = currentCache
      .split('.')
      .map(Number);
  const [cacheMajor, cacheMinor, cachePatch] = cacheVersion
      .split('.')
      .map(Number);

  if (
    cacheMajor > currentMajor ||
    cacheMinor > currentMinor ||
    cachePatch > currentPatch
  ) {
    return false;
  }

  return true;
}

/**
 * Fetch event handler
 * @param {*} evt
 */
async function onFetch(evt) {
  evt.respondWith(router(evt.request));
}

/**
 * Router handler
 * @param {*} req
 */
async function router(req) {
  let res;
  const url = new URL(req.url);
  const reqUrl = url.pathname;
  const cache = await caches.open(cacheName);

  res = await cache.match(url);

  if (res) {
    return res;
  }

  try {
    res = await fetch(url);
    cache.put(reqUrl, res.clone());
    return res;
  } catch (error) {}
}
