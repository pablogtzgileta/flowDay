# Módulo: Performance

**Pruebas**: 90-92
**Rutas involucradas**: Varias

---

## Prueba 90: Carga Inicial de Timeline
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

## Prueba 91: Navegación Entre Páginas
**URL**: Varias rutas
**Pre-condición**: Usuario autenticado, app ya cargada

**Pasos**:
1. Navegar entre Timeline -> Dashboard -> Goals -> Scheduler

**Resultado esperado**:
- Transiciones rápidas (< 500ms)
- No re-renders innecesarios
- Datos cached se reutilizan

---

## Prueba 92: Lista Grande de Goals
**URL**: `/goals`
**Pre-condición**: Usuario con 20+ goals

**Pasos**:
1. Navegar a `/goals`
2. Scroll por lista

**Resultado esperado**:
- Lista renderiza sin lag
- Scroll suave
- No memory leaks
