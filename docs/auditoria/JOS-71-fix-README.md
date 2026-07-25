# Auditoría de CÓDIGO — Fix enumeración JOS-71 · Índice del paquete

| | |
|---|---|
| **Issue** | [JOS-71 · Recuperar contraseña](https://linear.app/jose-lumbreras/issue/JOS-71/recuperar-contrasena-olvide-mi-contrasena) |
| **Endurecimiento derivado** | [JOS-73 · Reset server-side (residuo de red, post-MVP)](https://linear.app/jose-lumbreras/issue/JOS-73) |
| **Rama** | `joseramonlc/jos-71-recuperar-contrasena-olvide-mi-contrasena` (desde `master` `dde5fe0`) |
| **Estado** | Implementado, **sin commitear**. Gates en verde. |
| **Fecha** | 2026-07-25 |
| **Paso del proceso** | **4 — auditoría de CÓDIGO** (el plan ya obtuvo GO condicionado; ver más abajo) |

> Solicito veredicto **GO / NO-GO** sobre el **código**. Nada se sube a GitHub hasta que haya GO de esta auditoría **y** OK explícito del responsable del proyecto.

## Qué revisar y en qué orden

1. **`JOS-71-fix-enumeracion.md` (rev.3)** — la **especificación** aprobada. Es lo que el código debe cumplir. Contiene la causa raíz, el diseño del arreglo, el modelo de amenaza (§7) con la **aceptación formal firmada** del residuo de red (condición 1 del GO del plan) y las condiciones 2 y 3 ya incorporadas.
2. **`JOS-71-fix.diff`** — el **diff completo del código** (`git diff HEAD` del árbol `src/`), 7 ficheros. Es el objeto de la auditoría. Incluye ya la corrección `hasOwnProperty` de la observación menor de la 1ª auditoría de código.
3. **`JOS-71-fix-gates.txt`** — **evidencia de gates** (tests **286/286**, tsc solo 4 preexistentes, lint 0, build OK, grep de debug 0).
4. **`JOS-71-fix-e2e.md`** — **evidencia del recorrido e2e manual** (4/4 escenarios), ejecutado contra el **build de producción** (`next build` + `next start`).

## Contexto de proceso (para no re-auditar lo ya cerrado)

- El **plan** de este fix (`JOS-71-fix-enumeracion.md`) recibió **GO condicionado** en su rev.2. Las tres condiciones quedaron cerradas en **rev.3**:
  1. Aceptación formal del residuo de red/timing → **firmada** por el responsable de producto/seguridad (§7 del plan).
  2. Corregido el claim del contrato tipado (`errors[]` es forma **observada en runtime**, no el tipo declarado `ClerkError`); tests cubren **ambas** formas.
  3. `MSG_CODIGO_INCORRECTO` con **fuente única** (sin literal duplicado ni ciclo).
- La auditoría **anterior fue del plan**; esta es del **código resultante**, como exigió ese dictamen.

## Resumen del cambio (qué mirar en el diff)

| Fichero | Cambio |
|---|---|
| `src/lib/authErrores.ts` | `codigosDeError()` recorre **todo** `errors[]` (fallback al `code` superior); `mensajeDeError` traduce por prioridad; `esEmailNoEncontrado` detecta `form_identifier_not_found` en **cualquier** posición. Constante exportada `MSG_CODIGO_INCORRECTO` (fuente única). |
| `src/lib/authErrores.test.ts` | Tests de **ambas formas** (plana `ClerkError` y anidada `ClerkAPIResponseError`), array multi-elemento (not_found fuera de la posición 0) y prioridad. |
| `src/app/(auth)/recuperar/page.tsx` | Flujo neutro en `cambiarContrasena`: **no llama a Clerk** y devuelve `MSG_CODIGO_INCORRECTO` (indistinguible del código incorrecto real). **Debug temporal eliminado.** |
| `src/app/(auth)/recuperar/page.test.tsx` | Reescrito el test que codificaba la vieja oracle → **test anti-oracle** (mismo mensaje + `verifyCode` no llamado); casos con forma anidada real. |
| `src/app/(auth)/login/page.tsx` | (Contexto JOS-71) enlace "¿Olvidaste tu contraseña?". Sin cambios de lógica en este fix; se beneficia del helper. |
| `src/proxy.ts`, `src/proxy.test.ts` | (Contexto JOS-71) `/recuperar` como ruta pública. |

## Puntos de atención sugeridos para el auditor

- **No-enumeración a nivel de mensaje/UI**: verificar que en el flujo neutro `verifyCode`/`submitPassword` **nunca** se invocan y que el texto es **idéntico** al del código incorrecto real (misma constante).
- **Robustez del extractor**: `codigosDeError` no asume un único elemento ni posición fija en `errors[]`; el fallback preserva la forma plana.
- **Alcance colateral**: el mismo helper corrige `login`/`registro` (mejora estricta de mensajes); confirmar que no hay regresión (tests de esos flujos siguen en verde dentro de los 286).
- **Residuo aceptado (fuera de alcance de este fix)**: la diferencia observable a nivel de red/timing está aceptada formalmente y trasladada a **JOS-73**; no debe tratarse como bloqueante de este código.
