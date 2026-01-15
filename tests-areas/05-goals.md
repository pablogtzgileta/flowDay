# Módulo: Goals

**Pruebas**: 24-33
**Rutas involucradas**: `/goals`, `/goals/:goalId`

---

## Prueba 24: Visualizar Lista de Goals
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

## Prueba 25: Crear Nuevo Goal
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

## Prueba 26: Crear Goal desde Template
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

## Prueba 27: Ver Detalle de Goal
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

## Prueba 28: Editar Goal Existente
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

## Prueba 29: Archivar Goal
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

## Prueba 30: Reactivar Goal Archivado
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

## Prueba 31: Eliminar Goal
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

## Prueba 32: Cancelar Eliminación de Goal
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

## Prueba 33: Keyboard Shortcut para Nuevo Goal
**URL**: `/goals`
**Pre-condición**: Usuario en página de goals

**Pasos**:
1. Navegar a `/goals`
2. Presionar Cmd+N (Mac) o Ctrl+N (Windows)

**Resultado esperado**:
- Dialog de nuevo goal se abre
- Funcionalidad igual que click en botón
