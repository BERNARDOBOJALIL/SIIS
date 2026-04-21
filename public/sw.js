const SW_VERSION = 'siis-v2'
const MODEL_CACHE = `siis-model-cache-${SW_VERSION}`
const MODEL_EXT_RE = /\.(glb|gltf|bin|ktx2|basis|wasm)$/i

function isModelAsset(url) {
  if (url.origin !== self.location.origin) return false
  if (MODEL_EXT_RE.test(url.pathname)) return true
  return url.pathname.includes('/draco/')
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter(key => key.startsWith('siis-model-cache-') && key !== MODEL_CACHE)
        .map(key => caches.delete(key)),
    )
    await self.clients.claim()
  })())
})

async function cacheFirst(request) {
  const cache = await caches.open(MODEL_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response && response.ok) {
    cache.put(request, response.clone())
  }
  return response
}

async function warmModelCache(urls = []) {
  const cache = await caches.open(MODEL_CACHE)

  await Promise.all(urls.map(async rawUrl => {
    try {
      const url = new URL(rawUrl, self.location.origin)
      if (!isModelAsset(url)) return

      const request = new Request(url.href, { method: 'GET' })
      const cached = await cache.match(request)
      if (cached) return

      const response = await fetch(request)
      if (response && response.ok) {
        await cache.put(request, response.clone())
      }
    } catch {
      // Ignore warm-up failures; runtime cache-first still handles later requests.
    }
  }))
}

self.addEventListener('message', event => {
  const data = event.data
  if (!data || data.type !== 'WARM_MODEL_CACHE' || !Array.isArray(data.urls)) return

  event.waitUntil(warmModelCache(data.urls))
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  if (request.headers.has('range')) {
    return
  }

  const url = new URL(request.url)
  if (!isModelAsset(url)) return

  // OPT: cache heavy 3D assets after first download for repeat visits.
  event.respondWith(cacheFirst(request))
})
