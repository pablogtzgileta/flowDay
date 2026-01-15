# Módulo: Accesibilidad

**Pruebas**: 87-89
**Rutas involucradas**: Todas las rutas

---

## Prueba 87: Navegación por Teclado
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

## Prueba 88: Contraste de Colores
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

## Prueba 89: Screen Reader Labels
**URL**: Principales páginas
**Pre-condición**: Screen reader activo (opcional)

**Pasos**:
1. Verificar que buttons tienen labels
2. Verificar que inputs tienen labels asociados
3. Verificar que iconos tienen alt text o aria-label

**Resultado esperado**:
- Elementos tienen descripciones apropiadas
- Aria attributes correctos
