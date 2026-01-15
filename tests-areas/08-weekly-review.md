# Módulo: Weekly Review

**Pruebas**: 47-53
**Ruta involucrada**: `/review`

---

## Prueba 47: Visualizar Weekly Review
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

## Prueba 48: Navegar a Semana Anterior en Review
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

## Prueba 49: Ver Goal Progress en Review
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

## Prueba 50: Ver Insights
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

## Prueba 51: Aplicar Sugerencia
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

## Prueba 52: Descartar Sugerencia
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

## Prueba 53: Review - Estado Vacío
**URL**: `/review`
**Pre-condición**: Semana sin actividad

**Pasos**:
1. Navegar a `/review`
2. Ir a semana sin bloques

**Resultado esperado**:
- Mensaje de estado vacío
- No se muestran errores
- Navegación a otras semanas funciona
