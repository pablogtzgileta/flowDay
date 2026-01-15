# Flow Day - Plan de Pruebas E2E

## Resumen de la Aplicación

**Flow Day** es una aplicación de productividad personal potenciada por IA que ayuda a los usuarios a planificar su día de manera inteligente, considerando sus niveles de energía, metas y rutinas.

---

## 1. Arquitectura Técnica

### Stack Tecnológico
| Componente | Tecnología |
|------------|------------|
| **Frontend** | React 18 + TypeScript |
| **Routing** | TanStack Router (file-based) |
| **Styling** | Tailwind CSS |
| **Backend** | Convex (serverless) |
| **Autenticación** | Better Auth + Convex |
| **State Management** | Zustand + Convex Queries |
| **Voice AI** | ElevenLabs WebRTC |
| **Build Tool** | Vite + Bun |

### URLs de la Aplicación
- **Desarrollo**: `http://localhost:3001` o `http://localhost:5173`
- **Backend Convex**: `https://fearless-iguana-970.convex.cloud`

### Credenciales de Prueba
```
Email: test@flowday.dev
Password: TestPassword123!
Name: Test User
```

---

## 2. Estructura de Rutas

### Rutas Públicas (sin autenticación)
| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/sign-in` | Inicio de sesión |
| `/sign-up` | Registro |
| `/forgot-password` | Solicitar reset de contraseña |
| `/reset-password?token=...` | Completar reset de contraseña |

### Rutas Protegidas (requieren autenticación)
| Ruta | Descripción |
|------|-------------|
| `/onboarding` | Onboarding de 6 pasos |
| `/timeline` | Vista principal del día |
| `/dashboard` | Resumen del progreso |
| `/goals` | Lista de metas |
| `/goals/:goalId` | Detalle de meta |
| `/scheduler` | Calendario semanal |
| `/agent` | Agente de IA (texto/voz) |
| `/review` | Análisis semanal |
| `/settings` | Configuración |
| `/settings/energy` | Perfil de energía |

---

## 3. Flujos Principales

### Flujo de Autenticación
```
Landing (/) → Sign Up → Onboarding (6 pasos) → Dashboard
                 ↓
           Sign In → Dashboard/Timeline
                 ↓
           Forgot Password → Email → Reset Password → Sign In
```

### Flujo de Onboarding
```
1. Welcome → 2. Wake Time → 3. Sleep Time → 4. Peak Energy → 5. Notifications → 6. Location → Dashboard
```

### Flujo de Goals
```
Goals List → Create Goal (dialog) → Goal Created
                                         ↓
Goal Detail → Edit/Archive/Delete → Updated List
```

### Flujo del Agente
```
Agent Page → Mode Selection (Text/Voice)
                 ↓
           Text: Type message → Send → AI Response
                 ↓
           Voice: Connect → Speak → AI Response (audio)
```

---

## 4. Plan de Pruebas

### Convenciones
- **Pre-condición**: Estado necesario antes de ejecutar la prueba
- **Pasos**: Acciones a ejecutar en orden
- **Resultado esperado**: Comportamiento esperado al completar la prueba
- **URL**: Ruta donde inicia la prueba

---

## Módulo: Autenticación

### Prueba 1: Registro de Usuario Nuevo
**URL**: `/sign-up`
**Pre-condición**: Usuario no autenticado, email no registrado

**Pasos**:
1. Navegar a `/sign-up`
2. Ingresar nombre válido (ej: "Test User")
3. Ingresar email válido no registrado (ej: "nuevo@test.com")
4. Ingresar contraseña de 8+ caracteres
5. Confirmar contraseña (debe coincidir)
6. Click en botón "Sign Up"

**Resultado esperado**:
- Usuario es redirigido a `/onboarding`
- No aparecen errores
- El usuario está autenticado

---

### Prueba 2: Registro con Contraseñas que No Coinciden
**URL**: `/sign-up`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-up`
2. Ingresar nombre válido
3. Ingresar email válido
4. Ingresar contraseña "Password123!"
5. Ingresar confirmación diferente "Password456!"
6. Click en botón "Sign Up"

**Resultado esperado**:
- Se muestra mensaje de error "Passwords do not match"
- El formulario NO se envía
- Usuario permanece en `/sign-up`

---

