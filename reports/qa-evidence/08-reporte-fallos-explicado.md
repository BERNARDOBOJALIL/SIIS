# Reporte Extenso de Fallos: que falla, por que y donde

Fecha: 2026-04-11
Base de evidencia: reports/qa-evidence/01-lint.log, 04-build.log, 02-tests.log, 03-coverage.log, 05-audit-prod.log

## 1. Que fallo exactamente

- Lint: fallo con alto volumen.
- Tests: no fallo (28/28).
- Coverage: no fallo tecnico; se genero correctamente.
- Build: no fallo bloqueante; si hubo advertencia de performance por chunk grande.
- Audit prod: no fallo (0 vulnerabilidades).

## 2. Donde fallo exactamente (lint)

- Total entradas con ubicacion exacta: 1103
- Entradas en codigo de terceros (DRACO): 1069
- Entradas en codigo propio (src): 34

Archivos de detalle:

- reports/qa-evidence/07a-lint-fallos-detalle.csv (todo)
- reports/qa-evidence/07b-lint-fallos-solo-src.csv (solo codigo propio)
- reports/qa-evidence/07c-lint-fallos-terceros.csv (solo terceros DRACO)
- reports/qa-evidence/07-analisis-fallos-detallado.md (listado completo en markdown)

## 3. Por que falla

### 3.1 Causa principal

La mayor parte de fallos proviene de archivos generados/minificados de terceros en public/draco. Esos archivos no estan escritos para cumplir reglas de ESLint del proyecto y disparan reglas como no-constant-condition, no-undef y no-unused-vars.

### 3.2 Causas en codigo propio (src)

Reglas mas frecuentes en src:

| Regla | Cantidad en src | Explicacion tecnica |
|---|---:|---|
| no-unused-vars | 20 | Variables declaradas y no usadas, incluyendo parametros de catch. |
| no-undef | 9 | Uso de simbolos no declarados para el entorno actual de ESLint (ej. global en tests). |
| react-refresh/only-export-components | 2 | Archivo con exportaciones no componente rompe expectativa de fast refresh. |
| react-hooks/exhaustive-deps | 2 | Dependencias faltantes en useEffect; posible estado desincronizado. |
| no-empty | 1 | Incumplimiento de regla de calidad definida en ESLint. |

Archivos de src con mas incidencias:

| Archivo | Cantidad |
|---|---:|
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 9 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 9 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 5 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js | 4 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\navPathfinding.js | 2 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\MainLayout.jsx | 1 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\hooks\useLocalStorage.js | 1 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\Navbar.jsx | 1 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\context\AuthContext.jsx | 1 |
| C:\Users\Windows\Desktop\ASE\SIIS\src\hooks\useChat.js | 1 |

## 4. Ubicaciones puntuales relevantes en codigo propio

Se listan ubicaciones representativas; el detalle completo esta en el CSV de src.

| Archivo | Linea | Columna | Regla | Motivo |
|---|---:|---:|---|---|
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\MainLayout.jsx | 11 | 14 | react-refresh/only-export-components | Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\layout\Navbar.jsx | 185 | 35 | no-unused-vars | 'Icon' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\navPathfinding.js | 444 | 49 | no-unused-vars | 'grid' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\navPathfinding.js | 741 | 67 | no-unused-vars | '_options' is assigned a value but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 387 | 10 | no-unused-vars | 'easeInOutCubic' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 714 | 10 | no-unused-vars | 'fitCameraTopDown' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 848 | 10 | no-unused-vars | 'fitEntryCameraTopDown' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 1765 | 12 | no-unused-vars | 'simplifyRouteGuidePoints' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 1855 | 12 | no-unused-vars | 'nearestReachableNavPoint' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 1893 | 12 | no-unused-vars | 'trianglesConnected' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 1987 | 12 | no-unused-vars | 'orthogonalizePolyline' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 2185 | 12 | no-unused-vars | 'buildRelativeCue' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\components\viewer\ThreeViewer.jsx | 4103 | 6 | react-hooks/exhaustive-deps | React Hook useEffect has missing dependencies: 'setLabelsVisible' and 'showLabelsForSelection'. Either include them or remove the dependency array |
| C:\Users\Windows\Desktop\ASE\SIIS\src\context\AuthContext.jsx | 40 | 17 | react-refresh/only-export-components | Fast refresh only works when a file only exports components. Use a new file to share constants or functions between components |
| C:\Users\Windows\Desktop\ASE\SIIS\src\hooks\useChat.js | 1 | 33 | no-unused-vars | 'useRef' is defined but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\hooks\useLocalStorage.js | 21 | 13 | no-empty | Empty block statement |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 176 | 14 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 200 | 14 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 302 | 9 | no-unused-vars | 'formatDateTime' is assigned a value but never used. Allowed unused vars must match /^[A-Z_]/u |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 686 | 16 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 694 | 6 | react-hooks/exhaustive-deps | React Hook useEffect has missing dependencies: 'refreshPendingCitas' and 'refreshWeekData'. Either include them or remove the dependency array |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 881 | 14 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 896 | 14 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 909 | 14 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\pages\AppointmentsPage.jsx | 922 | 14 | no-unused-vars | 'err' is defined but never used |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 10 | 5 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 17 | 12 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 24 | 5 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 34 | 5 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\chatService.test.js | 41 | 12 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js | 13 | 5 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js | 17 | 12 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js | 26 | 5 | no-undef | 'global' is not defined |
| C:\Users\Windows\Desktop\ASE\SIIS\src\services\http.test.js | 36 | 5 | no-undef | 'global' is not defined |

## 5. Build: donde aparece la advertencia

- Evidencia: reports/qa-evidence/04-build.log
- Mensaje: Some chunks are larger than 500 kB after minification.
- Chunk afectado principal: dist/assets/viewer-3d-*.js
- Tamano observado: 816.97 kB minificado (227.96 kB gzip).

Nota: esta advertencia no trae linea de codigo especifica; la ubicacion es a nivel de artefacto de bundle/chunk.

## 6. Tests y seguridad: donde NO fallo

- Tests: reports/qa-evidence/02-tests.log -> 28/28 ok.
- Coverage: reports/qa-evidence/03-coverage.log -> reporte generado correctamente.
- Audit prod: reports/qa-evidence/05-audit-prod.log -> found 0 vulnerabilities.

## 7. Conclusiones operativas

1. El indicador de calidad esta dominado por terceros en public/draco.
2. En codigo propio existen fallos reales de mantenimiento y hooks que deben priorizarse.
3. La aplicacion esta funcional (tests/build) pero con deuda de lint y una alerta de performance en el chunk 3D.
