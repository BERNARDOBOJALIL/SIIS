import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

function immutable3DAssetHeaders() {
  const setHeaders = (req, res, next) => {
    const cleanUrl = (req.url || '').split('?')[0]
    const isHeavy3DAsset = /\.(glb|gltf|bin|ktx2|basis|wasm)$/i.test(cleanUrl)
      || cleanUrl.includes('/draco/')

    if (isHeavy3DAsset) {
      // OPT: emulate production immutable cache headers for large model assets.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }

    next()
  }

  return {
    name: 'immutable-3d-asset-headers',
    configureServer(server) {
      server.middlewares.use(setHeaders)
    },
    configurePreviewServer(server) {
      server.middlewares.use(setHeaders)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), immutable3DAssetHeaders()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // OPT: keep 3D viewer and side-panel UI in separate chunks.
        manualChunks(id) {
          if (id.includes('ThreeViewer.jsx') || id.includes('three/examples') || id.includes('/three/')) {
            return 'viewer-3d'
          }
          if (id.includes('RightPanel.jsx')) {
            return 'routes-ui'
          }
          return undefined
        },
      },
    },
  },
})
