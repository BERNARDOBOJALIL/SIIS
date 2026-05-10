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
  // Deprecated for model assets; prefer validated network-first flow.
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    return response
  } catch (err) {
    return cached || Response.error()
  }
}

async function isResponseGLB(resp) {
  try {
    const buf = await resp.clone().arrayBuffer()
    if (buf.byteLength < 4) return false
    const view = new Uint8Array(buf, 0, 4)
    // 'glTF' ASCII header: 0x67 0x6c 0x54 0x46
    return view[0] === 0x67 && view[1] === 0x6c && view[2] === 0x54 && view[3] === 0x46
  } catch (e) {
    return false
  }
}

async function fetchAndValidateModel(request) {
  // Try network-first but avoid storing non-GLB responses (e.g. Git LFS pointers)
  try {
    const netResp = await fetch(request, { method: 'GET', credentials: 'same-origin', cache: 'no-store' })
    if (netResp && netResp.ok) {
      const ok = await isResponseGLB(netResp)
      if (ok) {
        const cache = await caches.open(MODEL_CACHE)
        await cache.put(request, netResp.clone())
        return netResp
      }
      // Not a GLB: don't cache; try cached version if available
      const cached = await caches.match(request)
      if (cached) return cached
      return netResp
    }
    const cached = await caches.match(request)
    if (cached) return cached
    return netResp
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    throw err
  }
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

  // OPT: network-first for heavy 3D assets, but validate before caching.
  event.respondWith(fetchAndValidateModel(request))
})
