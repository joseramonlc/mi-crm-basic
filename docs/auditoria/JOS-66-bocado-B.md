# Auditoría — JOS-66 · Bocado B: aislamiento multi-tenant en Convex

| | |
|---|---|
| **Issue** | [JOS-66 · Implementar autenticación y cuentas de usuario (Clerk)](https://linear.app/jose-lumbreras/issue/JOS-66/implementar-autenticacion-y-cuentas-de-usuario-clerk) |
| **Milestone** | Autenticación y Cuentas (proyecto CRM-MVP) |
| **Rama** | `joseramonlc/jos-66-bocado-b-tenant` |
| **Estado del código** | En árbol de trabajo, **sin commitear** (aún no hay commit ni PR de este bocado) |
| **Fecha del documento** | 2026-07-23 |
| **Preparado para** | Auditoría (el veredicto GO/NO-GO lo emite el departamento de auditoría, no el autor) |

> Este documento **describe** el cambio para su auditoría. No es un veredicto. Los apartados 7–8 separan lo que son **datos observados** de lo que son **puntos a criterio de auditoría**.

---

## 1. Propósito y alcance

Bocado B convierte el backend de Convex, que hasta ahora resolvía siempre a un **usuario provisional de desarrollo** (`dev-user`), en un backend con **aislamiento real entre cuentas**: cada query y mutation deriva su `usuarioId` de la sesión autenticada y solo ve/escribe datos de ese tenant.

Es el segundo de los dos bocados de JOS-66:

- **Bocado A** (ya commiteado, PR #1): Clerk sobre la UI propia — pantallas de login/registro, `ClerkProvider`, middleware, integración JWT Clerk⇄Convex.
- **Bocado B** (este documento): sustitución del `dev-user` por `identity.tokenIdentifier` y retirada de las guardas de desarrollo.

**Alcance del diff:** 11 archivos, todo **backend Convex + documentación**. No hay cambios en `src/` (la parte de frontend/auth se cerró en el bocado A).

```
 README.md                          | 13 +++-
 docs/adr/0001-stack-tecnologico.md |  7 +--
 convex/schema.ts                   |  6 +--
 convex/lib/constants.ts            |  8 ----
 convex/lib/errores.ts              | 15 +++--
 convex/lib/usuario.ts              | 23 +++------
 convex/seed.ts                     | 26 +++++----
 convex/seed.test.ts                | 32 +++++++++-
 convex/prospectos.test.ts          | 29 +++++-----
 convex/prospectos.api.test.ts      | 92 ++++++++++++++++++++++++++-----
 convex/interacciones.test.ts       | 91 +++++++++++++++++++++++++-----
 11 files changed, 266 insertions(+), 76 deletions(-)
```

---

## 2. Contexto previo

- La elección de Clerk y la clave de aislamiento (`identity.tokenIdentifier`) están decididas y auditadas en `docs/adr/0001-stack-tecnologico.md` (ADR 0001, derivado de JOS-5).
- Antes de este bocado, `requireUsuario()` abortaba fuera de `APP_ENV=development` y devolvía la constante `DEV_USUARIO_ID = "dev-user"`. Era deuda documentada de la rebanada JOS-22, con la **firma de la función ya fijada como definitiva** en auditoría previa: bocado B cambia **solo el cuerpo**, no la firma ni los llamadores.

---

## 3. Resumen del cambio

1. **Derivación del tenant desde la sesión.** `requireUsuario(ctx)` obtiene la identidad con `ctx.auth.getUserIdentity()` y devuelve `identity.tokenIdentifier`. Sin identidad, lanza `UNAUTHENTICATED` y **aborta antes de tocar la base**.
2. **Eliminación del `dev-user`.** Se borra la constante `DEV_USUARIO_ID`; no queda ninguna referencia en el código.
3. **Nueva capa de error `UNAUTHENTICATED`.** El contrato de errores de la API pasa de 3 a 4 capas.
4. **Seed adaptado.** La mutation interna de datos de prueba recibe ahora el `usuarioId` por argumento (es la **única** función que lo recibe así, justificado en el §8).
5. **Documentación al día.** `schema.ts`, `README.md` y el ADR 0001 se actualizan para reflejar que el aislamiento ya es real.

---

## 4. Cambios archivo por archivo

### `convex/lib/usuario.ts` — núcleo del cambio
Único punto de obtención del tenant. El cuerpo pasa de la guarda `APP_ENV`/`dev-user` a:

```ts
export async function requireUsuario(ctx: Pick<QueryCtx, "auth">): Promise<string> {
  const identidad = await ctx.auth.getUserIdentity();
  if (identidad === null) {
    throw unauthenticated();
  }
  return identidad.tokenIdentifier;
}
```

La firma (`async`, `Pick<QueryCtx, "auth">`, `MutationCtx` estructuralmente compatible) ya era la definitiva; los 8 llamadores no cambian.

### `convex/lib/errores.ts` — contrato de errores
Añade `unauthenticated(message = "Se requiere sesión")` → `ConvexError({ code: "UNAUTHENTICATED", … })`. Mensaje genérico a propósito: no distingue sesión ausente de expirada. El contrato queda en 4 capas: (1) validador de `args` de Convex, (2) **UNAUTHENTICATED**, (3) VALIDATION_ERROR de negocio, (4) NOT_FOUND opaco.

### `convex/lib/constants.ts`
Elimina `DEV_USUARIO_ID`. Sin otros efectos.

### `convex/schema.ts`
Solo comentario de documentación: `usuarioId` pasa a describirse como el `identity.tokenIdentifier` de la sesión, derivado en servidor, **clave de aislamiento y prefijo de todos los índices** `by_usuario*`.

### `convex/seed.ts`
- Nuevo argumento `usuarioId: v.string()`, validado con `textoObligatorio(...)`.
- El borrado atómico previo y todas las inserciones usan ese `usuarioId` (antes `DEV_USUARIO_ID`).
- Se mantiene `internalMutation` + doble guarda de entorno: `APP_ENV=development` **y** `ALLOW_SEED=true`.

### `convex/prospectos.ts` / `convex/interacciones.ts`
No aparecen en el diff porque **ya** llamaban a `requireUsuario(ctx)` (firma estable). El efecto del bocado es que ese llamado ahora devuelve la identidad real. Llamadores: `actividadDiaria`, `listar`, `obtener`, `crear`, `actualizar`, `cambiarEtapa` (prospectos) y `crear`, `listarPorProspecto` (interacciones).

### `README.md` y `docs/adr/0001-stack-tecnologico.md`
Reflejan el estado resuelto: aislamiento real, sin `dev-user` ni guardas `APP_ENV` en producto; instrucciones de seed con `usuarioId`; y las acciones derivadas del ADR marcadas como hechas (incl. borrado de variables huérfanas de Convex Auth) más una nueva nota (§migración de identidades dev→prod).

### `convex/auth.config.ts` (contexto, **sin cambios** en este bocado)
Proveedor de identidad de Convex: `domain = CLERK_JWT_ISSUER_DOMAIN` (variable del deployment), `applicationID = "convex"`. Es la pieza que hace que `ctx.auth.getUserIdentity()` reciba la identidad de Clerk. Vino del bocado A.

---

## 5. Cómo se garantiza el aislamiento (lo relevante para seguridad)

1. **El tenant se deriva SIEMPRE en servidor** desde `ctx.auth`; **nunca** se acepta `usuarioId` desde los argumentos del cliente. Un `usuarioId` extra en los args lo rechaza el validador de Convex antes del handler (capa 1).
2. **Sin identidad → aborta** con `UNAUTHENTICATED` antes de leer o escribir.
3. **Todas las lecturas van por índice prefijado por el tenant** (`withIndex("by_usuario…", q => q.eq("usuarioId", usuarioId))`): un documento de otro tenant no entra en el resultado.
4. **Acceso cruzado por id → `NOT_FOUND` opaco**: si se pasa el id de un documento de otro tenant, la respuesta no revela si existe.
5. **`seed` es la única excepción** a la regla «tenant por sesión» y está contenida (ver §8).

### Cobertura por los criterios de aceptación de JOS-66

| Criterio de aceptación (JOS-66) | Cubierto por bocado B |
|---|---|
| Toda query/mutation filtra por el `usuarioId` autenticado; sin identidad, aborta | ✅ |
| No queda referencia funcional a `dev-user` ni guardas `APP_ENV` en queries de producto | ✅ (solo el seed conserva `APP_ENV`) |
| Sin rol administrador/supervisor con acceso a otras cuentas | ✅ (no existe tal rol) |
| Tests de aislamiento en verde junto a la suite existente | ✅ (111/111, ver §7) |
| Registro, login y **logout** funcionan con la UI propia | Login/registro ✅ (bocado A) · **logout ⏸ aplazado** (§9) |

---

## 6. Cobertura de tests de aislamiento

Los tests usan **identidades reales vía `withIdentity`**, que atraviesan `ctx.auth` igual que en producción; para simular «el otro usuario» **no** se insertan filas a mano saltándose la sesión. `TENANT_A`/`TENANT_B` tienen la forma real de un `tokenIdentifier` (`emisor|sujeto`).

**`convex/prospectos.api.test.ts`**
- `aborta sin identidad` → `UNAUTHENTICATED`; no queda nada escrito.
- `el usuarioId no se acepta del cliente ni siquiera como argumento extra` (rechazo en capa 1).
- `lecturas: cada sesión solo ve lo suyo` (`listar` + `actividadDiaria`).
- `obtener / actualizar / cambiarEtapa con el id de otro tenant → NOT_FOUND opaco` (parametrizado).
- `una escritura rechazada no altera el documento del otro tenant`.

**`convex/interacciones.test.ts`**
- `sin identidad, ni se registra ni se lista` → `UNAUTHENTICATED`.
- `B no puede registrar una interacción sobre un prospecto de A` → `NOT_FOUND`.
- `B no ve el historial de A ni con el id del prospecto en la mano` → `NOT_FOUND`.

**`convex/prospectos.test.ts`**
- `actividadDiaria aborta sin identidad`.
- Partición de la actividad diaria: un prospecto de otro tenant con seguimiento hoy queda excluido por el prefijo del índice.

**`convex/seed.test.ts`**
- `exige usuarioId con contenido`.
- `la limpieza es del tenant sembrado: no toca los datos de otro usuario`.

---

## 7. Estado observado (datos, no veredicto)

- **Tests Convex:** `npx vitest run convex` → **6 archivos, 111 tests, 111 en verde** (ejecutado en esta sesión, 2026-07-23).
- **Sin residuos:** `grep -rn "dev-user\|DEV_USUARIO_ID" convex src` → **ninguna coincidencia**.
- **Variables del deployment dev** (según nota del ADR, `npx convex env list` 2026-07-21): solo `ALLOW_SEED`, `APP_ENV`, `CLERK_JWT_ISSUER_DOMAIN`. Las huérfanas de Convex Auth (`JWKS`, `JWT_PRIVATE_KEY`, `SITE_URL`) ya se borraron.
- **Prueba manual:** el aislamiento se probó con **2 cuentas reales** el 2026-07-21 (cada cuenta ve solo su red de prospectos).
- **No ejecutado en esta sesión** (queda para la auditoría, no lo dictamina el autor): `npx tsc --noEmit` y `npx eslint convex`.

---

## 8. Puntos a criterio de auditoría

1. **`seed` recibe `usuarioId` por argumento** — es la única función que no deriva el tenant de la sesión. Contención: es `internalMutation` (no invocable desde clientes públicos) y está tras **doble guarda** (`APP_ENV=development` + `ALLOW_SEED=true`). A validar: que esa excepción se considere aceptable y que ninguna de las dos guardas pueda existir en producción.
2. **Clave de aislamiento = `tokenIdentifier` (emisor|sujeto).** Al pasar a producción (JOS-32), la instancia de producción de Clerk emitirá identificadores **distintos** de los de dev: los datos creados en desarrollo no serán visibles desde producción. Irrelevante para los datos de prueba actuales, pero **debe decidirse antes de abrir el CRM a usuarios reales**. Documentado en el ADR (acción derivada nº 4).
3. **Política de `NOT_FOUND` opaco** ante acceso cruzado: confirmar que no revelar la existencia del documento es la política deseada.
4. **Sin cambios en `src/`.** El aislamiento de backend depende de que `ctx.auth` reciba un JWT válido; esa cadena Clerk→Convex (`auth.config.ts`, `ClerkProvider`, middleware) proviene del bocado A ya commiteado y se validó con las 2 cuentas reales.
5. **El cambio está sin commitear.** Tras GO: commit sobre la rama actual → PR a `master` (el merge lo hace el usuario, no el autor).

---

## 9. Fuera de alcance de este bocado

- **Logout** — es criterio de aceptación de JOS-66 pero se **aplaza** (decisión 2026-07-23). No bloquea el aislamiento. Registrado en comentario de JOS-66. JOS-66 no se dará por *Done* hasta cerrarlo.
- **Recuperación de contraseña** («olvidé mi contraseña») — amplía el alcance original de JOS-66 y entra en el MVP como incidencia propia: [JOS-71](https://linear.app/jose-lumbreras/issue/JOS-71/recuperar-contrasena-olvide-mi-contrasena).

---

## 10. Verificación reproducible

```bash
# Suite de backend (incluye los tests de aislamiento)
npx vitest run convex

# No debe quedar ningún residuo del usuario provisional
grep -rn "dev-user\|DEV_USUARIO_ID" convex src   # esperado: sin coincidencias

# Diff completo del bocado
git diff

# Datos de prueba sobre un tenant concreto (solo dev; exige APP_ENV + ALLOW_SEED)
npx convex run seed:seed '{"scenario":"populated","usuarioId":"https://<slug>.clerk.accounts.dev|user_xxx"}'
```
