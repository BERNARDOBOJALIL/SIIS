# SIIS - React + Vite

Aplicacion web SIIS construida con React y Vite.

## Requisitos

- Node.js 18+
- npm

## Scripts principales

- Desarrollo: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test`
- Cobertura: `npm run test:coverage`

## Evidencia de QA

La evidencia de pruebas y verificaciones ejecutadas se encuentra en:

- [reports/qa-evidence/06-reporte-ejecutivo.md](reports/qa-evidence/06-reporte-ejecutivo.md)
- [reports/qa-evidence/00-resumen-evidencia.md](reports/qa-evidence/00-resumen-evidencia.md)
- [reports/qa-evidence/01-lint.log](reports/qa-evidence/01-lint.log)
- [reports/qa-evidence/02-tests.log](reports/qa-evidence/02-tests.log)
- [reports/qa-evidence/03-coverage.log](reports/qa-evidence/03-coverage.log)
- [reports/qa-evidence/04-build.log](reports/qa-evidence/04-build.log)
- [reports/qa-evidence/05-audit-prod.log](reports/qa-evidence/05-audit-prod.log)

## Nota tecnica: fix GLB (Git LFS + Service Worker cache stale)

Este proyecto incorporo una correccion para el error de carga de modelos GLB:

`GLB error SyntaxError: Unexpected token 'v', "version ht"... is not valid JSON`

### Causa

El loader de Three.js puede recibir:

- Un puntero de Git LFS (texto `version https://git-lfs.github.com/spec/v1`), o
- Una respuesta vieja cacheada por Service Worker.

En ambos casos, `GLTFLoader` espera binario `glTF` y falla.

### Cambios aplicados

1. [src/components/viewer/ThreeViewer.jsx](src/components/viewer/ThreeViewer.jsx)
2. [src/main.jsx](src/main.jsx)
3. [public/sw.js](public/sw.js)

Resumen funcional:

- Cache busting para assets 3D (query `rev=...`).
- Mensajes de error amigables para casos LFS, cache stale, 404 y red.
- Estado visual de error en el visor.
- Limpieza automatica de service workers en desarrollo.
- Incremento de version de cache del SW para invalidar cache vieja.

### Verificacion rapida GLB

Comprobar firma binaria de un GLB:

```bash
head -c 4 "public/assempbfinal 1.glb" | xxd -p
```

Debe devolver `676c5446` (equivale a `glTF`).

Si usan Git LFS en su maquina:

```bash
git lfs install
git lfs pull
```

### Resolucion de cache en navegador

Si el GLB local es correcto pero la app sigue fallando:

1. Hard refresh (`Ctrl+Shift+R`).
2. DevTools -> Application -> Service Workers -> Unregister.
3. DevTools -> Application -> Clear storage -> Clear site data.