### Prueba 3: Registro con Contraseña Muy Corta
**URL**: `/sign-up`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-up`
2. Ingresar nombre válido
3. Ingresar email válido
4. Ingresar contraseña de menos de 8 caracteres (ej: "1234567")
5. Confirmar la misma contraseña
6. Click en botón "Sign Up"

**Resultado esperado**:
- Se muestra mensaje de error indicando requisito de 8+ caracteres
- El formulario NO se envía

---

### Prueba 4: Inicio de Sesión Exitoso
**URL**: `/sign-in`
**Pre-condición**: Usuario registrado existente

**Pasos**:
1. Navegar a `/sign-in`
2. Ingresar email: `test@flowday.dev`
3. Ingresar contraseña: `TestPassword123!`
4. Click en botón "Sign In"

**Resultado esperado**:
- Usuario es redirigido a `/dashboard` o `/timeline`
- No aparecen errores
- Header muestra avatar del usuario

---

### Prueba 5: Inicio de Sesión con Credenciales Incorrectas
**URL**: `/sign-in`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-in`
2. Ingresar email válido
3. Ingresar contraseña incorrecta
4. Click en botón "Sign In"

**Resultado esperado**:
- Se muestra mensaje de error (toast o inline)
- Usuario permanece en `/sign-in`
- Formulario no se limpia completamente

---

### Prueba 6: Navegación a Forgot Password
**URL**: `/sign-in`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-in`
2. Click en link "Forgot password?"

**Resultado esperado**:
- Usuario es redirigido a `/forgot-password`
- Se muestra formulario de recuperación

---

### Prueba 7: Solicitar Reset de Contraseña
**URL**: `/forgot-password`
**Pre-condición**: Usuario no autenticado, email registrado

**Pasos**:
1. Navegar a `/forgot-password`
2. Ingresar email registrado
3. Click en botón "Send Reset Link"

**Resultado esperado**:
- Se muestra mensaje de confirmación
- Se indica que se envió email
- Link para volver a sign-in visible

---

### Prueba 8: Cerrar Sesión
**URL**: `/settings` o cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Click en avatar en header
2. Click en "Sign Out" en dropdown

**Resultado esperado**:
- Usuario es redirigido a `/` o `/sign-in`
- Session es terminada
- Rutas protegidas ya no son accesibles

---

### Prueba 9: Protección de Rutas - Acceso No Autorizado
**URL**: `/timeline`
**Pre-condición**: Usuario NO autenticado

**Pasos**:
1. Intentar navegar directamente a `/timeline`

**Resultado esperado**:
- Usuario es redirigido a `/sign-in`
- Parámetro `redirect=/timeline` en URL
- Mensaje de login requerido (opcional)

---

### Prueba 10: Redirección Post-Login
**URL**: `/sign-in?redirect=/goals`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-in?redirect=/goals`
2. Completar login exitoso

**Resultado esperado**:
- Usuario es redirigido a `/goals` (no a `/dashboard`)
- Respeta el parámetro redirect

---

## Módulo: Onboarding

### Prueba 11: Flujo Completo de Onboarding
**URL**: `/onboarding`
**Pre-condición**: Usuario autenticado, onboarding NO completado

**Pasos**:
1. Verificar que se muestra paso "Welcome"
2. Click "Continue"
3. En "Wake Time": seleccionar hora (ej: 07:00)
4. Click "Continue"
5. En "Sleep Time": seleccionar hora (ej: 23:00)
6. Click "Continue"
7. En "Peak Energy": seleccionar opción (Morning/Afternoon/Evening)
8. Click "Continue"
9. En "Notification Style": seleccionar opción (Minimal/Proactive)
10. Click "Continue"
11. En "Location": (opcional) agregar ubicación o skip
12. Click "Finish"

**Resultado esperado**:
- Cada paso muestra indicador de progreso
- Preferencias se guardan
- Al finalizar, redirige a `/dashboard`
- Onboarding marcado como completado

---

### Prueba 12: Navegación Atrás en Onboarding
**URL**: `/onboarding`
**Pre-condición**: Usuario en paso 3+ de onboarding

**Pasos**:
1. Avanzar hasta paso 3 (Sleep Time)
2. Click botón "Back"
3. Verificar que está en paso 2 (Wake Time)
4. Click "Back" nuevamente
5. Verificar que está en paso 1 (Welcome)

**Resultado esperado**:
- Botón "Back" no visible en paso 1
- Navegación funciona correctamente
- Valores seleccionados se mantienen

---

### Prueba 13: Onboarding - Configurar Ubicación
**URL**: `/onboarding` (paso Location)
**Pre-condición**: Usuario en paso de Location

**Pasos**:
1. Avanzar hasta paso de Location
2. Ingresar dirección de casa
3. Esperar geocodificación (checkmark verde)
4. (Opcional) Ingresar dirección de trabajo
5. Esperar cálculo de tiempo de viaje

**Resultado esperado**:
- Direcciones se geocodifican
- Checkmark verde indica éxito
- Tiempo de viaje se calcula y muestra

---

