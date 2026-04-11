# Evidencia de QA y Pruebas

Fecha: 2026-04-11
Proyecto: SIIS (React + Vite)
Objetivo: dejar evidencia trazable de ejecuciones de calidad (lint, unitarias/integracion, coverage, build, seguridad de dependencias).

## 1) Comandos ejecutados

1. `npm.cmd run lint`
2. `npm.cmd run test`
3. `npm.cmd run test:coverage`
4. `npm.cmd run build`
5. `npm.cmd audit --omit=dev`

## 2) Archivos de evidencia (logs crudos)

- `reports/qa-evidence/01-lint.log`
- `reports/qa-evidence/02-tests.log`
- `reports/qa-evidence/03-coverage.log`
- `reports/qa-evidence/04-build.log`
- `reports/qa-evidence/05-audit-prod.log`

## 3) Resultado consolidado

### Lint

Estado: FALLA

Resultado reportado:
- `1108 problems (1104 errors, 4 warnings)`

Notas:
- Hay errores preexistentes del proyecto.
- Tambien aparecen errores por entorno de testing (por ejemplo `global is not defined` en tests), que sugieren ajustar el setup de ESLint para archivos de prueba.

Referencia: `reports/qa-evidence/01-lint.log`

### Tests unitarios/integracion (Vitest)

Estado: OK

Resultado reportado:
- `Test Files  9 passed (9)`
- `Tests  28 passed (28)`

Referencia: `reports/qa-evidence/02-tests.log`

### Coverage

Estado: OK

Resumen:
- Statements: `88.88%`
- Branches: `72.54%`
- Functions: `80.76%`
- Lines: `91.33%`

Referencia: `reports/qa-evidence/03-coverage.log`

### Build de produccion

Estado: OK con advertencia

Resultado:
- Build exitoso.
- Advertencia por chunks grandes (>500 kB).
- Chunk principal con mayor impacto: `dist/assets/viewer-3d-*.js` (~816.97 kB minificado, ~227.96 kB gzip).

Referencia: `reports/qa-evidence/04-build.log`

### Seguridad de dependencias (prod)

Estado: OK

Resultado:
- `found 0 vulnerabilities`

Referencia: `reports/qa-evidence/05-audit-prod.log`

## 4) Cobertura de tipos de prueba frente al objetivo

Cubierto en esta ejecucion:
- Unitarias: SI
- Integracion (a nivel de hooks/context/rutas/servicios): SI
- Performance tecnica (senal de bundle/build): PARCIAL
- Seguridad (dependencias npm de produccion): SI

No cubierto automaticamente en esta ejecucion:
- Pruebas de carga/concurrencia reales (escalabilidad)
- Pentesting dinamico (OWASP ZAP/Burp, etc.)
- Pruebas e2e de navegador con escenarios completos de usuario

## 5) Recomendaciones para siguiente iteracion

1. Configurar ESLint para tests (`env`/`globals` de Vitest) y separar errores preexistentes del codigo productivo.
2. Agregar pipeline CI para ejecutar esta misma bateria y publicar logs/artefactos por build.
3. Ejecutar pruebas de carga (k6 o Artillery) para endpoints criticos y flujos de Firestore.
4. Medir performance de frontend con Lighthouse/Web Vitals en escenarios reproducibles.
5. Definir umbrales de aceptacion (coverage minimo, tiempo de build, tamaño maximo de chunk, SLO de respuesta).
