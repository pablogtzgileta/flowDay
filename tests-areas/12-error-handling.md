# Módulo: Error Handling

**Pruebas**: 80-83
**Rutas involucradas**: Varias

---

## Prueba 80: Error 404 - Ruta No Existente
**URL**: `/ruta-que-no-existe`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a URL que no existe

**Resultado esperado**:
- Se muestra página de error o 404
- Opción de volver a home
- No crash de aplicación

---

## Prueba 81: Error de Red al Cargar Datos
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

## Prueba 82: Goal No Encontrado
**URL**: `/goals/id-que-no-existe`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/goals/abc123nonexistent`

**Resultado esperado**:
- Mensaje de "Goal not found" o error
- Link para volver a lista de goals
- No crash

---

## Prueba 83: Session Expirada
**URL**: Cualquier ruta protegida
**Pre-condición**: Session expira mientras usuario navega

**Pasos**:
1. Simular expiración de session
2. Intentar acción que requiere auth

**Resultado esperado**:
- Usuario redirigido a sign-in
- Mensaje apropiado
- Datos no se pierden si posible