### Prueba 14: Forzar Onboarding para Usuario Incompleto
**URL**: `/dashboard`
**Pre-condición**: Usuario autenticado, onboarding NO completado

**Pasos**:
1. Intentar navegar a `/dashboard`

**Resultado esperado**:
- Usuario es redirigido a `/onboarding`
- No puede acceder a rutas de app sin completar onboarding

---

## Módulo: Timeline

### Prueba 15: Visualizar Timeline del Día
**URL**: `/timeline`
**Pre-condición**: Usuario autenticado con onboarding completo

**Pasos**:
1. Navegar a `/timeline`
2. Verificar que tab "Today" está seleccionado
3. Observar bloques de tiempo (si existen)
4. Verificar indicador de hora actual (línea roja)

**Resultado esperado**:
- Se muestran bloques programados para hoy
- Indicador de hora actual visible y posicionado correctamente
- Indicador de zona de energía visible

---

### Prueba 16: Cambiar Entre Today y Tomorrow
**URL**: `/timeline`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/timeline`
2. Click en tab "Tomorrow"
3. Verificar contenido cambia
4. Click en tab "Today"

**Resultado esperado**:
- Contenido se actualiza según tab seleccionado
- Tab activo tiene estilo diferenciado
- Fecha mostrada corresponde al tab

---

### Prueba 17: Marcar Bloque como Completado
**URL**: `/timeline`
**Pre-condición**: Existe al menos un bloque "planned" para hoy

**Pasos**:
1. Navegar a `/timeline`
2. Hover sobre un bloque con status "planned"
3. Click en botón de check (completar)
4. Observar cambio de estado

**Resultado esperado**:
- Status cambia a "completed"
- Color del bloque cambia a verde
- Icono de completado aparece

---

### Prueba 18: Saltar (Skip) un Bloque
**URL**: `/timeline`
**Pre-condición**: Existe al menos un bloque "planned"

**Pasos**:
1. Navegar a `/timeline`
2. Hover sobre un bloque planned
3. Click en botón de skip (X)

**Resultado esperado**:
- Status cambia a "skipped"
- Bloque se muestra con estilo diferente
- Acción es persistente

---

### Prueba 19: Estado Vacío de Timeline
**URL**: `/timeline`
**Pre-condición**: Usuario sin bloques programados para hoy

**Pasos**:
1. Navegar a `/timeline`
2. Observar estado vacío

**Resultado esperado**:
- Se muestra mensaje de estado vacío
- CTA para ir a AI Agent o crear bloques
- No se muestra error

---

### Prueba 20: Visualizar Energy Zone Indicator
**URL**: `/timeline`
**Pre-condición**: Usuario con perfil de energía configurado

**Pasos**:
1. Navegar a `/timeline`
2. Observar barra de zonas de energía
3. Hover sobre diferentes zonas

**Resultado esperado**:
- Barra muestra colores (verde=alto, amarillo=medio, gris=bajo)
- Tooltip muestra nivel de energía y rango horario
- Leyenda visible

---

## Módulo: Dashboard

### Prueba 21: Visualizar Dashboard
**URL**: `/dashboard`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/dashboard`
2. Observar tarjetas de estadísticas
3. Verificar sección "Today's Schedule"

**Resultado esperado**:
- Tarjeta "Today's Progress" muestra completados/total
- Tarjeta "Active Goals" muestra conteo
- Tarjeta "Next Block" muestra próximo bloque
- Lista de bloques del día visible

---

### Prueba 22: Dashboard - Progreso con Bloques Completados
**URL**: `/dashboard`
**Pre-condición**: Usuario con algunos bloques completados hoy

**Pasos**:
1. Navegar a `/dashboard`
2. Observar barra de progreso

**Resultado esperado**:
- Barra de progreso refleja porcentaje correcto
- Número de completados/total es correcto
- Colores codificados por status

---

### Prueba 23: Dashboard - Estado Vacío
**URL**: `/dashboard`
**Pre-condición**: Usuario sin bloques para hoy

**Pasos**:
1. Navegar a `/dashboard`
2. Observar estado vacío

**Resultado esperado**:
- Mensaje indicando que no hay schedule
- CTA para ir a Scheduler
- No se muestran errores

---

## Módulo: Goals

### Prueba 24: Visualizar Lista de Goals
**URL**: `/goals`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/goals`
2. Observar lista de goals existentes

**Resultado esperado**:
- Goals se muestran en grid
- Cada card muestra: título, descripción, horas semanales, categoría
- Botón para crear nuevo goal visible

---

### Prueba 25: Crear Nuevo Goal
**URL**: `/goals`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/goals`
2. Click en "New Goal" o usar Cmd/Ctrl+N
3. Ingresar título: "Learn Spanish"
4. Ingresar descripción: "Practice daily"
5. Seleccionar horas semanales: 5
6. Seleccionar categoría: "Learning"
7. Seleccionar preferred time: "Morning"
8. Seleccionar energy level: "High"
9. Click "Create Goal"

