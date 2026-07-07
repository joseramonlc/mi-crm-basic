# ADR 0001 — Stack tecnológico del CRM Networker MVP

Responde a JOS-5 ("Definir y documentar el stack tecnológico"). Decisión tomada el 2026-07-06.

## Contexto

CRM MVP para networkers, con cuentas de usuario independientes (multi-tenant por fila, sin rol de supervisor), soporte móvil + desktop, motor de seguimiento automático y prioridad en velocidad de desarrollo sobre sobre-ingeniería (ver JOS-5 para los criterios completos).

## Decisión

| Área | Elección | Justificación |
| --- | --- | --- |
| Frontend | **Next.js 16** (App Router, TypeScript, `src/`) | Un solo framework para móvil/desktop responsive, SSR/SSG donde conviene, y el runtime que mejor integra con Convex. |
| Backend / BaaS | **Convex** | Backend reactivo (queries se re-ejecutan solas al cambiar los datos — encaja con Actividad Diaria/Pipeline en vivo), funciones TypeScript de extremo a extremo, sin servidor propio que mantener. |
| Base de datos | **Convex** (documentos + índices) | Es la misma pieza que el backend; sin capa ORM/SQL separada que gestionar. Esquema en `convex/schema.ts`. |
| Autenticación | **Convex Auth** (`@convex-dev/auth`, proveedor `Password`) | Nativa de Convex — el aislamiento por `usuarioId` se hace directamente en cada query/mutation sin servicio externo ni JWT de terceros que verificar a mano. Encaja con el criterio de JOS-5 de aislar datos por cuenta sin infraestructura separada. |
| Notificaciones/recordatorios | Pendiente (JOS-8 sin cerrar) | La Actividad Diaria ya deriva "vencidos/hoy" de `fechaProximoSeguimiento` vía query; push/email queda para cuando JOS-8 defina las reglas y se decida si hace falta un canal fuera de la propia app. |
| Hosting | **Railway** (frontend Next.js) + **Convex Cloud** (backend/DB) | Dos despliegues independientes: `railway up`/CI para el frontend, `npx convex deploy` para las funciones y el esquema. Ver README para el detalle. |
| ORM / cliente de datos | Ninguno — funciones de Convex (`ctx.db.query/insert/patch`) | Convex no usa SQL ni ORM; el "cliente" es el propio SDK generado en `convex/_generated`. |
| Iconos / UI | `lucide-react` + componentes propios en `src/components/ui` | Portados 1:1 desde el design system `Evolución Líder · CRM Networker` (ver `Design/`). |

## Aislamiento entre cuentas

Cada query/mutation de `prospectos`/`interacciones` obtiene el usuario autenticado con `getAuthUserId(ctx)` y filtra por `usuarioId` vía índice (`by_usuario`); ningún endpoint acepta un `usuarioId` como parámetro del cliente. La entidad Usuario de JOS-7 se cubre con la tabla `users` que aporta Convex Auth (ver comentario en `convex/schema.ts`) — no se ha creado una tabla `usuarios` separada, ya que sería redundante con la que ya trae Convex Auth.

## No decidido todavía

- **JOS-8** (reglas exactas del motor de seguimiento por etapa): `convex/seguimiento.ts` implementa un valor por defecto marcado como `TODO(JOS-8)`, no una decisión de producto cerrada.
- Envío de notificaciones push/email reales.
