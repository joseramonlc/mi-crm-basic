# PLAN JOS-25 + JOS-26 — Navegación global: remates finales

**Revisión 2** · incorpora el NO-GO condicionado de la auditoría de la rev. 1
**Issues:** [JOS-25](https://linear.app/jose-lumbreras/issue/JOS-25/barra-de-navegacion-global-inferior-en-movil-lateral-en) · [JOS-26](https://linear.app/jose-lumbreras/issue/JOS-26/boton-global-para-anadir-prospecto-desde-cualquier-pantalla) — Milestone M8, prioridad Urgente
**Diseño aprobado:** [JOS-63](https://linear.app/jose-lumbreras/issue/JOS-63/navegacion-global-y-layout-responsivo-crm-networker-mvp) (Fase 0, Done)
**Rama:** `joseramonlc/jos-25-barra-de-navegacion-global-inferior-en-movil-lateral-en`
**Base:** `origin/master` = `cbe98c0` (verificado contra el remoto el 2026-08-05)

---

## Respuesta a la auditoría de la rev. 1

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | El plan excluye Registrar Interacción del FAB aunque JOS-26 la nombra: cambia el criterio de aceptación | **Bloqueante** | **Resuelto formalmente por el issue owner el 2026-08-05: Opción A.** El alcance aceptado de JOS-26 pasa a "raíz + ficha". Registrado como decisión de producto en un comentario de la propia issue, no enterrado en el código |
| 2 | Añadir FAB en la ficha exige cambiar su anclaje o chocará con la CTA fija | Mayor | **Resuelto**, y era peor de lo previsto: `--ficha-cta` no era un token global sino una variable del elemento raíz de la ficha, **fuera del alcance del FAB** (que vive en `AppShell`, su ancestro). Ver §2 |
| 3 | La Decisión 3 no debe implementarse como `Button as/href`; el patrón correcto es `Link` + `buttonStyle` | Mayor | **Aceptado y verificado en el código**: `Button` extiende `ButtonHTMLAttributes<HTMLButtonElement>` y no admite `href`; `buttonStyle()` está documentado literalmente *"para elementos que deben verse como Button sin serlo — p. ej. un `<Link>` de navegación"* y ya se usa así en `EmptyState.tsx:60`. Se adopta ese patrón |
| 4 | Vigilar que la presencia del FAB no se use como motivo para quitar TabBar/padding | Mayor | **Resuelto con test explícito** y con la estructura del código: son dos predicados independientes. Ver §3 |
| 5 | `scrollArriba` solo en enlaces activos exactos (`pathname === item.href`) | Sugerencia | Aceptada tal cual. No se marca `/prospectos/[id]` como "Prospectos" activo |
| 6 | `aria-current="page"` en los enlaces activos | Sugerencia | Aceptada. Añadido en TabBar y Sidebar, con test |
| 7 | Documentar la exclusión como decisión de producto, en PR e issue | Sugerencia | Hecho en la issue antes de escribir código; irá también en el cuerpo del PR |

---

## 0. Punto de partida: M8 ya estaba casi construido

Verificado sobre el código el 2026-08-05. Estas dos issues **no eran "hacer la navegación"**, sino cerrar los huecos concretos por los que se marcaron como no cumplidas en la reconciliación del 2026-07-28.

| Pieza | Estado antes de esta rama |
|---|---|
| Barra inferior móvil (`TabBar.tsx`) | Existía: `fixed bottom-0`, 3 destinos, activo destacado |
| Barra lateral escritorio (`Sidebar.tsx`) | Existía: 224px, `sticky top-0` |
| FAB móvil (`AppShell.tsx`) | Existía, pero solo en rutas raíz |
| Botón "+" escritorio (`Sidebar.tsx`) | Existía, en las 6 pantallas de `(app)` |
| Navegación a la ficha tras guardar | Existía (`nuevo/page.tsx:111`) |
| Medidas (`--layout-tabbar: 60px`, `--layout-fab: 56px`) | Ya cumplían los criterios (56-64px / ≥56px) |

**Huecos reales, y son los dos únicos:**

1. **JOS-25** — pulsar la pestaña ya activa no hacía nada. Y no bastaba con confiar en el framework: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:232` dice que el `<Link>` de Next 16 **conserva** la posición de scroll por defecto.
2. **JOS-26** — en móvil el FAB no salía en la ficha.

---

## 1. JOS-25 — Volver al inicio al pulsar la sección activa

`src/components/layout/scrollArriba.ts`, consumido por `TabBar` y `Sidebar`.

- **Quién hace scroll:** la ventana. `AppShell` no declara `overflow` en ninguno de sus envoltorios, y `Sidebar` y `MobileHeader` son `sticky`.
- **Solo el destino activo exacto** (`pathname === item.href`): se cancela la navegación con `preventDefault()` y se sube. Sobre los demás no se toca nada.
- **Movimiento suave**, salvo `prefers-reduced-motion: reduce`. Sin `matchMedia` (jsdom, navegadores viejos) no lanza y anima.
- **Los clics con modificador se dejan pasar**: Ctrl/Cmd/Shift/Alt siguen abriendo en otra pestaña. Solo se intercepta la pulsación simple, que es también la que produce el teclado con Enter.

**Por qué en fichero aparte:** lo consumen dos componentes, y aislado se prueba de verdad — **jsdom no implementa `window.scrollTo`**, así que sin aislarlo cada barra tendría que instalar el mismo espía.

---

## 2. JOS-26 — El "+" en móvil, y el anclaje en la ficha

### 2.1 Dónde aparece

`muestraFab(pathname) = isRootRoute(pathname) || esFichaProspecto(pathname)`

No hace falta enumerar las exclusiones: ninguna de las dos pantallas de captura es raíz ni casa `esFichaProspecto`. Reutiliza dos predicados que ya estaban probados.

| Ruta | FAB móvil |
|---|---|
| `/actividad`, `/prospectos`, `/resumen` | Sí |
| `/prospectos/[id]` | Sí |
| `/prospectos/nuevo` | No |
| `/prospectos/[id]/interacciones/nueva` | No |

### 2.2 El anclaje: el hallazgo que corrige el mayor 2

El plan de la rev. 1 decía que el FAB *"se lee del mismo sitio del que la lee la Ficha"*. **Al implementarlo se comprobó que eso no era posible tal cual:**

`--ficha-cta` no era un token global. Lo definía la Ficha **en su propio elemento raíz** (`page.tsx:144`, `"76px"` literal). El FAB vive en `AppShell`, que es **ancestro** de la página: las custom properties heredan hacia abajo, no hacia arriba, así que `var(--ficha-cta)` **no habría resuelto** en el FAB.

**Resolución:** la medida sube al fichero de tokens como `--layout-ficha-cta: 76px`, y la Ficha pasa a delegar en él (`["--ficha-cta"]: "var(--layout-ficha-cta)"`). Sigue habiendo **una sola fuente**; lo que cambia es dónde vive. El FAB se ancla:

```
raíz  → calc(var(--layout-tabbar) + 16px)      (sobre la TabBar)
ficha → calc(var(--layout-ficha-cta) + 16px)   (sobre su barra CTA)
```

**Consecuencia declarada:** esto obliga a tocar tres ficheros que la tabla de la rev. 1 no listaba — ver §4.

---

## 3. FAB y TabBar son contratos independientes (mayor 4)

En `AppShell` son dos constantes distintas y ninguna depende de la otra:

```ts
const enFicha = esFichaProspecto(pathname);   // gobierna TabBar y padding (JOS-59)
const conFab  = muestraFab(pathname);          // gobierna el FAB (JOS-26)
```

Fijado con dos tests que cruzan los casos en ambas direcciones:

- `/prospectos/nuevo`: **sin** FAB, pero **con** TabBar y **con** `pb-20`.
- `/prospectos/p7`: **con** FAB, pero **sin** TabBar y **sin** `pb-20`.

Los tres tests originales de `AppShell.test.tsx` **siguen intactos y en verde**.

---

## 4. Ficheros

### Los que la rev. 1 declaró

| Fichero | Operación |
|---|---|
| `src/components/layout/scrollArriba.ts` | Nuevo |
| `src/components/layout/scrollArriba.test.ts` | Nuevo |
| `src/components/layout/TabBar.tsx` | Modificado |
| `src/components/layout/TabBar.test.tsx` | Nuevo |
| `src/components/layout/Sidebar.tsx` | Modificado |
| `src/components/layout/Sidebar.test.tsx` | Nuevo |
| `src/components/layout/nav.ts` | Modificado — solo añade `muestraFab` |
| `src/components/layout/nav.test.ts` | Modificado |
| `src/components/layout/AppShell.tsx` | Modificado |
| `src/components/layout/AppShell.test.tsx` | Modificado |

### Los tres que NO estaban en la tabla — se declaran expresamente

| Fichero | Operación | Por qué |
|---|---|---|
| `src/styles/tokens/spacing.css` | Modificado — **solo añade** `--layout-ficha-cta: 76px` | §2.2. La rev. 1 anunciaba "exponer la altura como variable CSS" pero no dijo en qué fichero acabaría |
| `src/app/(app)/prospectos/[id]/page.tsx` | Modificado — 1 línea + comentario | Declarado en la rev. 1 §4.2 como el punto que podía obligar a tocar una pantalla cerrada. La medida deja de escribirse aquí y se delega al token |
| `src/app/(app)/prospectos/[id]/page.test.tsx` | Modificado — 1 aserción + comentario | Consecuencia directa del anterior: el test de "única fuente" comprobaba el literal `"76px"` y ahora comprueba la referencia al token |

**Ninguna función existente cambia de firma.** `NAV_ITEMS`, `isRootRoute` y `esFichaProspecto` quedan intactos. Cero cambios en `convex/`.

---

## 5. Tests añadidos (+33)

**`scrollArriba` (9)** — sube con `top: 0` · anima por defecto · no anima con `prefers-reduced-motion` · sin `matchMedia` no lanza · pulsación simple cancela y sube · los cuatro modificadores dejan pasar el clic.

**`TabBar` (4)** — los 3 destinos con su href · `aria-current` solo en el activo · el activo lleva el manejador · los no activos no.

**`Sidebar` (5)** — los mismos tres casos de navegación · el CTA es un `<a href="/prospectos/nuevo">` y no un botón · está presente también fuera de las rutas raíz.

**`nav` (4)** — `muestraFab` en las 3 raíces · en la ficha · **no** en las dos pantallas de captura · un id que empieza por "nuevo" es ficha y sí lleva "+".

**`AppShell` (11)** — FAB presente en las 4 rutas que corresponden · ausente en las 2 de captura · href y `aria-label` · anclaje sobre TabBar en raíz · anclaje sobre la CTA en la ficha · los dos cruces de independencia de §3.

---

## 6. Lo que este trabajo NO hace

- No toca JOS-27 (repaso responsivo) ni JOS-72 (menú de cuenta).
- No cambia colores, iconos ni copy.
- **Cero cambios en `convex/`**: ni esquema, ni queries, ni mutations, ni índices. Por eso sigue pendiente el arreglo del comentario de presupuesto en `convex/lib/constants.ts` (dice 29,8 % estimado; lo medido es 33,9 %), que espera a la próxima tarea que sí toque backend.
- No añade dependencias.
- No hay verificación en navegador real (ver §4 de los gates).

---

## 7. Proceso

1. ✅ Plan rev. 1 → auditoría → **NO-GO condicionado** (2026-08-05).
2. ✅ Decisión 1 resuelta por el issue owner: **Opción A**, registrada en JOS-26.
3. ✅ Plan rev. 2 (este documento) → **GO** para la Opción A.
4. ✅ Implementación dentro del alcance autorizado, más las tres ampliaciones declaradas en §4.
5. ✅ Gates: tests 42/42 ficheros y 439 tests, lint y build, todos con exit real 0 (`JOS-25-26-gates.txt`).
6. ⬅️ **AQUÍ ESTAMOS.** Auditoría del código → GO/NO-GO.
7. Con el GO **y el OK explícito del product owner**: commit, push y PR contra `master`. El merge lo hace él.
8. Railway despliega al fusionar.