**Resultado esperado**:
- Dialog se cierra
- Nuevo goal aparece en lista
- Toast de confirmación
- Goal tiene todos los datos correctos

---

### Prueba 26: Crear Goal desde Template
**URL**: `/goals`
**Pre-condición**: Usuario autenticado, lista de goals vacía o no

**Pasos**:
1. Navegar a `/goals`
2. Click en un template quick-start (si existe)
3. Modificar datos si necesario
4. Crear goal

**Resultado esperado**:
- Dialog se abre pre-poblado con datos del template
- Usuario puede modificar valores
- Goal se crea exitosamente

---

### Prueba 27: Ver Detalle de Goal
**URL**: `/goals/:goalId`
**Pre-condición**: Existe al menos un goal

**Pasos**:
1. Navegar a `/goals`
2. Click en un goal card

**Resultado esperado**:
- Navega a `/goals/{goalId}`
- Se muestra título, descripción, categoría
- Progress ring con porcentaje semanal
- Stats: horas completadas, sesiones
- Lista de sesiones recientes

---

### Prueba 28: Editar Goal Existente
**URL**: `/goals/:goalId`
**Pre-condición**: Usuario en detalle de goal

**Pasos**:
1. Navegar a detalle de un goal
2. Click en "Edit Goal"
3. Modificar título a "Updated Title"
4. Cambiar horas semanales
5. Click "Save Changes"

**Resultado esperado**:
- Dialog se cierra
- Cambios reflejados en la página
- Toast de confirmación

---

### Prueba 29: Archivar Goal
**URL**: `/goals/:goalId`
**Pre-condición**: Goal activo existente

**Pasos**:
1. Navegar a detalle de goal activo
2. Click en "Archive"

**Resultado esperado**:
- Goal cambia a estado archived
- Botón cambia a "Reactivate"
- Goal ya no aparece en lista activa

---

### Prueba 30: Reactivar Goal Archivado
**URL**: `/goals/:goalId`
**Pre-condición**: Goal archivado existente

**Pasos**:
1. Navegar a goals
2. Ver goals archivados (si hay tab)
3. Ir a detalle de goal archivado
4. Click "Reactivate"

**Resultado esperado**:
- Goal vuelve a estado activo
- Aparece en lista de goals activos

---

### Prueba 31: Eliminar Goal
**URL**: `/goals/:goalId`
**Pre-condición**: Goal existente

**Pasos**:
1. Navegar a detalle de goal
2. Click en "Delete"
3. Confirmar en dialog de confirmación

**Resultado esperado**:
- Dialog de confirmación aparece
- Al confirmar, goal es eliminado
- Redirige a `/goals`
- Goal ya no aparece en lista

---

### Prueba 32: Cancelar Eliminación de Goal
**URL**: `/goals/:goalId`
**Pre-condición**: Goal existente, dialog de delete abierto

**Pasos**:
1. Click en "Delete" goal
2. En dialog de confirmación, click "Cancel"

**Resultado esperado**:
- Dialog se cierra
- Goal NO es eliminado
- Permanece en página de detalle

---

### Prueba 33: Keyboard Shortcut para Nuevo Goal
**URL**: `/goals`
**Pre-condición**: Usuario en página de goals

**Pasos**:
1. Navegar a `/goals`
2. Presionar Cmd+N (Mac) o Ctrl+N (Windows)

**Resultado esperado**:
- Dialog de nuevo goal se abre
- Funcionalidad igual que click en botón

---

## Módulo: Scheduler

