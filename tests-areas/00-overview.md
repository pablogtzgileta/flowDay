# Flow Day - Plan de Pruebas E2E

## Resumen de la Aplicación

**Flow Day** es una aplicación de productividad personal potenciada por IA que ayuda a los usuarios a planificar su día de manera inteligente, considerando sus niveles de energía, metas y rutinas.

---

## Arquitectura Técnica

### Stack Tecnológico
| Componente | Tecnología |
|------------|------------|
| **Frontend** | React 18 + TypeScript |
| **Routing** | TanStack Router (file-based) |
| **Styling** | Tailwind CSS |
| **Backend** | Convex (serverless) |
| **Autenticación** | Better Auth + Convex |
| **State Management** | Zustand + Convex Queries |
| **Voice AI** | ElevenLabs WebRTC |
| **Build Tool** | Vite + Bun |

### URLs de la Aplicación
- **Desarrollo**: `http://localhost:3001` o `http://localhost:5173`
- **Backend Convex**: `https://fearless-iguana-970.convex.cloud`

### Credenciales de Prueba
```
Email: test@flowday.dev
Password: TestPassword123!
Name: Test User
```

---

## Estructura de Rutas

### Rutas Públicas (sin autenticación)
| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/sign-in` | Inicio de sesión |
| `/sign-up` | Registro |
| `/forgot-password` | Solicitar reset de contraseña |
| `/reset-password?token=...` | Completar reset de contraseña |

### Rutas Protegidas (requieren autenticación)
| Ruta | Descripción |
|------|-------------|
| `/onboarding` | Onboarding de 6 pasos |
| `/timeline` | Vista principal del día |
| `/dashboard` | Resumen del progreso |
| `/goals` | Lista de metas |
| `/goals/:goalId` | Detalle de meta |
| `/scheduler` | Calendario semanal |
| `/agent` | Agente de IA (texto/voz) |
| `/review` | Análisis semanal |
| `/settings` | Configuración |
| `/settings/energy` | Perfil de energía |

---

## Índice de Módulos de Pruebas

| # | Módulo | Archivo | Pruebas |
|---|--------|---------|---------|
| 1 | [Autenticación](./01-autenticacion.md) | `01-autenticacion.md` | 1-10 |
| 2 | [Onboarding](./02-onboarding.md) | `02-onboarding.md` | 11-14 |
| 3 | [Timeline](./03-timeline.md) | `03-timeline.md` | 15-20 |
| 4 | [Dashboard](./04-dashboard.md) | `04-dashboard.md` | 21-23 |
| 5 | [Goals](./05-goals.md) | `05-goals.md` | 24-33 |
| 6 | [Scheduler](./06-scheduler.md) | `06-scheduler.md` | 34-38 |
| 7 | [AI Agent](./07-ai-agent.md) | `07-ai-agent.md` | 39-46 |
| 8 | [Weekly Review](./08-weekly-review.md) | `08-weekly-review.md` | 47-53 |
| 9 | [Settings](./09-settings.md) | `09-settings.md` | 54-68 |
| 10 | [Energy Profile](./10-energy-profile.md) | `10-energy-profile.md` | 69-73 |
| 11 | [Navegación](./11-navegacion.md) | `11-navegacion.md` | 74-79 |
| 12 | [Error Handling](./12-error-handling.md) | `12-error-handling.md` | 80-83 |
| 13 | [Responsiveness](./13-responsiveness.md) | `13-responsiveness.md` | 84-86 |
| 14 | [Accesibilidad](./14-accesibilidad.md) | `14-accesibilidad.md` | 87-89 |
| 15 | [Performance](./15-performance.md) | `15-performance.md` | 90-92 |

**Total: 92 Pruebas**

---

## Flujos Principales

### Flujo de Autenticación
```
Landing (/) → Sign Up → Onboarding (6 pasos) → Dashboard
                 ↓
           Sign In → Dashboard/Timeline
                 ↓
           Forgot Password → Email → Reset Password → Sign In
```

### Flujo de Onboarding
```
1. Welcome → 2. Wake Time → 3. Sleep Time → 4. Peak Energy → 5. Notifications → 6. Location → Dashboard
```

### Flujo de Goals
```
Goals List → Create Goal (dialog) → Goal Created
                                         ↓
Goal Detail → Edit/Archive/Delete → Updated List
```

### Flujo del Agente
```
Agent Page → Mode Selection (Text/Voice)
                 ↓
           Text: Type message → Send → AI Response
                 ↓
           Voice: Connect → Speak → AI Response (audio)
```

---

## Convenciones de Pruebas

Cada prueba incluye:
- **URL**: Ruta donde inicia la prueba
- **Pre-condición**: Estado necesario antes de ejecutar
- **Pasos**: Acciones a ejecutar en orden
- **Resultado esperado**: Comportamiento esperado al completar

---

## Notas para el Tester

1. **Orden sugerido**: Ejecutar pruebas en orden numérico para cada módulo, empezando por Autenticación.

2. **Dependencias**: Algunas pruebas dependen de datos creados en pruebas anteriores.

3. **Credenciales de prueba**: Usar `test@flowday.dev` / `TestPassword123!` para pruebas consistentes.

4. **Voice Agent**: Requiere micrófono funcional y permisos. Puede requerir HTTPS.

5. **Reportar**: Documentar screenshots, console errors, y pasos exactos para cualquier fallo.

6. **Ambiente**: Confirmar que se está probando en el ambiente correcto.
