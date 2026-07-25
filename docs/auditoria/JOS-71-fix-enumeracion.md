# Plan de implementación — Fix bug de enumeración en recuperación de contraseña (JOS-71)

| | |
|---|---|
| **Issue** | [JOS-71 · Recuperar contraseña (olvidé mi contraseña)](https://linear.app/jose-lumbreras/issue/JOS-71/recuperar-contrasena-olvide-mi-contrasena) |
| **Milestone** | Autenticación y Cuentas (proyecto CRM-MVP) |
| **Rama** | `joseramonlc/jos-71-recuperar-contrasena-olvide-mi-contrasena` (desde `master` `dde5fe0`) |
| **Estado del código** | En árbol de trabajo, **sin commitear** (no hay commit ni PR aún) |
| **Fecha del documento** | 2026-07-25 |
| **Revisión** | **rev.3** — atiende el GO condicionado de auditoría (rev.2): corrige el claim del contrato tipado y precisa la fuente única de la constante |
| **Tipo de documento** | **Plan** (paso 1 del flujo). Se somete a auditoría **antes** de programar. |
| **Preparado para** | Departamento de auditoría (el veredicto GO/NO-GO lo emite auditoría, no el autor) |

> Este documento **describe el arreglo propuesto** para su auditoría **previa a la implementación**. No es un veredicto ni código ya escrito. Es una iteración de corrección sobre JOS-71, cuyo diseño e implementación ya recibieron GO condicionado; la condición era el recorrido manual e2e, que ha destapado el fallo que aquí se corrige.

## Registro de cambios rev.1 → rev.2 (respuesta al NO-GO)

- **Bloqueante 1 (oracle en `verifyCode`) — CERRADO.** El flujo neutro deja de ser distinguible en pasos posteriores: en el paso de código, la cuenta inexistente **no llama a Clerk** y devuelve el **mismo mensaje** que un código incorrecto en una cuenta real (constante compartida). Ver §4.3 y el test anti-oracle §4.4.
- **Bloqueante 2 (diferencia observable en red) — DECIDIDO FORMALMENTE.** Se adopta la garantía de no-enumeración **a nivel de UI/mensaje** para el MVP; el residuo de red/timing se **acepta explícitamente** en el modelo de amenaza (§7) y se **rastrea** en la issue **JOS-73** (reset server-side, post-MVP).
- **Mayor 3 (`errors[0]` únicamente) — CERRADO.** El extractor recorre **todo** el array `errors[]` con regla de prioridad explícita (§4.1) + test con varios elementos donde `form_identifier_not_found` no es el primero.
- **Observación (claim del contrato tipado) — CORREGIDA (rev.3).** El tipo **declarado** por los métodos Future es `error: ClerkError` (con `code` de nivel superior); que en runtime el objeto sea un `ClerkAPIResponseError` con `errors: ClerkAPIError[]` es **forma observada en runtime**, no el contrato tipado. El arreglo funciona bajo **ambas** formas (lee `errors[]` si está, cae al `code` superior si no) y los tests cubren las dos explícitamente (§2, §4.2).
- **Condición 3 (fuente única de la constante) — PRECISADA (rev.3).** `MSG_CODIGO_INCORRECTO` se define una sola vez en `authErrores.ts`; lo referencian el mapa `MENSAJES` y la página vía import; sin literal duplicado ni ciclo (§4.1).
- **Observación (tests a nivel de página) — AÑADIDA.** Nuevos tests en `recuperar/page.test.tsx` con la forma anidada real (§4.4).
- **Observación (gate reproducible) — ALINEADA.** El gate de referencia es `npm test` (§6).
- **Observación (retirada del debug) — VERIFICABLE.** `grep` final de control (§6).

---

## 1. Contexto

JOS-71 (recuperar contraseña) estaba implementado con **GO condicionado** de auditoría, siendo la condición el **recorrido manual e2e**. Ese e2e, ejecutado ya en un **build limpio** (con Dropbox pausado y `.next` regenerado, tras descartar el bloqueo de entorno que impedía compilar), arroja:

- **Happy path correcto:** email → código al correo → contraseña nueva → sesión iniciada y redirección a `/actividad`. Verificado con la cuenta real `joseramonlc@gmail.com`.
- **Email inexistente incorrecto:** en lugar de avanzar al paso de código con copy neutro (comportamiento pactado de no-enumeración), muestra el **error genérico**. Esto delata por comportamiento que la cuenta no existe → **vector de enumeración de cuentas**, que fue **bloqueante** en la auditoría de diseño (rev.1) y que el arreglo debe cerrar.

> Nota: el "bug" que en una sesión anterior se atribuyó al cambio de contraseña era en realidad un **artefacto de entorno** (bundle viejo por el lock de Dropbox sobre `.next` + HMR de webpack que no recompilaba sobre `/mnt/c`). En build limpio el happy path funciona. El fallo **real y de código** es el de enumeración descrito aquí.

## 2. Causa raíz (con evidencia)

**Tipo declarado (lo que garantiza el SDK).** Los métodos Future declaran su retorno como `{ error: ClerkError | null }` (`node_modules/@clerk/shared/dist/types/signInFuture.d.ts`), y `ClerkError` expone `code` en el **nivel superior** (`clerkError.d.ts`). El tipo declarado **no** incluye `errors[]`.

**Forma observada en runtime (no garantizada por el tipo declarado).** En ejecución, el objeto que llega en `error` es en realidad un **`ClerkAPIResponseError`** — subclase de `ClerkError` — que además del `code` superior (genérico) trae un array **`errors: ClerkAPIError[]`** (`clerkApiResponseError.d.ts`), donde cada `ClerkAPIError` lleva su `code` específico y estable (`form_identifier_not_found`, `form_password_incorrect`, `form_code_incorrect`, …). El debug temporal lo corrobora para un email inexistente:

```
code=api_response_error   status=422   msg="Couldn't find your account."
```

es decir, `code` superior genérico y el específico **dentro de `errors[]`**. Como la subclase no está en el tipo declarado, el arreglo **no puede asumir** que `errors[]` esté siempre presente ni que el `code` superior sea siempre `api_response_error`: trata `errors[]` como la forma real cuando aparece y **cae al `code` superior como *fallback***, de modo que es correcto bajo **ambas** formas (plana `ClerkError` y anidada `ClerkAPIResponseError`).

**El defecto.** Los helpers actuales `mensajeDeError`/`esEmailNoEncontrado` (`src/lib/authErrores.ts`) leen **solo el `code` de nivel superior** → nunca ven el código específico de `errors[]` → caen al texto genérico, y `esEmailNoEncontrado` no acierta jamás.

**Por qué no lo detectaron los unit tests ni la auditoría previa:** el fixture de test `errorDeClerk(code)` construye la forma **plana** `{ code, message, longMessage }`, que **no se corresponde con la forma real en runtime** (anidada). El mock validaba un contrato inexistente.

## 3. Alcance real del fallo (tres flujos, un único origen)

`mensajeDeError` lo consumen `login` (2 usos), `registro` (5 usos) y `recuperar` (varios). El defecto es del helper, así que afecta a los tres:

| Flujo | Comportamiento actual | Comportamiento tras el fix |
|---|---|---|
| **recuperar** | email inexistente → error genérico (**enumeración**); código de verificación incorrecto → genérico | inexistente → indistinguible de cuenta real (ver §4.3); código incorrecto → mensaje específico |
| **login** | contraseña incorrecta → genérico | "Email o contraseña incorrectos." |
| **registro** | "email ya existe" / "contraseña débil o filtrada" → genérico | mensajes específicos correctos |

## 4. Cambio propuesto

### 4.1 `src/lib/authErrores.ts` — extractor sobre TODO el array
Recorre todos los elementos de `errors[]` (sin asumir orden ni un único elemento) y usa el `code` superior solo como *fallback*:

```ts
/** Códigos ESTABLES de un error de Clerk, en orden de prioridad. El tipo
 *  declarado es `ClerkError` (`code` superior); en runtime suele ser un
 *  `ClerkAPIResponseError` que además trae `errors: ClerkAPIError[]`, cada uno
 *  con su `.code`. Devolvemos primero los anidados (en su orden) y por último el
 *  `code` de nivel superior como fallback → correcto bajo ambas formas. */
function codigosDeError(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];
  const e = error as { code?: unknown; errors?: unknown };
  const codes: string[] = [];
  if (Array.isArray(e.errors)) {
    for (const item of e.errors) {
      const c = (item as { code?: unknown } | null)?.code;
      if (typeof c === "string") codes.push(c);
    }
  }
  if (typeof e.code === "string") codes.push(e.code);
  return codes;
}

export function mensajeDeError(error: unknown): string {
  const codes = codigosDeError(error);
  for (const c of codes) {          // prioridad: primer código con traducción conocida
    const m = MENSAJES[c];
    if (m) return m;
  }
  if (codes.length > 0) return GENERICO;             // había código(s), ninguno mapea
  if (error instanceof TypeError) return SIN_RED;    // fallo de red: sin code que traducir
  return GENERICO;
}

export function esEmailNoEncontrado(error: unknown): boolean {
  // Seguridad: se detecta en CUALQUIER posición del array, no solo en [0].
  return codigosDeError(error).includes("form_identifier_not_found");
}
```

**Regla de prioridad explícita:** para el mensaje, gana el **primer** código (anidado antes que el superior) que tenga traducción en `MENSAJES`; para `esEmailNoEncontrado`, basta que `form_identifier_not_found` aparezca en **cualquier** posición. Se elimina el guard `tieneCodigo`, subsumido en `codigosDeError`.

**Constante compartida — fuente única** (para §4.3, condición 3 del GO): el literal del código incorrecto se define **una sola vez** en `authErrores.ts` y lo referencian tanto el mapa `MENSAJES` como la página (vía import), para garantizar que ambos textos sean idénticos:
```ts
export const MSG_CODIGO_INCORRECTO = "El código no es correcto. Revísalo e inténtalo de nuevo.";
// …en MENSAJES:  form_code_incorrect: MSG_CODIGO_INCORRECTO,
```
No hay literal duplicado ni riesgo de import circular: `recuperar/page.tsx` ya importa de `authErrores.ts`, y `authErrores.ts` **no importa nada de las páginas** (la dependencia es unidireccional). La auditoría de código lo verificará.

### 4.2 `src/lib/authErrores.test.ts` — tests de AMBAS formas
Se cubren **explícitamente las dos formas** (condición 2 del GO): la **plana** `ClerkError` (`code` superior, ejercita el *fallback*) y la **anidada** `ClerkAPIResponseError` (`errors[]`). Fixtures para cada una y casos:
- login con contraseña incorrecta anidada → "Email o contraseña incorrectos.";
- recuperar con email inexistente anidado → `esEmailNoEncontrado` = `true`;
- recuperar con código de verificación incorrecto anidado → `MSG_CODIGO_INCORRECTO`;
- **array de varios elementos** donde `form_identifier_not_found` **no** es el primero → `esEmailNoEncontrado` = `true` (regresión del Mayor 3);
- prioridad: primer código mapeado gana cuando hay varios;
- defensivos: `errors` vacío, sin `errors`, `null`, objeto sin código, `TypeError` de red.

Los tests actuales siguen pasando sin cambios (el *fallback* cubre la forma plana).

### 4.3 `src/app/(auth)/recuperar/page.tsx` — cerrar la oracle de `verifyCode` (Bloqueante 1)
En `cambiarContrasena`, **antes** de tocar Clerk, cortar el flujo neutro con el **mismo mensaje** que un código incorrecto real, sin llamar a la API:

```ts
async function cambiarContrasena(e: React.FormEvent) {
  e.preventDefault();
  if (!signIn || enviando.current) return;
  setError(null);
  setAviso(null);
  // Flujo neutro (email inexistente): NO se llama a Clerk. Se devuelve el MISMO
  // mensaje que un código incorrecto en cuenta real → ambos flujos indistinguibles
  // (no-enumeración). La cuenta inexistente nunca progresa a cambiar contraseña.
  if (flujoNeutro) {
    setError(MSG_CODIGO_INCORRECTO);
    return;
  }
  // …resto sin cambios: verifyCode → submitPassword → finalize…
}
```

Con esto, para un atacante que introduce códigos arbitrarios, **cuenta existente + código malo** y **cuenta inexistente + cualquier código** producen el mismo mensaje y el mismo callejón sin salida. Además se **elimina el debug temporal** (`dbg(...)`, sus concatenaciones y los `[debug status=…]`).

### 4.4 `src/app/(auth)/recuperar/page.test.tsx` — test anti-oracle
- Cuenta existente + código incorrecto (mock `verifyCode` → error anidado `form_code_incorrect`) → muestra `MSG_CODIGO_INCORRECTO`.
- Flujo neutro (mock `create` → error anidado `form_identifier_not_found`) → avanza al paso de código; al enviar código, muestra `MSG_CODIGO_INCORRECTO` **y `verifyCode` NO se llama** (aserción sobre el mock).
- Aserción explícita de que **ambos mensajes son idénticos** (indistinguibles).
- Se actualizan/duplican los tests de página que hoy usan códigos planos para cubrir la forma anidada real.

## 5. Fuera de alcance (no se toca)
- Lógica de `login` / `registro` (solo se benefician del helper corregido; no se edita su flujo).
- Sin variables de entorno nuevas, sin cambios de UI, sin rutas nuevas.
- El **residuo de red/timing** (Bloqueante 2) se aborda en **JOS-73**, no aquí.

## 6. Verificación prevista
- **Gates (comandos de `package.json`):** `npx tsc --noEmit` (se esperan solo los 4 errores preexistentes de `import.meta.glob`), `npm run lint`, **`npm test`** (= `vitest run`, gate de referencia) y `npm run build`. Si aparece el *flake* del pool de workers sobre `/mnt/c`, se re-ejecuta además `npx vitest run --no-file-parallelism` y se reportan ambos en verde (no se introduce ningún comando fuera de `package.json` como gate de referencia).
- **Control de retirada del debug:** `grep -rn "dbg\|reset debug\|\[debug status" src/` → **0 resultados**.
- **e2e manual (build limpio):**
  1. email inexistente → avance neutro; en el paso de código, mensaje idéntico al de código incorrecto; nunca progresa;
  2. cuenta real + código incorrecto → mismo mensaje que (1);
  3. happy path (cuenta real + código correcto) sigue completando y logueando;
  4. login con contraseña incorrecta → "Email o contraseña incorrectos.".

## 7. Modelo de amenaza y decisión de riesgo (Bloqueante 2)

**Garantía que ofrece este arreglo:** no-enumeración **a nivel de UI/mensaje**. Un usuario (o script) que interactúe a través de la interfaz **no puede distinguir** si un email tiene cuenta: primera pantalla, pantalla de código y mensajes de error son idénticos exista o no la cuenta.

**Residuo aceptado (fuera del alcance de JOS-71):** a nivel de **red/timing** persiste una diferencia observable — para un email existente se dispara `sendCode` y para uno inexistente no; `verifyCode` en el flujo neutro no llega a llamar a Clerk; el rate-limiting puede diferir bajo sondeo intensivo. Explotarlo exige inspección de red (DevTools/proxy) o un navegador headless (enumeración **sofisticada**, no trivial).

**Decisión (2026-07-25):** se acepta ese residuo como **límite explícito del MVP**. Severidad de la fuga: **baja-media** (revela existencia de cuenta → phishing dirigido / credential stuffing), sobre una base de usuarios pequeña y sin datos de alto valor. **Advertencia (riesgo residual, condición del GO):** esta clasificación "baja-media" es una **decisión de riesgo**, no una conclusión técnica; un atacante con DevTools o navegador automatizado **sí** puede observar la diferencia. Mitigación provisional en producción: **rate-limiting de Clerk**. El cierre completo (respuesta server-side indistinguible en status, cuerpo y timing) queda **rastreado y planificado** en **JOS-73** (creada y registrada en Linear el 2026-07-25: `https://linear.app/jose-lumbreras/issue/JOS-73`). Esta decisión la acepta formalmente el **responsable de producto/seguridad del proyecto** (Jose Lumbreras); su aceptación explícita queda recogida al pie de este apartado antes de implementar.

> **Aceptación formal — condición 1 del GO.** ✅ **ACEPTADA.** "Acepto el residuo de red/timing como límite del MVP, con cierre planificado en JOS-73." — **Jose Lumbreras** (responsable de producto/seguridad), 2026-07-25.

## 8. Riesgos de la implementación
Bajo. El cambio se concentra en un helper puro y en un *early-return* del flujo neutro; el *fallback* preserva el comportamiento ante la forma plana; es una **mejora estricta** de los mensajes de los tres flujos de autenticación. No altera almacenamiento ni el happy path.

## 9. Tras el GO (recordatorio de proceso)
Con GO de auditoría **del plan** → se programa el alcance anterior → se somete el **código** a auditoría → con su GO **y OK explícito del usuario para publicar**, se crea rama + commit + PR a `master` (el merge lo hace el usuario) → Railway despliega al fusionar. Nada se sube a GitHub sin el OK explícito del usuario, aunque exista GO de auditoría.
