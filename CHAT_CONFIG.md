# Integración de Chat con Agente Inteligente

## Descripción
Se han agregado componentes y servicios para integrar un chat con agente inteligente a la aplicación. El chat está disponible como un botón en la barra de navegación principal.

## Configuración

### Variable de Entorno
Debe agregar la siguiente variable de entorno en tu archivo `.env` o `.env.local`:

```
VITE_CHAT_API_URL=http://localhost:8000
```

Reemplaza `http://localhost:8000` con la URL base de tu API del agente inteligente.

## Archivos Creados

### Servicios
- **`src/services/chatService.js`** - Cliente HTTP para comunicarse con la API del agente
  - `sendMessage(prompt, sessionId)` - Enviar mensaje y obtener respuesta
  - `checkHealth()` - Verificar disponibilidad del API
  - `resetSession(sessionId)` - Resetear una sesión de chat

### Hooks Personalizados
- **`src/hooks/useChat.js`** - Hook para gestionar la lógica del chat
  - Mantiene historial de mensajes
  - Gestiona sesiones
  - Maneja carga y errores

### Componentes
- **`src/components/chat/ChatWindow.jsx`** - Ventana flotante del chat
- **`src/components/chat/ChatMessage.jsx`** - Componente para renderizar un mensaje
- **`src/components/chat/ChatInput.jsx`** - Input para escribir mensajes

### Cambios Existentes
- **`src/components/layout/Navbar.jsx`** - Agregado botón de chat en la barra de navegación

## Uso

El chat está integrado en la barra de navegación. El usuario puede:
1. Hacer clic en el botón de chat (icono de mensaje) en la barra superior
2. Escribir su pregunta en el input
3. Presionar Ctrl+Enter (o Cmd+Enter) para enviar, o usar el botón de envío
4. Resetear la conversación con el botón de reset

## API Esperada

Tu agente debe exponer los siguientes endpoints:

### GET /health
Verifica la disponibilidad de la API.

Response:
```json
{
  "status": "string",
  "collection_count": 0
}
```

### POST /chat
Envía un mensaje y recibe la respuesta del agente.

Request:
```json
{
  "prompt": "string",
  "session_id": "string (opcional, default: 'default')"
}
```

Response:
```json
{
  "response": "string",
  "session_id": "string"
}
```

### DELETE /chat/{session_id}
Resetea una sesión del chat.

Response:
```
"string"
```

## Características

✅ Chat en tiempo real
✅ Gestión de sesiones
✅ Historial de mensajes
✅ Manejo de errores
✅ Indicador de carga
✅ Auto-scroll al nuevo mensaje
✅ Responsive (full-screen en mobile, flotante en desktop)
✅ Soporte para reset de conversación

## Notas

- Las sesiones se almacenan en `localStorage` bajo la clave `chatSessionId`
- El componente es responsive automáticamente
- En dispositivos móviles (<768px), el chat ocupa la pantalla completa
- En desktop (≥768px), aparece como una ventana flotante en la esquina inferior derecha
