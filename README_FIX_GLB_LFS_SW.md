# Fix GLB: Git LFS + Service Worker cache stale

Este documento resume TODOS los cambios aplicados para resolver el error:

`GLB error SyntaxError: Unexpected token 'v', "version ht"... is not valid JSON`

## Causa del problema

El loader de Three.js intenta parsear un `.glb`, pero a veces recibe:

- Un puntero de Git LFS (texto que empieza con `version https://git-lfs.github.com/spec/v1`), o
- Una respuesta vieja cacheada por Service Worker.

En ambos casos, `GLTFLoader` falla porque espera binario `glTF` y recibe texto.

---

## Cambios de codigo aplicados

### 1) `src/components/viewer/ThreeViewer.jsx`

#### 1.1 Cache-busting para assets 3D

Se agrego una revision fija para forzar URL unica en modelos/navmesh:

```js
const ASSET_REVISION = '20260406-1'

function withAssetRevision(url) {
  if (!url) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}rev=${ASSET_REVISION}`
}
```

Y se aplico en ambas cargas:

```js
navLoader.load(withAssetRevision(navFile), ...)
modelLoader.load(withAssetRevision(MODELS[activeModel].file), ...)
```

#### 1.2 Mensajes de error amigables

Se agrego helper para detectar casos comunes (LFS/cached/404/network):

```js
function buildGlbErrorMessage(err, filePath) {
  const raw = String(err?.message ?? err ?? '').trim()
  const lower = raw.toLowerCase()

  if (lower.includes('unexpected token') && lower.includes("token 'v'")) {
    return `No se pudo cargar ${filePath}: parece ser un puntero de Git LFS o una cache vieja del Service Worker. Ejecuta 'git lfs pull' y limpia cache del navegador.`
  }
  if (lower.includes('version ht') || lower.includes('git-lfs.github.com/spec/v1')) {
    return `No se pudo cargar ${filePath}: el archivo contiene un puntero de Git LFS (o respuesta cacheada antigua). Ejecuta 'git lfs pull' y limpia cache del navegador.`
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return `No se encontro ${filePath}. Verifica nombre y ruta dentro de /public.`
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return `No se pudo descargar ${filePath}. Revisa conexion de red y que el servidor de Vite este activo.`
  }

  return `No se pudo cargar ${filePath}. ${raw || 'Error desconocido al parsear GLB.'}`
}
```

#### 1.3 Estado de error + banner visual

Se agrego estado:

```js
const [assetError, setAssetError] = useState('')
```

Se limpia al cambiar de modelo y al iniciar una carga nueva:

```js
setAssetError('')
```

Se setea en callbacks de error de:

- Modelo principal (`modelLoader.load(..., onError)`)
- Navmesh (`navLoader.load(..., onError)`)

Y se renderiza un overlay con mensaje y boton "Cerrar" cuando hay error.

---

### 2) `src/main.jsx`

Se mantiene registro de SW en `PROD`, pero en `DEV` se agrega limpieza automatica de service workers viejos:

```js
if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(r => r.unregister())))
      .catch(err => {
        console.warn('Service worker cleanup failed', err)
      })
  })
}
```

Objetivo: evitar que una sesion de desarrollo herede cache viejo de SW.

---

### 3) `public/sw.js`

Se incremento version de cache:

```js
const SW_VERSION = 'siis-v2'
```

Esto invalida `siis-model-cache-siis-v1` y crea cache limpia para assets.

---

## Archivos modificados (resumen)

- `src/components/viewer/ThreeViewer.jsx`
- `src/main.jsx`
- `public/sw.js`

Adicionalmente, en este entorno se confirmo que estos binarios locales estan correctos (header `glTF`):

- `public/assempbfinal 1.glb`
- `public/NAVMESH_EXPORT_PB.glb`

---

## Pasos para que tu companera lo aplique

1. Aplicar los cambios de codigo en los 3 archivos listados.
2. Reiniciar servidor de desarrollo (`npm run dev`).
3. Hacer hard refresh en navegador (`Ctrl+Shift+R`).
4. Si persiste, abrir DevTools > Application:
   - Service Workers > Unregister
   - Clear storage > Clear site data
5. Volver a abrir la app.

---

## Verificacion rapida

### A) Revisar firma de GLB local

```bash
head -c 4 "public/assempbfinal 1.glb" | xxd -p
```

Debe devolver:

```text
676c5446
```

(`676c5446` = `glTF`)

### B) Si usan Git LFS en su maquina

```bash
git lfs install
git lfs pull
```

Si `git lfs` no existe, primero instalar Git LFS en el sistema.

---

## Nota importante

Si el archivo local SI es binario `glTF` pero en la app sigue saliendo el mensaje, casi siempre es cache vieja (Service Worker o browser cache), no el archivo real.
