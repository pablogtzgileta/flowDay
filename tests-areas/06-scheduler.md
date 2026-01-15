# Módulo: Scheduler

**Pruebas**: 34-38
**Ruta involucrada**: `/scheduler`

---

## Prueba 34: Visualizar Scheduler Semanal
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

## Prueba 35: Navegar a Semana Siguiente
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

## Prueba 36: Navegar a Semana Anterior
**URL**: `/scheduler`
**Pre-condición**: Usuario en scheduler

**Pasos**:
1. Navegar a `/scheduler`
2. Click en flecha "Previous" o "<"

**Resultado esperado**:
- Vista cambia a semana anterior
- Fechas se actualizan correctamente

---

## Prueba 37: Volver a Semana Actual
**URL**: `/scheduler`
**Pre-condición**: Usuario en otra semana

**Pasos**:
1. Navegar a semana diferente a la actual
2. Click en botón "Today"

**Resultado esperado**:
- Vista vuelve a semana actual
- Día actual está destacado o visible

---

## Prueba 38: Generar Schedule para un Día
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
