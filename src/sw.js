// SW Version
const cacheName = 'App__v{{version}}';
let isOnline = true;

// Static cache - App Shell
const urlsToCache = [
  '/',
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
self.addEventListener('message', onMessage);

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

  // Check if the request is from origin domain
  if (url.origin === location.origin) {
    res = await safeRequest(reqUrl, {cacheResponse: true, cacheFirst: true});
    if (res) {
      return res;
    }
  }

  // Check if the request is to Giphy API endpoint
  if (url.origin.match('api.giphy.com')) {
    res = await safeRequest(url, {cacheResponse: true});
    return res;
  }

  if (/media\d+.giphy.com\/media/.test(url.href)) {
    res = await safeRequest(url, {cacheResponse: true, gif: true});
    return res;
  }

  return await safeRequest(url);
}

/**
 * Use fetch wrapped for safe request.
 * @param {String} reqUrl
 * @param {Object} cacheOptions
 * @type {Object}
 * @property {Boolean} cacheOptions.cacheFirst
 * @property {Boolean} cacheOptions.cacheResponse
 * @property {Boolean} cacheOptions.gif
 */
async function safeRequest(
    reqUrl,
    {cacheFirst = false, cacheResponse = false, gif = false} = {},
) {
  const cache = await caches.open(cacheName);
  let res;

  // If cacheFirst is defined, serves from cache.
  if (cacheFirst) {
    res = await cache.match(reqUrl);
    if (res) {
      return res;
    }
  }

  // Check if user is online ** Using the online API, not liable on liefi.
  if (isOnline) {
    try {
      res = await fetch(reqUrl);

      // Is the response exists and it is okay?
      if (res && res.ok) {
        // CacheResponse and if it is a gif file,
        // cache it in an different cache name.
        if (cacheResponse && gif) {
          const dynamicCache = await caches.open('App__giphys');
          await dynamicCache.put(reqUrl, res.clone());
          return res;
        }

        if (cacheResponse) {
          await cache.put(reqUrl, res.clone());
        }

        return res;
      }
    } catch (error) {
      console.log(error);
    }
  }

  // If it is not online serves the cache
  // Check first if the request is for gif
  if (/media\d+.giphy.com\/media/.test(reqUrl)) {
    const dynamicCache = await caches.open('App__giphys');
    res = dynamicCache.match(reqUrl);
    return res;
  }

  res = await cache.match(reqUrl);
  if (res) {
    return res;
  }
}

/**
 * Message listener for message events;
 * @param {object} data
 */
function onMessage({data}) {
  let latestGiphys;
  let action;

  if ('statusUpdate' in data) {
    ({isOnline, action, latestGiphys} = data.statusUpdate);

    if (action === 'clearGiphyCache') {
      clearGiphysCache(latestGiphys);
    }
  }
}

/**
 * Receive the Giphys array from API and only cache the latest images.
 * @param {Array} giphys
 */
async function clearGiphysCache(giphys) {
  const dynamicCache = await caches.open('App__giphys');
  const cacheKeys = await dynamicCache.keys();

  for (const key of cacheKeys) {
    if (!giphys.includes(key.url)) {
      dynamicCache.delete(key);
    }
  }
}