### Prueba 34: Visualizar Scheduler Semanal
**URL**: `/scheduler`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/scheduler`
2. Observar vista de 7 días

**Resultado esperado**:
- Se muestran 7 columnas (días de la semana)
- Cada día muestra fecha y bloques
- Navegación de semana visible
- Leyenda de colores visible

---

### Prueba 35: Navegar a Semana Siguiente
**URL**: `/scheduler`
**Pre-condición**: Usuario en scheduler

**Pasos**:
1. Navegar a `/scheduler`
2. Click en flecha "Next" o ">"

**Resultado esperado**:
- Vista cambia a siguiente semana
- Fechas se actualizan
- Bloques de nueva semana se cargan

---

### Prueba 36: Navegar a Semana Anterior
**URL**: `/scheduler`
**Pre-condición**: Usuario en scheduler

**Pasos**:
1. Navegar a `/scheduler`
2. Click en flecha "Previous" o "<"

**Resultado esperado**:
- Vista cambia a semana anterior
- Fechas se actualizan correctamente

---

### Prueba 37: Volver a Semana Actual
**URL**: `/scheduler`
**Pre-condición**: Usuario en otra semana

**Pasos**:
1. Navegar a semana diferente a la actual
2. Click en botón "Today"

**Resultado esperado**:
- Vista vuelve a semana actual
- Día actual está destacado o visible

---

### Prueba 38: Generar Schedule para un Día
**URL**: `/scheduler`
**Pre-condición**: Día sin schedule, goals activos existen

**Pasos**:
1. Navegar a `/scheduler`
2. Encontrar día vacío o con botón "Generate"
3. Click en "Generate"
4. Esperar carga

**Resultado esperado**:
- Loading spinner aparece
- Bloques se generan para ese día
- Bloques aparecen en el día

---

## Módulo: AI Agent

### Prueba 39: Abrir Página de Agent
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

### Prueba 40: Enviar Mensaje de Texto al Agent
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

### Prueba 41: Cambiar a Modo Voz
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

### Prueba 42: Conectar Voice Agent
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

### Prueba 43: Desconectar Voice Agent
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

### Prueba 44: Ver Minutos de Voz Restantes
**URL**: `/agent`
**Pre-condición**: Usuario en modo voz

**Pasos**:
1. Navegar a `/agent`
2. Cambiar a modo voz
3. Observar indicador de minutos

**Resultado esperado**:
- Se muestra cantidad de minutos restantes
- Warning si quedan pocos minutos (≤5)

---

### Prueba 45: Error al Conectar Voice (Sin Micrófono)
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

### Prueba 46: Historial de Conversación Persiste
**URL**: `/agent`
**Pre-condición**: Conversación previa existe

**Pasos**:
1. Enviar varios mensajes al agent
2. Navegar a otra página
3. Volver a `/agent`

**Resultado esperado**:
- Mensajes anteriores siguen visibles
- No se pierden al navegar

---

## Módulo: Weekly Review

### Prueba 47: Visualizar Weekly Review
**URL**: `/review`
**Pre-condición**: Usuario con actividad en semanas anteriores

**Pasos**:
1. Navegar a `/review`
2. Observar estadísticas de la semana

**Resultado esperado**:
- Cards de stats: Completion %, Hours, Best Day, Energy Alignment
- Gráfico de barras semanal
- Sección de Goal Progress
- Insights y sugerencias

---

### Prueba 48: Navegar a Semana Anterior en Review
**URL**: `/review`
**Pre-condición**: Usuario con historial de múltiples semanas

**Pasos**:
1. Navegar a `/review`
2. Click en flecha "Previous"

**Resultado esperado**:
- Stats se actualizan para semana anterior
- Gráfico cambia
- Rango de fechas se actualiza

---

### Prueba 49: Ver Goal Progress en Review
**URL**: `/review`
**Pre-condición**: Goals activos con progreso

**Pasos**:
1. Navegar a `/review`
2. Scroll a sección "Goal Progress"

**Resultado esperado**:
- Cards por cada goal activo
- Progress ring con porcentaje
- Status: Ahead/On Track/Behind/Complete
- Minutos target vs completados

---

### Prueba 50: Ver Insights
**URL**: `/review`
**Pre-condición**: Datos suficientes para generar insights

**Pasos**:
1. Navegar a `/review`
2. Scroll a sección "Insights"

**Resultado esperado**:
- Insights cards con iconos
- Severity levels indicados por color
- Título y descripción de cada insight

---

### Prueba 51: Aplicar Sugerencia
**URL**: `/review`
**Pre-condición**: Sugerencias disponibles

**Pasos**:
1. Navegar a `/review`
2. Encontrar una sugerencia
3. Click en "Apply"

**Resultado esperado**:
- Loading state mientras procesa
- Sugerencia se marca como aplicada
- Cambio se refleja en sistema

---

### Prueba 52: Descartar Sugerencia
**URL**: `/review`
**Pre-condición**: Sugerencias disponibles

**Pasos**:
1. Navegar a `/review`
2. Encontrar una sugerencia
3. Click en "Dismiss"

**Resultado esperado**:
- Sugerencia se oculta o marca como descartada
- No se aplican cambios

---

### Prueba 53: Review - Estado Vacío
**URL**: `/review`
**Pre-condición**: Semana sin actividad

**Pasos**:
1. Navegar a `/review`
2. Ir a semana sin bloques

**Resultado esperado**:
- Mensaje de estado vacío
- No se muestran errores
- Navegación a otras semanas funciona

---

## Módulo: Settings

### Prueba 54: Visualizar Settings
**URL**: `/settings`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/settings`
2. Observar secciones

