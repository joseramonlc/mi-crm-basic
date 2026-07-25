# Auditoría — JOS-71 · Recuperar contraseña ("olvidé mi contraseña")

| | |
|---|---|
| **Issue** | [JOS-71 · Recuperar contraseña (olvidé mi contraseña)](https://linear.app/jose-lumbreras/issue/JOS-71/recuperar-contrasena-olvide-mi-contrasena) |
| **Milestone** | Autenticación y Cuentas (proyecto CRM-MVP) |
| **Rama** | `joseramonlc/jos-71-recuperar-contrasena-olvide-mi-contrasena` (desde `master` `dde5fe0`) |
| **Estado del código** | En árbol de trabajo, **sin commitear** (no hay commit ni PR aún) |
| **Fecha del documento** | 2026-07-24 |
| **Preparado para** | Auditoría de implementación (el veredicto GO/NO-GO lo emite el departamento de auditoría, no el autor) |

> Este documento **describe** el cambio para su auditoría. No es un veredicto. Los apartados 7–9 separan **datos observados** de **puntos a criterio de auditoría** y de lo que **queda pendiente**. El diseño ya recibió un GO condicionado previo (rev.2); este documento cubre la **implementación** de ese diseño.

> **Rev. tras 1ª auditoría de implementación (NO-GO, 2026-07-24).** Se cerraron los dos mayores: (M1) guarda **síncrona** contra doble submit con `useRef` —patrón ya usado en `prospectos/nuevo/page.tsx`— con `try/finally` en los tres handlers; (M2) guard de sesión que además espera a `isLoaded` (`if (!isLoaded || isSignedIn) return null;`), para no renderizar el formulario ni un instante a una sesión ya existente mientras Clerk carga. Menores: `/recuperar` añadido a `proxy.test.ts`; comando de diff del §10 corregido para mostrar archivos nuevos. Tests nuevos: doble submit y "cargando → no renderiza".

---

## 1. Propósito y alcance

Añade el flujo de **recuperación de contraseña** ("¿Olvidaste tu contraseña?") a la autenticación con Clerk, para que un usuario que no recuerda su contraseña recupere el acceso **desde la app**, sin depender del dashboard de Clerk. Hasta ahora no existía ninguna vía (llegó a bloquear pruebas de logout con cuentas reales).

**Alcance del diff:** 6 archivos, todo **frontend/auth**. No toca backend Convex, aislamiento multi-tenant ni la configuración de la instancia de Clerk (el reset por email code ya viene de serie).

```
 src/app/(auth)/login/page.tsx       |  5 +++++      (enlace al flujo)
 src/proxy.ts                        |  8 ++++----   (ruta pública)
 src/lib/authErrores.ts              | 10 ++++++++++ (helper no-enumeración)
 src/lib/authErrores.test.ts         | 16 ++++++++++ (2 tests del helper)
 src/app/(auth)/recuperar/page.tsx      (NUEVO)     (flujo de reset)
 src/app/(auth)/recuperar/page.test.tsx (NUEVO)     (13 tests de componente)
```

---

## 2. Contexto previo y corrección de la spec

- Login y registro propios (custom flows de Clerk, **Future signals API**) están en `master` desde JOS-66 (bocado A, PR #1). El login usa `signIn.password(...)` con UI propia, **no** el componente alojado `<SignIn/>`, por lo que el "forgot password" de serie no aplica: hay que implementarlo explícito.
- **La spec original de JOS-71 describía la API clásica** (`signIn.create({ strategy: "reset_password_email_code" })` + `attemptFirstFactor`). **Esa API no existe** en la versión instalada (`@clerk/nextjs` 7.5.20). Verificado en `node_modules/@clerk/shared/dist/types/signInFuture.d.ts`: la Future API expone `signIn.resetPasswordEmailCode.{sendCode, verifyCode, submitPassword}` y todos los métodos **devuelven `{ error }`** (no lanzan por diseño).

---

## 3. Resumen del cambio

1. **Nueva pantalla `/recuperar`** (2 pasos: email → código + contraseña nueva), heredando `AuthLayout` y los componentes del design system (idéntica a login/registro).
2. **Flujo de reset (Future API):** `create({ identifier })` → `resetPasswordEmailCode.sendCode()` → `verifyCode({ code })` (status `needs_new_password`) → `submitPassword({ password, signOutOfOtherSessions: true })` (status `complete`) → `finalize()` (redirige al fallback `/actividad`).
3. **No enumeración de cuentas** como propiedad de seguridad central (ver §5).
4. **Helper `esEmailNoEncontrado()`** en `authErrores.ts`, reutilizando `tieneCodigo`.
5. **`/recuperar` como ruta pública** en el middleware.
6. **Enlace "¿Olvidaste tu contraseña?"** en el login.

---

## 4. Cambios archivo por archivo

### `src/app/(auth)/recuperar/page.tsx` — núcleo (nuevo)
Máquina de 2 pasos (`useState<"email" | "codigo">`), estructura calcada de `registro/page.tsx`. Puntos relevantes:

- **Guard de sesión que NO renderiza el formulario** (espera a `isLoaded`: mientras Clerk carga, `isSignedIn` es `undefined`, así que sin esperar se vería el formulario un instante a una sesión ya existente):
  ```ts
  React.useEffect(() => { if (isLoaded && isSignedIn) router.replace("/actividad"); }, [isLoaded, isSignedIn, router]);
  if (!isLoaded || isSignedIn) return null;
  ```
- **Guarda síncrona contra doble submit** con `const enviando = React.useRef(false)`: `if (!signIn || enviando.current) return; enviando.current = true;` al entrar y reset en `finally`, en los tres handlers (`enviarCodigo`, `cambiarContrasena`, `reenviar`). El `disabled`/`loading` del botón (derivado de `fetchStatus`) no basta porque no cambia hasta el re-render. Mismo patrón que `prospectos/nuevo/page.tsx`.
- **`try/catch` en cada await de Clerk** + comprobación de `.error`: robusto tanto si un fallo de red rechaza la promesa como si se devuelve como `{ error }`. Ambos caminos pasan por `mensajeDeError`.
- **Invariantes de estado:** tras `verifyCode` se exige `needs_new_password`; tras `submitPassword` se exige `complete` antes de `finalize()`.
- **`<div id="clerk-captcha" />`** en el paso email (anclaje del smart CAPTCHA, igual que en `registro/page.tsx`).

### `src/lib/authErrores.ts`
Añade:
```ts
export function esEmailNoEncontrado(error: unknown): boolean {
  return tieneCodigo(error) && error.code === "form_identifier_not_found";
}
```
Se usa **solo** en el flujo de reset para la no-enumeración. No cambia `mensajeDeError`.

### `src/proxy.ts`
`esRutaPublica` pasa de `["/login(.*)", "/registro(.*)"]` a incluir `"/recuperar(.*)"`. Sin este cambio, el middleware protegería `/recuperar` y redirigiría a `/login`.

### `src/app/(auth)/login/page.tsx`
Enlace "¿Olvidaste tu contraseña?" → `/recuperar`, bajo el botón Entrar.

### Sin variables nuevas en Railway
`finalize()` redirige al `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` (= `/actividad`), ya existente. Verificado que no hace falta ninguna variable adicional.

---

## 5. No enumeración de cuentas (lo relevante para seguridad)

Criterio de aceptación de JOS-71: *"los errores no revelan qué emails existen"*. Cómo se garantiza:

1. **`form_identifier_not_found` se neutraliza en los DOS puntos donde puede surgir** — `create({ identifier })` **y** `sendCode()`. Si aparece, el flujo **avanza igual** al paso de código con copy neutro, en vez de mostrar "no existe". Así el cambio de pantalla es idéntico para un email que existe y uno que no.
2. **Copy deliberadamente neutro:** *"Si existe una cuenta con {email}, te habremos enviado un código…"* — nunca una afirmación absoluta.
3. **Estado interno `flujoNeutro`:** cuando el envío se neutralizó, **`reenviar` no vuelve a llamar a Clerk**; muestra el mismo aviso neutro. Evita que el comportamiento del reenvío difiera entre email existente e inexistente.
4. **Errores siempre traducidos:** cualquier error visible pasa por `mensajeDeError` (nunca `error.message` crudo de Clerk). En el flujo neutral, un `verifyCode` posterior cae en el mensaje **genérico**.

---

## 6. Cobertura de tests

**`src/app/(auth)/recuperar/page.test.tsx`** (jsdom, `@testing-library/react` interactivo — `user-event` no está instalado, no se añadió dependencia):
- Email válido → `create` + `sendCode` llamados → avanza a código.
- **No enumeración:** `create` devuelve `form_identifier_not_found` → avanza a código **sin `role="alert"`** y **sin** llamar a `sendCode`.
- **No enumeración:** `sendCode` devuelve `form_identifier_not_found` → avanza a código sin alerta.
- **Reenviar tras flujo neutral → NO llama a Clerk** y muestra aviso neutro.
- Reenviar en flujo normal → sí llama a `sendCode`.
- Camino feliz → `verifyCode` → `submitPassword({ signOutOfOtherSessions: true })` → `finalize`, **en ese orden**.
- `verifyCode` falla → **no** llama a `submitPassword` ni `finalize`.
- `verifyCode` en flujo neutral → error **genérico**, sin texto crudo de Clerk.
- Red: método que **rechaza** y método que **devuelve `{ error: TypeError }`** → ambos "sin conexión".
- **Doble submit:** dos `submit` en la misma tarea → `create` se llama **una sola vez**.
- **Guard de sesión activa** → no renderiza formulario (`queryByLabelText("Email")` null) y `replace("/actividad")`.
- **Guard mientras carga** (`isLoaded: false`, `isSignedIn: undefined`) → no renderiza formulario **ni** redirige.

**`src/lib/authErrores.test.ts`**: `esEmailNoEncontrado` true solo para `form_identifier_not_found`; false ante null/formas raras/red.

**`src/proxy.test.ts`**: `/recuperar` entra en el middleware (matcher).

---

## 7. Estado observado (datos, no veredicto)

Ejecutado en esta sesión (2026-07-24):

- **`npm test` (suite completa):** **281 tests en 30 archivos, todos en verde** (16 nuevos de esta issue). Recuento fiable de la ejecución **secuencial** (`vitest run --no-file-parallelism`); ver nota de entorno.
- **`npx tsc --noEmit`:** solo los **4 errores preexistentes** `import.meta.glob` de `convex/*.test.ts` (deuda previa, no agravada). Cero errores en el código de JOS-71.
- **`npm run lint`:** limpio (exit 0).
- **`npm run build`:** OK; la ruta `/recuperar` se genera (○ static). Requirió un reintento por `EACCES: rmdir .next/…` (Dropbox reteniendo handles; flake de entorno conocido, no del código).
- **Sin commit ni push:** el árbol tiene 5 modificados (`login`, `proxy`, `proxy.test`, `authErrores`, `authErrores.test`) + `src/app/(auth)/recuperar/` y este doc untracked.

> **Nota de entorno (no afecta al veredicto del código).** En ejecución paralela, el pool de workers de Vitest sufrió *timeouts de arranque* (`Timeout waiting for worker to respond`) sobre el proyecto alojado en `/mnt/c/…/Dropbox` bajo WSL2, tumbando ~3 archivos y un test de `actividad` por timeout. Ese test **pasa aislado (8/8)** y la suite **secuencial pasa completa (281/281)**: los fallos eran de infraestructura (Dropbox + FS de Windows desde WSL), no de código. Se está valorando mover el proyecto a la FS nativa de WSL2 para eliminar estos flakes.

### Nota de transparencia — hallazgo corregido durante la implementación
`tsc` cazó un **TS2367 real del autor**: tras el guard `status !== "needs_new_password"`, el control-flow de TS estrechaba `signIn.status` al literal y marcaba la 2ª invariante (`!== "complete"`) como comparación imposible, pese a que en runtime `submitPassword` sí muta el estado. Resuelto leyendo el estado en **locales tipados `string`** (`estadoTrasVerificar`, `estadoTrasCambiar`), conservando ambas invariantes. Gate re-ejecutado en verde.

---

## 8. Puntos a criterio de auditoría

1. **`signOutOfOtherSessions: true`** en `submitPassword` — decisión de seguridad recomendada por auditoría en el GO del diseño (un reset cierra las demás sesiones). A confirmar que es la política deseada de producto para el MVP.
2. **No enumeración por neutralización de `form_identifier_not_found`** — validar que la estrategia (avanzar al paso de código con copy neutro y `flujoNeutro`) se considera suficiente. Nota honesta: un observador de red podría notar la *ausencia* de petición en el reenvío del flujo neutral; se consideró fuera del modelo de amenaza del MVP y a criterio de auditoría.
3. **`try/catch` + `.error` simultáneos** — se cubren ambos comportamientos posibles de la Future API ante fallo de red (rechazo o `{ error }`). Se documenta que el comportamiento real exacto ante red no se pudo forzar en runtime; los tests simulan las dos formas.
4. **Deuda preexistente señalada (no tocada):** `login/page.tsx` y `registro/page.tsx` **no** envuelven sus awaits en `try/catch` **ni** tienen la guarda síncrona `useRef` contra doble submit (dependen solo de `fetchStatus`/`disabled`). `/recuperar` sí incorpora ambas. Fuera del alcance de JOS-71; se deja anotado por si auditoría quiere abrir incidencia para alinear login/registro.
5. **El cambio está sin commitear.** Tras GO: commit sobre la rama actual → PR a `master` (el merge lo hace el usuario, no el autor).

---

## 9. Pendiente antes del PR (no lo dictamina ni ejecuta el autor)

**Recorrido manual e2e — GATE OBLIGATORIO**, requiere buzón de email real (lo hace el usuario). Con `next dev --webpack` (incidencia Turbopack conocida):

1. `/login` → "¿Olvidaste tu contraseña?" → `/recuperar`.
2. Email → recibir código por email → introducir código + contraseña nueva.
3. Queda logueado en `/actividad`.
4. Logout → volver a entrar con la **contraseña nueva**.
5. Repetir en **móvil y desktop**.
6. **Confirmar si el flujo dispara CAPTCHA o `status === "needs_protect_check"`**; si aparece, se maneja antes de dar el PR por bueno.

---

## 10. Verificación reproducible

```bash
# Suite completa (incluye los tests nuevos del flujo de reset)
npm test

# Typecheck (esperado: solo los 4 errores preexistentes de import.meta.glob)
npx tsc --noEmit

# Lint (esperado: limpio) y build (esperado: OK, ruta /recuperar generada)
npm run lint
npm run build

# Diff completo, incluidos los archivos NUEVOS (intent-to-add para que aparezcan;
# `git reset` después lo deshace sin tocar el contenido)
git add -N . && git diff HEAD
git status --short   # lista modificados + nuevos (recuperar/page.tsx, su test, este doc)

# Recorrido manual (requiere email real)
npx concurrently -n next,convex -c blue,green "next dev --webpack" "convex dev"
```
