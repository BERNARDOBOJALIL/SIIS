# README de Tests - SIIS

Fecha de referencia: 2026-04-11  
Stack de pruebas: Vitest + Testing Library

## Objetivo

Este documento explica, en lenguaje simple, los tests automatizados que se ejecutaron en el proyecto SIIS. La idea es que puedas entender:

- Que valida cada archivo de test.
- Por que ese test es importante.
- Como leer un test aunque seas principiante.

## Resumen general

- Archivos de test ejecutados: 9
- Tests ejecutados: 28
- Tests aprobados: 28
- Tests fallidos: 0

## Mapa de tests por archivo

### 1) Utilidades generales

Archivo: src/utils/helpers.test.js

Que valida:

1. Formatea fechas en formato esperado (ejemplo: 11/04/2026).
2. Capitaliza texto correctamente (hOLA -> Hola).
3. Trunca texto largo y agrega "..." cuando corresponde.
4. Genera un identificador con formato esperado (longitud controlada).

Por que importa:
Estas funciones se reutilizan mucho. Si una falla, puede romper varios componentes a la vez.

---

### 2) Cliente HTTP base

Archivo: src/services/http.test.js

Que valida:

1. Agrega el token Bearer a los headers cuando existe en localStorage.
2. Si la API responde error con message, lanza ese mensaje.
3. Si el cuerpo de error no se puede parsear como JSON, usa fallback por status (ejemplo: Error 500).

Por que importa:
Evita fallos silenciosos de autenticacion y asegura mensajes de error consistentes.

---

### 3) Servicio de chat

Archivo: src/services/chatService.test.js

Que valida:

1. Envia mensajes al endpoint de chat con metodo y body correctos.
2. Convierte errores de validacion del backend a mensajes legibles.
3. Permite reiniciar sesion de chat llamando al endpoint correcto (DELETE).

Por que importa:
Asegura que el frontend y la API de chat esten correctamente conectados.

---

### 4) Rutas de la aplicacion

Archivo: src/routes/AppRouter.test.jsx

Que valida:

1. La ruta / muestra Home.
2. La ruta /citas muestra la pantalla de citas.
3. Una ruta inexistente muestra la pagina 404.

Por que importa:
Confirma que la navegacion principal funciona y que los usuarios no quedan en pantallas incorrectas.

---

### 5) Contexto de autenticacion

Archivo: src/context/AuthContext.test.jsx

Que valida:

1. Si Firebase devuelve usuario, se hidratan user, rol e isAuthenticated.
2. Si Firebase devuelve null, el estado queda como no autenticado.

Por que importa:
La autenticacion controla acceso y permisos. Este test protege ese flujo critico.

---

### 6) Hook de citas del estudiante

Archivo: src/hooks/useStudentCitas.test.jsx

Que valida:

1. Carga citas y las ordena por fecha.
2. Cancela una cita y registra notificacion asociada.
3. Maneja errores de snapshot con mensaje y cambia loading a false.

Por que importa:
Cubre un flujo funcional importante del negocio: ver y cancelar citas.

---

### 7) Hook de notificaciones

Archivo: src/hooks/useNotifications.test.jsx

Que valida:

1. Carga notificaciones y ordena de mas nuevas a mas antiguas.
2. Si no hay studentId, reinicia estado sin quedar cargando.
3. Maneja errores de snapshot con mensaje claro.

Por que importa:
Asegura estabilidad del panel de notificaciones incluso ante datos incompletos o errores.

---

### 8) Hook de localStorage

Archivo: src/hooks/useLocalStorage.test.jsx

Que valida:

1. Lee valores existentes guardados en localStorage.
2. Persiste cambios al actualizar estado.
3. Si hay JSON invalido guardado, usa valor inicial como respaldo.

Por que importa:
Previene errores en clientes reales cuando hay datos corruptos en navegador.

---

### 9) Hook principal de chat

Archivo: src/hooks/useChat.test.jsx

Que valida:

1. Al montar, crea sessionId y verifica salud del servicio de chat.
2. En envio exitoso, agrega mensaje user y respuesta assistant.
3. En error de API, agrega mensaje de error y registra detalle.
4. Al resetear, limpia mensajes y estado de error.

Por que importa:
Cubre el ciclo completo de uso del chat desde la perspectiva del usuario.

## Conceptos clave para principiantes

- Mock: simulacion de una dependencia externa (API, Firebase, etc.) para probar sin usar servicios reales.
- RenderHook: herramienta para probar hooks de React sin montar una pagina completa.
- Act: asegura que React procese cambios de estado antes de validar expectativas.
- Expect: afirmacion de lo que deberia pasar.

## Como leer un test rapidamente

1. Lee el nombre del test (it): describe el comportamiento esperado.
2. Revisa el setup/mocks: que se esta simulando.
3. Identifica la accion principal: que funcion se ejecuta.
4. Mira los expect: eso define el resultado correcto.

## Comandos utiles

Desde la raiz del proyecto:

```bash
npm run test
npm run test:coverage
```

Si en PowerShell falla npm por policy, alternativa:

```bash
npm.cmd run test
npm.cmd run test:coverage
```

## Cobertura actual y lectura rapida

Cobertura reportada:

- Statements: 88.88%
- Branches: 72.54%
- Functions: 80.76%
- Lines: 91.33%

Interpretacion rapida:

- Muy buena base general para inicio de automatizacion.
- Oportunidad de mejora en ramas condicionales y funciones de servicios.

## Siguientes pasos recomendados

1. Agregar tests para casos borde de errores de red y timeouts.
2. Subir cobertura de branches en hooks y servicios.
3. Integrar tests en CI para bloquear merges cuando fallen.
4. Reducir deuda de lint para mejorar mantenibilidad del suite.
