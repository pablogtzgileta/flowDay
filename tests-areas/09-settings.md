# Módulo: Settings

**Pruebas**: 54-68
**Ruta involucrada**: `/settings`

---

## Prueba 54: Visualizar Settings
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

## Prueba 55: Cambiar Wake Time
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

## Prueba 56: Cambiar Sleep Time
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

## Prueba 57: Cambiar Peak Energy Window
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

## Prueba 58: Cambiar Notification Style
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

## Prueba 59: Detectar Cambios No Guardados
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

## Prueba 60: Activar Lazy Mode
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

## Prueba 61: Configurar Duración de Lazy Mode
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

## Prueba 62: Desactivar Lazy Mode
**URL**: `/settings`
**Pre-condición**: Lazy mode activado

**Pasos**:
1. Con Lazy Mode activo
2. Desactivar toggle

**Resultado esperado**:
- Toggle cambia a OFF
- Opciones de duración desaparecen

---

## Prueba 63: Cambiar Rollover Behavior
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

## Prueba 64: Agregar Nueva Ubicación
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

## Prueba 65: Editar Ubicación Existente
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

## Prueba 66: Eliminar Ubicación
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

## Prueba 67: Marcar Ubicación como Default
**URL**: `/settings`
**Pre-condición**: Múltiples ubicaciones existen

**Pasos**:
1. En Location Manager
2. Marcar ubicación como default/home

**Resultado esperado**:
- Ubicación marcada como default
- Icono de home visible

---

## Prueba 68: Navegar a Energy Profile
**URL**: `/settings`
**Pre-condición**: Usuario en settings

**Pasos**:
1. Navegar a `/settings`
2. Click en card "Energy Profile"

**Resultado esperado**:
- Navega a `/settings/energy`
- Editor de perfil de energía visible