**Resultado esperado**:
- Sección Profile (nombre, email, timezone - read-only)
- Sección Schedule Preferences
- Sección Notifications
- Location Manager
- Lazy Mode Toggle
- Rollover Settings
- Links a Energy Profile y Weekly Insights

---

### Prueba 55: Cambiar Wake Time
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. En Schedule Preferences, cambiar Wake Time a nueva hora
3. Click "Save Changes"

**Resultado esperado**:
- Botón Save Changes aparece al hacer cambio
- Al guardar, toast de confirmación
- Valor se persiste

---

### Prueba 56: Cambiar Sleep Time
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Cambiar Sleep Time
3. Guardar cambios

**Resultado esperado**:
- Cambio se guarda correctamente
- Toast de confirmación

---

### Prueba 57: Cambiar Peak Energy Window
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Seleccionar diferente Peak Energy (Morning/Afternoon/Evening)
3. Guardar cambios

**Resultado esperado**:
- Selección visual cambia
- Cambio se guarda

---

### Prueba 58: Cambiar Notification Style
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Cambiar entre Minimal y Proactive
3. Guardar cambios

**Resultado esperado**:
- Opción seleccionada se destaca
- Cambio se persiste

---

### Prueba 59: Detectar Cambios No Guardados
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Cambiar cualquier valor
3. NO guardar
4. Observar botón "Save Changes"

**Resultado esperado**:
- Botón "Save Changes" aparece visible
- Indica que hay cambios pendientes

---

### Prueba 60: Activar Lazy Mode
**URL**: `/settings`
**Pre-condición**: Lazy mode desactivado

**Pasos**:
1. Navegar a `/settings`
2. Encontrar Lazy Mode toggle
3. Activar toggle

**Resultado esperado**:
- Toggle cambia a ON
- Opciones de duración aparecen
- Badge de Lazy Mode visible en timeline

---

### Prueba 61: Configurar Duración de Lazy Mode
**URL**: `/settings`
**Pre-condición**: Lazy mode activado

**Pasos**:
1. Con Lazy Mode activo
2. Seleccionar duración (ej: 2 hours)

**Resultado esperado**:
- Duración seleccionada
- Hora de expiración mostrada
- Auto-desactivación programada

---

### Prueba 62: Desactivar Lazy Mode
**URL**: `/settings`
**Pre-condición**: Lazy mode activado

**Pasos**:
1. Con Lazy Mode activo
2. Desactivar toggle

**Resultado esperado**:
- Toggle cambia a OFF
- Opciones de duración desaparecen

---

### Prueba 63: Cambiar Rollover Behavior
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Encontrar Rollover Settings
3. Seleccionar diferente opción

**Resultado esperado**:
- Opción seleccionada se destaca
- Cambio se guarda automáticamente

---

### Prueba 64: Agregar Nueva Ubicación
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Expandir Location Manager
3. Click "Add Location"
4. Ingresar label y dirección
5. Guardar

**Resultado esperado**:
- Nueva ubicación aparece en lista
- Dirección geocodificada
- Coordenadas guardadas

---

### Prueba 65: Editar Ubicación Existente
**URL**: `/settings`
**Pre-condición**: Al menos una ubicación existe

**Pasos**:
1. En Location Manager
2. Click edit en ubicación
3. Modificar dirección
4. Guardar

**Resultado esperado**:
- Cambios guardados
- Nueva dirección geocodificada

---

### Prueba 66: Eliminar Ubicación
**URL**: `/settings`
**Pre-condición**: Al menos una ubicación existe

**Pasos**:
1. En Location Manager
2. Click delete en ubicación
3. Confirmar eliminación

**Resultado esperado**:
- Ubicación removida de lista
- Cache de tiempos de viaje limpiado

---

### Prueba 67: Marcar Ubicación como Default
**URL**: `/settings`
**Pre-condición**: Múltiples ubicaciones existen

**Pasos**:
1. En Location Manager
2. Marcar ubicación como default/home

**Resultado esperado**:
- Ubicación marcada como default
- Icono de home visible

---

### Prueba 68: Navegar a Energy Profile
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Click en card "Energy Profile"

**Resultado esperado**:
- Navega a `/settings/energy`
- Editor de perfil de energía visible

---

## Módulo: Energy Profile

