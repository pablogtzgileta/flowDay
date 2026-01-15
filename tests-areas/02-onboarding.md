# Módulo: Onboarding

**Pruebas**: 11-14
**Ruta involucrada**: `/onboarding`

---

## Prueba 11: Flujo Completo de Onboarding
**URL**: `/onboarding`
**Pre-condición**: Usuario autenticado, onboarding NO completado

**Pasos**:
1. Verificar que se muestra paso "Welcome"
2. Click "Continue"
3. En "Wake Time": seleccionar hora (ej: 07:00)
4. Click "Continue"
5. En "Sleep Time": seleccionar hora (ej: 23:00)
6. Click "Continue"
7. En "Peak Energy": seleccionar opción (Morning/Afternoon/Evening)
8. Click "Continue"
9. En "Notification Style": seleccionar opción (Minimal/Proactive)
10. Click "Continue"
11. En "Location": (opcional) agregar ubicación o skip
12. Click "Finish"

**Resultado esperado**:
- Cada paso muestra indicador de progreso
- Preferencias se guardan
- Al finalizar, redirige a `/dashboard`
- Onboarding marcado como completado

---

## Prueba 12: Navegación Atrás en Onboarding
**URL**: `/onboarding`
**Pre-condición**: Usuario en paso 3+ de onboarding

**Pasos**:
1. Avanzar hasta paso 3 (Sleep Time)
2. Click botón "Back"
3. Verificar que está en paso 2 (Wake Time)
4. Click "Back" nuevamente
5. Verificar que está en paso 1 (Welcome)

**Resultado esperado**:
- Botón "Back" no visible en paso 1
- Navegación funciona correctamente
- Valores seleccionados se mantienen

---

## Prueba 13: Onboarding - Configurar Ubicación
**URL**: `/onboarding` (paso Location)
**Pre-condición**: Usuario en paso de Location

**Pasos**:
1. Avanzar hasta paso de Location
2. Ingresar dirección de casa
3. Esperar geocodificación (checkmark verde)
4. (Opcional) Ingresar dirección de trabajo
5. Esperar cálculo de tiempo de viaje

**Resultado esperado**:
- Direcciones se geocodifican
- Checkmark verde indica éxito
- Tiempo de viaje se calcula y muestra

---

## Prueba 14: Forzar Onboarding para Usuario Incompleto
**URL**: `/dashboard`
**Pre-condición**: Usuario autenticado, onboarding NO completado

**Pasos**:
1. Intentar navegar a `/dashboard`

**Resultado esperado**:
- Usuario es redirigido a `/onboarding`
- No puede acceder a rutas de app sin completar onboarding
