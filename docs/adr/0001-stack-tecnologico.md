# ADR 0001 — Stack tecnológico del CRM Networker MVP

- **Estado:** Aceptado (GO de auditoría a la rev. 3, 2026-07-13).
- **Responde a:** JOS-5 ("Definir y documentar el stack tecnológico").
- **Historia:** decisión original del 2026-07-06 (ADR retirado en la limpieza `7b629ff`, recuperable con `git show 6ef49f5:docs/adr/0001-stack-tecnologico.md`); esta versión la actualiza con lo validado por la rebanada JOS-22 y el estado 2026-07-13 de la documentación de Convex y Clerk.

## Contexto

CRM MVP para networkers con cuentas de usuario independientes (multi-tenant por fila, sin rol supervisor con acceso cruzado), soporte móvil + desktop responsive, motor de seguimiento automático y prioridad de velocidad de desarrollo sobre sobre-ingeniería (criterios completos en JOS-5).

La rebanada vertical JOS-22 (GO de auditoría 2026-07-12) ya validó en la práctica gran parte del stack: este ADR formaliza esas elecciones y cierra la única decisión que quedaba abierta (autenticación).

## Decisiones

| Área | Elección | Justificación |
| --- | --- | --- |
| Frontend | **Next.js 16.2.10** (App Router, TypeScript 5, `src/`), React 19.2.4 | Un framework para móvil/desktop responsive; validado por JOS-22 (build + 67 tests en verde). Next 16 tiene cambios de contrato (p. ej. `unstable_retry` en error boundaries) — la guía local vive en `node_modules/next/dist/docs/`. |
| Estilos / UI | **Tailwind CSS 4** + componentes propios en `src/components/ui` + `lucide-react` | Portados del design system "Evolución Líder · CRM Networker" (`Design/`). Ya en uso. |
| Backend / BaaS | **Convex 1.42.1** | Backend reactivo (las queries se re-ejecutan solas al cambiar los datos — encaja con Actividad Diaria/Pipeline en vivo), funciones TypeScript de extremo a extremo, sin servidor propio. Validado por la query `actividadDiaria` + `convex-test`. |
| Base de datos | **Convex** (documentos + índices; schema en `convex/schema.ts`) | Misma pieza que el backend, sin ORM/SQL aparte. Índices por usuario (`by_usuario`, `by_usuario_seguimiento`, `by_usuario_ultimo_contacto`) ya en uso. |
| Autenticación | **Clerk** (integración oficial Convex + Next.js), en lugar del Convex Auth del ADR original | Ver "Decisión de autenticación" — único punto donde esta versión se aparta del ADR de 2026-07-06. |
| Notificaciones / recordatorios | **In-app derivadas de datos** en el MVP (la Actividad Diaria ya deriva "hoy/vencidos" de `fechaProximoSeguimiento`); sin push/email | Si JOS-8/M9 exigen recordatorios activos, el mecanismo natural son las scheduled functions/crons de Convex. Decisión de canal externo aplazada. |
| Hosting / despliegue | **Railway** (web Next.js) + **Convex Cloud** (backend/DB), región de producción **`aws-eu-west-1`** | Ver "Regiones y despliegues". Dos despliegues independientes: CI/`railway up` para la web, `npx convex deploy` para funciones y schema. |
| ORM / cliente de datos | **Ninguno** — SDK generado de Convex (`ctx.db.query/insert/patch`, validadores de `convex/values`) | Convex no usa SQL ni ORM; el cliente es `convex/_generated`. |
| Testing | **Vitest 4.1.10 + convex-test 0.0.54 + Testing Library 16.3.2** (jsdom / edge-runtime) | Ya en uso con los 67 tests de JOS-22; se adopta como estándar del proyecto. |

## Decisión de autenticación

**Elección: Clerk** con proveedor email+contraseña (registro/login propios, flujos personalizados sobre la UI de Fase 0), integrado vía la integración oficial Convex⇄Clerk (`ctx.auth`).

**Por qué se revisa la elección del ADR original (Convex Auth):**

1. **Estado del producto**: la documentación oficial de Convex (verificada 2026-07-13) marca Convex Auth como **beta** ("isn't complete and may change in backward-incompatible ways"), con soporte Next.js "under active development", y **recomienda proveedores externos para producción** (Clerk el primero, "great Next.js support").
2. **Plan de contingencia Supabase**: Convex Auth no ofrece una ruta oficial y garantizada para trasladar credenciales a Supabase; previsiblemente exigiría una migración especializada o restablecer contraseñas. Mantener Clerk permite conservar cuentas y credenciales mediante la integración oficial de autenticación de terceros de Supabase (supabase.com/docs/guides/auth/third-party/clerk).
3. **Aislamiento equivalente y verificable**: ver "Aislamiento entre cuentas".

**Coste (verificado 2026-07-13 en clerk.com/pricing):** plan Hobby gratuito hasta **50.000 MRU** (monthly retained users — solo cuentan usuarios que vuelven pasadas 24 h del alta) **por aplicación**; plan Pro a $25/mes, o $20/mes con facturación anual. Precio y condiciones sujetos a revisión antes de producción.

