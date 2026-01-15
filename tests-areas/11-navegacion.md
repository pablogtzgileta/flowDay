# Módulo: Navegación General

**Pruebas**: 74-79
**Rutas involucradas**: Todas las rutas protegidas

---

## Prueba 74: Navegación por Header
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

## Prueba 75: Menú Móvil
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

## Prueba 76: Logo Navega a Timeline
**URL**: Cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Click en logo "Flow Day" en header

**Resultado esperado**:
- Navega a `/timeline`

---

## Prueba 77: Dropdown de Usuario
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

## Prueba 78: Keyboard Shortcuts - Navegación
**URL**: Cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
Probar cada shortcut:
1. Cmd/Ctrl + G -> Goals
2. Cmd/Ctrl + D -> Dashboard
3. Cmd/Ctrl + T -> Timeline
4. Cmd/Ctrl + Shift + S -> Scheduler
5. Cmd/Ctrl + Shift + R -> Review

**Resultado esperado**:
- Cada shortcut navega a ruta correcta
- Funciona en Mac y Windows

---

## Prueba 79: Keyboard Shortcuts No Activos en Inputs
**URL**: `/agent` o cualquier página con input
**Pre-condición**: Cursor en campo de texto

**Pasos**:
1. Click en input de texto
2. Presionar Cmd/Ctrl + G

**Resultado esperado**:
- NO navega (shortcuts deshabilitados en inputs)
- Permite typing normal
