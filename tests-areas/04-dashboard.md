# Módulo: Dashboard

**Pruebas**: 21-23
**Ruta involucrada**: `/dashboard`

---

## Prueba 21: Visualizar Dashboard
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

## Prueba 22: Dashboard - Progreso con Bloques Completados
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

## Prueba 23: Dashboard - Estado Vacío
**URL**: `/dashboard`
**Pre-condición**: Usuario sin bloques para hoy

**Pasos**:
1. Navegar a `/dashboard`
2. Observar estado vacío

**Resultado esperado**:
- Mensaje indicando que no hay schedule
- CTA para ir a Scheduler
- No se muestran errores