**Contras asumidos:** dependencia de un servicio externo; las pantallas Login/Registro de Fase 0 (JOS-64) deben montarse sobre los flujos personalizados de Clerk manteniendo la apariencia propia (soportado oficialmente — custom flows email+password — pero algo más de trabajo que formularios 100% caseros).

**Alternativa considerada y descartada:** Convex Auth (`@convex-dev/auth`, proveedor Password). Ya se cableó una vez con éxito en este repo antes del revert de andamiaje. Riesgos que motivan el descarte: beta + posible fricción con Next 16 + credenciales no portables oficialmente.

## Aislamiento entre cuentas (clave de tenant)

**`usuarioId` será `identity.tokenIdentifier`, obtenido exclusivamente mediante `ctx.auth.getUserIdentity()`. Si no existe identidad, la función abortará. Nunca se aceptará desde argumentos del cliente.**

`tokenIdentifier` combina sujeto y emisor, lo que garantiza unicidad entre proveedores (docs.convex.dev/auth/functions-auth) y es el campo usado en el ejemplo oficial de almacenamiento de usuarios de Convex (docs.convex.dev/auth/database-auth). Cada query/mutation de `prospectos`/`interacciones` filtrará por ese `usuarioId` vía índice (`by_usuario*`).

~~**Excepción temporal documentada**: hasta que se implemente la autenticación, el código usa el `usuarioId` provisional `dev-user` con guardas `APP_ENV=development`; esa excepción se elimina en la incidencia de implementación de auth (ver Consecuencias).~~ **Resuelta en JOS-66 (bocado B, 2026-07-21)**: `convex/lib/usuario.ts` deriva el tenant de `ctx.auth.getUserIdentity()`, no queda ningún `dev-user` ni guarda `APP_ENV` en las funciones de producto, y el aislamiento entre dos sesiones está cubierto por tests. La única guarda `APP_ENV` que sobrevive es la del seed de desarrollo, que no forma parte del producto.

## Regiones y despliegues

- **Región de producción (objetivo): `aws-eu-west-1` (Dublín)** — identificador oficial según docs.convex.dev/production/regions. El deployment de producción se creará en esa región dentro de JOS-32. Nota operativa: **un deployment de Convex no puede cambiar de región** una vez creado; si se errara la región habría que crear otro deployment y migrar datos.
- **Deployment dev existente**: `adamant-mockingbird-816`, verificado el 2026-07-13 — el CLI responde y su dominio es `adamant-mockingbird-816.eu-west-1.convex.cloud`, lo que evidencia que ya está alojado en la región `aws-eu-west-1`.
- **Railway (web)**: verificado el 2026-07-13 vía CLI — sesión autenticada, proyecto "Mi CRM Basic" enlazado, servicio `mi-crm-basic` conectado al repo `joseramonlc/mi-crm-basic`. Sin deployment activo (el de la landing antigua se retiró deliberadamente con `railway down` el 2026-07-13). El primer despliegue real de la web se hará en JOS-32.

## Plan de contingencia (documentado, NO ejecutado)

Posible migración futura Convex→Supabase si el producto se abre a más usuarios y suben las exigencias de seguridad. Preparación barata identificada para su momento (no ahora): capa fina de hooks de acceso a datos (`useProspectos()`, `useCrearProspecto()`…) en lugar de `useQuery`/`useMutation` directos en la UI. Se introducirá como refactor de bajo coste cuando existan más llamadas, no antes (lección de los dos reverts por andamiaje prematuro).

## Consecuencias / acciones derivadas del ADR

1. ~~**Crear la incidencia de implementación de auth**~~ — **hecho**: JOS-66, milestone "Autenticación y Cuentas", implementada en dos bocados (A: Clerk sobre la UI propia; B: `identity.tokenIdentifier` y retirada de las guardas dev). Queda pendiente de esa cadena solo el reset de contraseña, en incidencia propia previa a JOS-32.
2. **Reconciliar M1 con lo ya construido**, incidencia a incidencia: JOS-6 (repo/entorno: hecho de facto), JOS-7 (schema: `prospectos` hecho, falta `interacciones`), JOS-8 (reglas de seguimiento: config por defecto marcada TODO(JOS-8), decisión de producto pendiente), JOS-9 (BD: deployment dev operativo; producción pendiente en JOS-32). Anotar en cada una, no rehacer.
3. ~~Borrar las variables huérfanas de Convex Auth del deployment dev (JWKS, JWT_PRIVATE_KEY, SITE_URL)~~ — **hecho** en JOS-66; `npx convex env list` (2026-07-21) solo devuelve `ALLOW_SEED`, `APP_ENV` y `CLERK_JWT_ISSUER_DOMAIN`.
4. **Migración de identidades al pasar a producción (JOS-32)**: el `tokenIdentifier` combina emisor y sujeto, así que la instancia de producción de Clerk emitirá identificadores distintos de los de la instancia dev. Los datos creados en desarrollo no serán visibles desde producción — irrelevante para los datos de prueba actuales, pero debe decidirse antes de abrir el CRM a usuarios reales.

## No decidido todavía

- JOS-8: reglas exactas del motor de seguimiento por etapa (la config actual es un valor por defecto, no una decisión de producto).
- Canal real de notificaciones push/email (post-MVP salvo que M9 diga lo contrario).
