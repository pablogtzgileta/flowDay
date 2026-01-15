# Módulo: Autenticación

**Pruebas**: 1-10
**Rutas involucradas**: `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`

---

## Prueba 1: Registro de Usuario Nuevo
**URL**: `/sign-up`
**Pre-condición**: Usuario no autenticado, email no registrado

**Pasos**:
1. Navegar a `/sign-up`
2. Ingresar nombre válido (ej: "Test User")
3. Ingresar email válido no registrado (ej: "nuevo@test.com")
4. Ingresar contraseña de 8+ caracteres
5. Confirmar contraseña (debe coincidir)
6. Click en botón "Sign Up"

**Resultado esperado**:
- Usuario es redirigido a `/onboarding`
- No aparecen errores
- El usuario está autenticado

---

## Prueba 2: Registro con Contraseñas que No Coinciden
**URL**: `/sign-up`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-up`
2. Ingresar nombre válido
3. Ingresar email válido
4. Ingresar contraseña "Password123!"
5. Ingresar confirmación diferente "Password456!"
6. Click en botón "Sign Up"

**Resultado esperado**:
- Se muestra mensaje de error "Passwords do not match"
- El formulario NO se envía
- Usuario permanece en `/sign-up`

---

## Prueba 3: Registro con Contraseña Muy Corta
**URL**: `/sign-up`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-up`
2. Ingresar nombre válido
3. Ingresar email válido
4. Ingresar contraseña de menos de 8 caracteres (ej: "1234567")
5. Confirmar la misma contraseña
6. Click en botón "Sign Up"

**Resultado esperado**:
- Se muestra mensaje de error indicando requisito de 8+ caracteres
- El formulario NO se envía

---

## Prueba 4: Inicio de Sesión Exitoso
**URL**: `/sign-in`
**Pre-condición**: Usuario registrado existente

**Pasos**:
1. Navegar a `/sign-in`
2. Ingresar email: `test@flowday.dev`
3. Ingresar contraseña: `TestPassword123!`
4. Click en botón "Sign In"

**Resultado esperado**:
- Usuario es redirigido a `/dashboard` o `/timeline`
- No aparecen errores
- Header muestra avatar del usuario

---

## Prueba 5: Inicio de Sesión con Credenciales Incorrectas
**URL**: `/sign-in`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-in`
2. Ingresar email válido
3. Ingresar contraseña incorrecta
4. Click en botón "Sign In"

**Resultado esperado**:
- Se muestra mensaje de error (toast o inline)
- Usuario permanece en `/sign-in`
- Formulario no se limpia completamente

---

## Prueba 6: Navegación a Forgot Password
**URL**: `/sign-in`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-in`
2. Click en link "Forgot password?"

**Resultado esperado**:
- Usuario es redirigido a `/forgot-password`
- Se muestra formulario de recuperación

---

## Prueba 7: Solicitar Reset de Contraseña
**URL**: `/forgot-password`
**Pre-condición**: Usuario no autenticado, email registrado

**Pasos**:
1. Navegar a `/forgot-password`
2. Ingresar email registrado
3. Click en botón "Send Reset Link"

**Resultado esperado**:
- Se muestra mensaje de confirmación
- Se indica que se envió email
- Link para volver a sign-in visible

---

## Prueba 8: Cerrar Sesión
**URL**: `/settings` o cualquier ruta protegida
**Pre-condición**: Usuario autenticado

**Pasos**:
1. Click en avatar en header
2. Click en "Sign Out" en dropdown

**Resultado esperado**:
- Usuario es redirigido a `/` o `/sign-in`
- Session es terminada
- Rutas protegidas ya no son accesibles

---

## Prueba 9: Protección de Rutas - Acceso No Autorizado
**URL**: `/timeline`
**Pre-condición**: Usuario NO autenticado

**Pasos**:
1. Intentar navegar directamente a `/timeline`

**Resultado esperado**:
- Usuario es redirigido a `/sign-in`
- Parámetro `redirect=/timeline` en URL
- Mensaje de login requerido (opcional)

---

## Prueba 10: Redirección Post-Login
**URL**: `/sign-in?redirect=/goals`
**Pre-condición**: Usuario no autenticado

**Pasos**:
1. Navegar a `/sign-in?redirect=/goals`
2. Completar login exitoso

**Resultado esperado**:
- Usuario es redirigido a `/goals` (no a `/dashboard`)
- Respeta el parámetro redirect
