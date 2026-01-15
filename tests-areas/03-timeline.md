# Módulo: Timeline

**Pruebas**: 15-20
**Ruta involucrada**: `/timeline`

---

## Prueba 15: Visualizar Timeline del Día
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

## Prueba 16: Cambiar Entre Today y Tomorrow
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

## Prueba 17: Marcar Bloque como Completado
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

## Prueba 18: Saltar (Skip) un Bloque
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

## Prueba 19: Estado Vacío de Timeline
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

## Prueba 20: Visualizar Energy Zone Indicator
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
