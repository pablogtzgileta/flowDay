# Módulo: AI Agent

**Pruebas**: 39-46
**Ruta involucrada**: `/agent`

---

## Prueba 39: Abrir Página de Agent
**URL**: `/agent`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/agent`
2. Observar interfaz

**Resultado esperado**:
- Área de mensajes visible (vacía o con historial)
- Toggle de modo (Text/Voice)
- Input de texto visible
- Botón de enviar visible

---

## Prueba 40: Enviar Mensaje de Texto al Agent
**URL**: `/agent`
**Pre-condición**: Usuario en modo texto

**Pasos**:
1. Navegar a `/agent`
2. Verificar modo "Text" activo
3. Escribir mensaje: "What's on my schedule today?"
4. Click en Send o presionar Enter

**Resultado esperado**:
- Mensaje de usuario aparece (derecha, fondo primario)
- Indicador "Thinking..." aparece
- Respuesta del AI aparece (izquierda, con icono bot)
- Auto-scroll a mensaje más reciente

---

## Prueba 41: Cambiar a Modo Voz
**URL**: `/agent`
**Pre-condición**: Usuario en modo texto

**Pasos**:
1. Navegar a `/agent`
2. Click en toggle "Voice"

**Resultado esperado**:
- UI cambia a modo voz
- Botón de micrófono visible
- Input de texto ya no activo

---

## Prueba 42: Conectar Voice Agent
**URL**: `/agent`
**Pre-condición**: Usuario en modo voz, micrófono disponible

**Pasos**:
1. Navegar a `/agent`
2. Cambiar a modo "Voice"
3. Click en botón de micrófono/conectar

**Resultado esperado**:
- Solicitud de permiso de micrófono (si primera vez)
- Estado cambia a "connecting"
- Luego cambia a "connected"
- Indicador de duración de sesión aparece

---

## Prueba 43: Desconectar Voice Agent
**URL**: `/agent`
**Pre-condición**: Voice agent conectado

**Pasos**:
1. Con voice agent conectado
2. Click en botón para desconectar

**Resultado esperado**:
- Conexión termina
- Estado vuelve a "disconnected"
- Uso de voz se trackea
- Minutos restantes se actualizan

---

## Prueba 44: Ver Minutos de Voz Restantes
**URL**: `/agent`
**Pre-condición**: Usuario en modo voz

**Pasos**:
1. Navegar a `/agent`
2. Cambiar a modo voz
3. Observar indicador de minutos

**Resultado esperado**:
- Se muestra cantidad de minutos restantes
- Warning si quedan pocos minutos (<=5)

---

## Prueba 45: Error al Conectar Voice (Sin Micrófono)
**URL**: `/agent`
**Pre-condición**: Dispositivo sin micrófono o permiso denegado

**Pasos**:
1. Navegar a `/agent`
2. Cambiar a modo voz
3. Intentar conectar
4. Denegar permiso de micrófono

**Resultado esperado**:
- Mensaje de error apropiado
- Estado permanece "disconnected" o "error"
- UI indica el problema

---

## Prueba 46: Historial de Conversación Persiste
**URL**: `/agent`
**Pre-condición**: Conversación previa existe

**Pasos**:
1. Enviar varios mensajes al agent
2. Navegar a otra página
3. Volver a `/agent`

**Resultado esperado**:
- Mensajes anteriores siguen visibles
- No se pierden al navegar