### Prueba 69: Visualizar Energy Profile Editor
**URL**: `/settings/energy`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/settings/energy`
2. Observar editor

**Resultado esperado**:
- Gráfico de 24 horas visible
- Presets disponibles (Morning Person, Night Owl, Steady)
- Niveles de energía codificados por color

---

### Prueba 70: Seleccionar Preset de Energía
**URL**: `/settings/energy`
**Pre-condición**: Usuario en energy profile

**Pasos**:
1. Navegar a `/settings/energy`
2. Click en preset "Morning Person"

**Resultado esperado**:
- Preset seleccionado se destaca
- Gráfico se actualiza con valores del preset
- Cambio se puede guardar

---

### Prueba 71: Editar Perfil de Energía Manualmente
**URL**: `/settings/energy`
**Pre-condición**: Usuario en energy profile

**Pasos**:
1. Navegar a `/settings/energy`
2. Click en barra de una hora específica
3. Observar cambio de nivel (high→medium→low→high)

**Resultado esperado**:
- Nivel de energía cicla al hacer click
- Color de barra cambia
- Preset cambia a "Custom"

---

### Prueba 72: Guardar Perfil de Energía
**URL**: `/settings/energy`
**Pre-condición**: Cambios realizados en energy profile

**Pasos**:
1. Hacer cambios en perfil
2. Click "Save" o botón de guardar

**Resultado esperado**:
- Cambios se persisten
- Toast de confirmación
- Timeline refleja nuevo perfil

---

### Prueba 73: Volver a Settings desde Energy Profile
**URL**: `/settings/energy`
**Pre-condición**: Usuario en energy profile

**Pasos**:
1. Click en link "Back to Settings"

**Resultado esperado**:
- Navega a `/settings`
- Si hay cambios no guardados, warning

---

## Módulo: Navegación General

### Prueba 74: Navegación por Header
**URL**: Cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Click en cada item del header navigation:
   - Timeline
   - Dashboard
   - Goals
   - Scheduler
   - AI Agent
   - Review

**Resultado esperado**:
- Cada click navega a ruta correcta
- Item activo está destacado

---

### Prueba 75: Menú Móvil
**URL**: Cualquier ruta protegida (viewport móvil)
**Pre-condición**: Usuario autenticado, viewport < 768px

**Pasos**:
1. Reducir viewport a móvil
2. Click en hamburger menu
3. Verificar items de navegación
4. Click en item

**Resultado esperado**:
- Menú se abre
- Items de navegación visibles
- Click navega y cierra menú

---

### Prueba 76: Logo Navega a Timeline
**URL**: Cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Click en logo "Flow Day" en header

**Resultado esperado**:
- Navega a `/timeline`

---

### Prueba 77: Dropdown de Usuario
**URL**: Cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Click en avatar de usuario en header
2. Observar dropdown

**Resultado esperado**:
- Dropdown se abre
- Muestra: Settings link, Sign Out button
- Click fuera cierra dropdown

---

### Prueba 78: Keyboard Shortcuts - Navegación
**URL**: Cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
Probar cada shortcut:
1. Cmd/Ctrl + G → Goals
2. Cmd/Ctrl + D → Dashboard
3. Cmd/Ctrl + T → Timeline
4. Cmd/Ctrl + Shift + S → Scheduler
5. Cmd/Ctrl + Shift + R → Review

**Resultado esperado**:
- Cada shortcut navega a ruta correcta
- Funciona en Mac y Windows

---

### Prueba 79: Keyboard Shortcuts No Activos en Inputs
**URL**: `/agent` o cualquier página con input
**Pre-condición**: Cursor en campo de texto

**Pasos**:
1. Click en input de texto
2. Presionar Cmd/Ctrl + G

**Resultado esperado**:
- NO navega (shortcuts deshabilitados en inputs)
- Permite typing normal

---

## Módulo: Error Handling

### Prueba 80: Error 404 - Ruta No Existente
**URL**: `/ruta-que-no-existe`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a URL que no existe

**Resultado esperado**:
- Se muestra página de error o 404
- Opción de volver a home
- No crash de aplicación

---

### Prueba 81: Error de Red al Cargar Datos
**URL**: `/timeline`
**Pre-condición**: Simular desconexión de red

**Pasos**:
1. Desconectar red
2. Navegar a `/timeline`

**Resultado esperado**:
- Mensaje de error apropiado
- Opción de reintentar
- No crash de aplicación

---

### Prueba 82: Goal No Encontrado
**URL**: `/goals/id-que-no-existe`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/goals/abc123nonexistent`

**Resultado esperado**:
- Mensaje de "Goal not found" o error
- Link para volver a lista de goals
- No crash

---

### Prueba 83: Session Expirada
**URL**: Cualquier ruta protegida
**Pre-condición**: Session expira mientras usuario navega

**Pasos**:
1. Simular expiración de session
2. Intentar acción que requiere auth

