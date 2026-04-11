# Reporte Ejecutivo de Pruebas y Evidencias

Fecha de ejecución: 2026-04-11  
Proyecto: SIIS (React + Vite)

## Resumen rápido (semáforo)

- Unitarias e integración: VERDE
- Cobertura de código: VERDE
- Build de producción: AMARILLO
- Seguridad de dependencias (producción): VERDE
- Calidad de código (lint): ROJO

## Resultado global

Estado general: APTO CON OBSERVACIONES

Interpretación:
- La aplicación compila y las pruebas automatizadas pasan.
- No hay vulnerabilidades npm en dependencias de producción.
- Hay deuda técnica importante de lint que debe corregirse para dejar calidad continua estable.
- Existe riesgo de performance por tamaño de chunk en el visor 3D.

## Métricas clave

### 1) Pruebas automáticas

- Archivos de test ejecutados: 9
- Tests ejecutados: 28
- Tests aprobados: 28
- Tests fallidos: 0
- Tasa de éxito: 100%
- Tasa de fallo: 0%

Evidencia: [02-tests.log](reports/qa-evidence/02-tests.log)

### 2) Cobertura

- Statements: 88.88%
- Branches: 72.54%
- Functions: 80.76%
- Lines: 91.33%

Interpretación:
- La cobertura es buena para primera base de automatización.
- Lo más débil está en ramas condicionales y funciones de servicios.

Evidencia: [03-coverage.log](reports/qa-evidence/03-coverage.log)

### 3) Lint

- Total issues: 1108
- Errors: 1104
- Warnings: 4

Interpretación:
- Es el principal bloqueo de calidad del repositorio.
- Parte de los errores provienen del código existente y parte del setup de tests (por ejemplo uso de global en pruebas).

Evidencia: [01-lint.log](reports/qa-evidence/01-lint.log)

### 4) Build y performance técnica

- Build: exitoso
- Advertencia: chunks mayores a 500 kB
- Chunk más grande: viewer-3d ~816.97 kB (minificado), ~227.96 kB (gzip)

Interpretación:
- No bloquea despliegue, pero sí impacta tiempos de carga y experiencia inicial.

Evidencia: [04-build.log](reports/qa-evidence/04-build.log)

### 5) Seguridad de dependencias

- npm audit (producción): 0 vulnerabilidades

Interpretación:
- El estado de dependencias productivas es sano en esta revisión puntual.

Evidencia: [05-audit-prod.log](reports/qa-evidence/05-audit-prod.log)

## Qué ya quedó validado

- Ejecución de suite automatizada de unitarias/integración.
- Generación de cobertura consolidada.
- Build reproducible de producción.
- Revisión de seguridad de paquetes npm de producción.

## Qué falta para cerrar QA completo

- Corregir errores de lint y dejar estándar de calidad en verde.
- Medición de performance funcional de usuario (Lighthouse/Web Vitals con escenarios).
- Pruebas de carga y escalabilidad (concurrencia y estrés).
- Validaciones de seguridad dinámica (más allá de dependencias).

## Plan recomendado (prioridad)

1. Corregir lint crítico y separar configuración de tests para eliminar falsos positivos.
2. Reducir tamaño del chunk viewer-3d con división de carga adicional.
3. Agregar pruebas de carga para flujos de citas/chat.
4. Agregar indicadores de performance de experiencia real (LCP, INP, CLS).

## Evidencias relacionadas

- [00-resumen-evidencia.md](reports/qa-evidence/00-resumen-evidencia.md)
- [01-lint.log](reports/qa-evidence/01-lint.log)
- [02-tests.log](reports/qa-evidence/02-tests.log)
- [03-coverage.log](reports/qa-evidence/03-coverage.log)
- [04-build.log](reports/qa-evidence/04-build.log)
- [05-audit-prod.log](reports/qa-evidence/05-audit-prod.log)
