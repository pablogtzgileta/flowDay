# Módulo: Energy Profile

**Pruebas**: 69-73
**Ruta involucrada**: `/settings/energy`

---

## Prueba 69: Visualizar Energy Profile Editor
**URL**: `/settings/energy`
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Navegar a `/settings/energy`
2. Observar editor

**Resultado esperado**:
- Gráfico de 24 horas visible
- Presets disponibles (Morning Person, Night Owl, Steady)
- Niveles de energía codificados por color

---

## Prueba 70: Seleccionar Preset de Energía
**URL**: `/settings/energy`
**Pre-condición**: Usuario en energy profile

**Pasos**:
1. Navegar a `/settings/energy`
2. Click en preset "Morning Person"

**Resultado esperado**:
- Preset seleccionado se destaca
- Gráfico se actualiza con valores del preset
- Cambio se puede guardar

---

## Prueba 71: Editar Perfil de Energía Manualmente
**URL**: `/settings/energy`
**Pre-condición**: Usuario en energy profile

**Pasos**:
1. Navegar a `/settings/energy`
2. Click en barra de una hora específica
3. Observar cambio de nivel (high->medium->low->high)

**Resultado esperado**:
- Nivel de energía cicla al hacer click
- Color de barra cambia
- Preset cambia a "Custom"

---

## Prueba 72: Guardar Perfil de Energía
**URL**: `/settings/energy`
**Pre-condición**: Cambios realizados en energy profile

**Pasos**:
1. Hacer cambios en perfil
2. Click "Save" o botón de guardar

**Resultado esperado**:
- Cambios se persisten
- Toast de confirmación
- Timeline refleja nuevo perfil

---

## Prueba 73: Volver a Settings desde Energy Profile
**URL**: `/settings/energy`
**Pre-condición**: Usuario en energy profile

**Pasos**:
1. Click en link "Back to Settings"

**Resultado esperado**:
- Navega a `/settings`
- Si hay cambios no guardados, warning