**Resultado esperado**:
- Usuario redirigido a sign-in
- Mensaje apropiado
- Datos no se pierden si posible

---

## Módulo: Responsiveness

### Prueba 84: Vista Desktop (1920x1080)
**URL**: Todas las rutas principales
**Pre-condición**: Viewport 1920x1080

**Pasos**:
1. Navegar por todas las rutas principales
2. Verificar layout correcto

**Resultado esperado**:
- Layouts full-width aprovechados
- Grids de múltiples columnas
- Header horizontal completo

---

### Prueba 85: Vista Tablet (768x1024)
**URL**: Todas las rutas principales
**Pre-condición**: Viewport 768x1024

**Pasos**:
1. Navegar por todas las rutas principales
2. Verificar adaptación de layout

**Resultado esperado**:
- Grids reducen columnas
- Scheduler muestra menos días
- Navegación todavía horizontal o colapsada

---

### Prueba 86: Vista Móvil (375x667)
**URL**: Todas las rutas principales
**Pre-condición**: Viewport 375x667

**Pasos**:
1. Navegar por todas las rutas principales
2. Verificar usabilidad móvil

**Resultado esperado**:
- Layout single column
- Hamburger menu visible
- Touch targets suficientemente grandes
- Forms usables
- Scroll funciona correctamente

---

## Módulo: Accesibilidad

### Prueba 87: Navegación por Teclado
**URL**: Todas las rutas
**Pre-condición**: N/A

**Pasos**:
1. Usar Tab para navegar elementos
2. Usar Enter/Space para activar
3. Usar Escape para cerrar modals

**Resultado esperado**:
- Todos los elementos interactivos son focusables
- Focus visible (ring)
- Modals se cierran con Escape

---

### Prueba 88: Contraste de Colores
**URL**: Todas las rutas
**Pre-condición**: N/A

**Pasos**:
1. Revisar contraste de texto/fondo
2. Verificar colores de estado

**Resultado esperado**:
- Texto legible
- Colores de estado distinguibles
- No depender solo de color para info

---

### Prueba 89: Screen Reader Labels
**URL**: Principales páginas
**Pre-condición**: Screen reader activo (opcional)

**Pasos**:
1. Verificar que buttons tienen labels
2. Verificar que inputs tienen labels asociados
3. Verificar que iconos tienen alt text o aria-label

**Resultado esperado**:
- Elementos tienen descripciones apropiadas
- Aria attributes correctos

---

## Módulo: Performance

### Prueba 90: Carga Inicial de Timeline
**URL**: `/timeline`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Hard refresh de `/timeline`
2. Medir tiempo hasta contenido visible

**Resultado esperado**:
- Loading spinner aparece rápido
- Contenido carga en < 3 segundos
- No flash de contenido

---

### Prueba 91: Navegación Entre Páginas
**URL**: Varias rutas
**Pre-condición**: Usuario autenticado, app ya cargada

**Pasos**:
1. Navegar entre Timeline → Dashboard → Goals → Scheduler

**Resultado esperado**:
- Transiciones rápidas (< 500ms)
- No re-renders innecesarios
- Datos cached se reutilizan

---

### Prueba 92: Lista Grande de Goals
**URL**: `/goals`
**Pre-condición**: Usuario con 20+ goals

**Pasos**:
1. Navegar a `/goals`
2. Scroll por lista

**Resultado esperado**:
- Lista renderiza sin lag
- Scroll suave
- No memory leaks

---

---

## Resumen de Pruebas

| Módulo | Cantidad |
|--------|----------|
| Autenticación | 10 |
| Onboarding | 4 |
| Timeline | 6 |
| Dashboard | 3 |
| Goals | 10 |
| Scheduler | 5 |
| AI Agent | 8 |
| Weekly Review | 7 |
| Settings | 15 |
| Energy Profile | 5 |
| Navegación | 6 |
| Error Handling | 4 |
| Responsiveness | 3 |
| Accesibilidad | 3 |
| Performance | 3 |
| **Total** | **92** |

---

## Notas para el Tester

1. **Orden sugerido**: Ejecutar pruebas en orden numérico para cada módulo, empezando por Autenticación.

2. **Dependencias**: Algunas pruebas dependen de datos creados en pruebas anteriores (ej: editar goal requiere goal existente).

3. **Credenciales de prueba**: Usar `test@flowday.dev` / `TestPassword123!` para pruebas consistentes.

4. **Voice Agent**: Requiere micrófono funcional y permisos. Puede requerir HTTPS en algunos navegadores.

5. **Reportar**: Documentar screenshots, console errors, y pasos exactos para cualquier fallo.

6. **Ambiente**: Confirmar que se está probando en el ambiente correcto (desarrollo vs producción).
