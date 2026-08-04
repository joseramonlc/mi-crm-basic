# PLAN JOS-24 — BOCADO B: la pantalla `/resumen`

**Revisión 6** · 2026-08-04 · corrige los dos mayores de la auditoría DEL CÓDIGO (4ª vuelta)
**Issue:** [JOS-24](https://linear.app/jose-lumbreras/issue/JOS-24/pantalla-dashboard-resumen-global-del-estado-del-pipeline) · Milestone M7 · Prioridad Alta
**Plan matriz:** [`JOS-24-plan.md`](./JOS-24-plan.md) rev. 4 §5 (+ §4.4-ter) — este documento **no lo sustituye**: lo desarrolla al nivel de detalle que exige escribir el código.
**Diseño aprobado:** [JOS-62](https://linear.app/jose-lumbreras/issue/JOS-62) · UI kit de referencia: `Design/…/ui_kits/crm-networker/screens.jsx:140-181`
**Rama:** `joseramonlc/jos-24-bocado-b-pantalla-resumen`
**Base:** `origin/master` = `38a23cf` (verificado con `git fetch --prune`; el árbol local estaba limpio y ya en master, sin rama previa que borrar)

---

## Respuesta a la 4ª auditoría — la DEL CÓDIGO (NO-GO, 2026-08-04)

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | Con `prospectos.exacto === false` y vencidos/hoy a 0, la pantalla afirmaba *"No tienes seguimientos pendientes"* | Mayor | **Aceptado. Es un bug real y de mi cosecha.** La rama `total === 0` se saltaba `cifra()` para afirmar una AUSENCIA que la lectura truncada no demuestra. Corregido: `total === 0 && exacto`. Dos tests nuevos (el caso parcial no lo dice; el exacto sí) |
| 2 | `sinActividad` no exigía `prospectos.exacto`, ocultando altas fuera del subconjunto leído | Mayor | **Aceptado, y es el mismo error que el 1.** Mi comentario justificaba omitir el flag porque `totalEnPeriodo === 0` implica lectura exacta de interacciones — cierto, pero **no dice nada de los prospectos**. Corregido con los dos flags explícitos. Dos tests nuevos |
| 3 | El test de retención no pulsaba el selector: solo forzaba `undefined` y re-renderizaba | Menor | **Aceptado.** Probaba el estado, no la transición. Reescrito: ahora `useQuery` responde por argumentos, se **pulsa** el pill de 30 días y se comprueba que las secciones 2, 3 y 5 siguen en pantalla |
| 4 | El plan seguía exigiendo `"1.200"` mientras código, tests y gates acreditan `"1200"` | Menor | **Aceptado.** Corregidas las cuatro apariciones. El formato correcto es el del código: en español los números de cuatro cifras van sin separador |

> **Los dos mayores son el mismo fallo con dos disfraces:** una rama especial que, para dar un texto más amable, esquiva la regla de §5.2 y afirma una ausencia sobre datos parciales. La regla no admite excepciones aunque el número observado sea cero — **un cero observado sobre una lectura truncada no es una ausencia, es un mínimo**. Ambas correcciones llevan ahora el flag en la condición, y los cuatro tests nuevos fijan las dos caras (parcial no lo afirma / exacto sí).

---

## ✅ GO del plan (3ª auditoría, 2026-08-04) y sus cinco condiciones

> *"Este es un GO del plan, no todavía una aprobación del código, que aún no existe en el árbol revisado."*

| # | Condición | Dónde queda cumplida |
|---|---|---|
| 1 | La congelación real de Railway y sus horas, registradas en el fichero de gates | §6.3, pasos 1 y 4. Se anotan también los resultados de las comprobaciones 2 y 5 (web caída / web restablecida) |
| 2 | Restauración desde el snapshot, **nunca** `seed populated` | §6.2. El seed ya no forma parte del procedimiento |
| 3 | Verificar **contenido representativo**, no solo recuentos | §6.2, paso 3: un `_id` concreto anotado en §6.1 |
| 4 | El backup, **fuera del repositorio** | §6.1. Aceptada, con una variante razonada: `~/crm-backups/` en vez de `/tmp` — ver la nota de §6.1 |
| 5 | El GO definitivo exigirá las salidas reales de tests, lint, build, TypeScript y medición | §5 y §9, pasos 5-7. Ninguna se da por buena sin volcar su salida íntegra |

**Sobre la condición 4.** El objetivo —que un fichero de datos no entre en el alcance del commit— se cumple igual y con menos riesgo fuera de `/tmp`. Entre el backup y la restauración, **ese fichero es la única copia de los datos**: en `/tmp` un reinicio de la máquina se lo llevaría justo en la ventana en que hace falta. `~/crm-backups/` está igualmente fuera del repositorio (no puede entrar en un commit ni aparecer en `git status`), **fuera de Dropbox** (ni EACCES ni una copia de la base de datos sincronizada a la nube) y sobrevive a un reinicio. Si la auditoría prefiere `/tmp` pese a ello, se cambia: el requisito de fondo se respeta en ambos casos.

---

## Respuesta a la 2ª auditoría (rev. 3 → NO-GO por bloqueante de restauración)

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | La restauración usaba `seed populated` y solo importaba el snapshot si los recuentos fallaban; `populated` fabrica datos, no restaura los tuyos | Bloqueante | **Aceptado sin reservas.** §6.2 reescrito: el import del snapshot es **el primer paso y el único camino**, y las comprobaciones pasan a acreditar el resultado en vez de decidirlo. Se añade verificación de **contenido representativo** (un `_id` concreto), que es lo que la coincidencia de recuentos no demuestra. `seed populated` sale de la restauración |
| 2 | El backup es del deployment completo; `--replace-all` puede pisar escrituras concurrentes. Confirmar aislamiento o usar deployment de prueba | Mayor | **Comprobado, y salía mal: NO estaba aislado.** La app de Railway apunta al mismo deployment (`adamant-mockingbird-816`) — evidencia en §6.3. **Cerrado**: el product owner aprobó el 2026-08-04 congelar Railway durante la ventana, con horas de congelación y reactivación anotadas en los gates y comprobación de que la web no responde |
| 3 | `convex export` y sus opciones existen en la versión instalada | — | Confirmado por ambas partes |

**Cerrados y confirmados por esta auditoría:** D3 (política distinta para período y `dayKey`, con test 15) · D6 (`diaCompletoDesde === null`, con test 16) · cobertura repuesta de `textos.ts` (tests 17-19).

---

## Respuesta a la 1ª auditoría (rev. 2 → NO-GO condicional)

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | La retención D3 conserva el payload también al cambiar `dayKey`; "se sustituye en el mismo ciclo" no lo garantiza `useQuery` | Mayor | **Aceptado sin matices. La auditoría tiene razón y la mitigación anterior era una afirmación sin respaldo.** Corregido en D3: la retención pasa a estar **anclada al `dayKey`**. Cambio de período → se retiene; cambio de día → se descarta. La distinción no es una convención: se apoya en qué hace y qué no hace el backend (§0) |
| 2 | Con `exacto === false` y `diaCompletoDesde === null` no queda fijado que **toda** barra sea "sin datos"; los ceros de `serie` podrían pintarse como ceros reales | Mayor | **Aceptado.** Era un agujero real: mi regla `dayKey < diaCompletoDesde` **nunca dispara** con `null`, así que la serie entera se habría pintado con ceros reales — justo lo que §5.2 del plan matriz prohíbe. Corregido en D6 con un **predicado único** que cubre los tres casos, más test dedicado |
| 3 | Retirar `textos.test.ts` deja sin cobertura directa las combinaciones puras (formato de fecha, `Intl.NumberFormat`, `avisoSerie`) | Menor | **Cobertura repuesta, sin reabrir la decisión de producto.** `avisoSerie` tiene 3 ramas y `fraseActividad` 4 combinaciones: se enumeran **todas** como casos de `page.test.tsx`, más las dos fronteras de formato (millar y fecha). Detalle y justificación en D5 |
| 4 | El borrado en cascada del tenant exige backup verificable y comprobación explícita de restauración, no solo el seed `populated` | Menor | **Aceptado.** §6 pasa a exigir snapshot con `npx convex export` **antes** de tocar nada, con recuentos anotados, y verificación de la restauración contra esos recuentos. Sobre `rm -rf .next`: ver §6.0 |
| 5 | La medición real no está acreditada; no cabe GO definitivo de rendimiento | Menor | **De acuerdo, y es la propia posición del plan.** Lo que se somete a GO aquí es la **implementación**, no el rendimiento. El gate de §6 se ejecuta con el código escrito y **antes** de la auditoría de código, que es quien verá las cifras reales |

---

## 0. Punto de partida verificado sobre el código real

| Hecho | Verificación |
|---|---|
| La query existe y su contrato es el de §2.6 | `convex/resumen.ts:45-169`, con validador `returns` explícito |
| `/resumen` **no existe**; la pestaña ya apunta ahí | `src/components/layout/nav.ts:5`. Hoy es un 404 |
| `porEtapa` suma exactamente las filas leídas | `convex/resumen.ts:100-101`: cada fila incrementa uno y solo un contador |
| Secciones 2, 3 y 5 **no dependen** del período | `convex/resumen.ts:100-117`: `porEtapa`, `pendientes` y `totales` se calculan sin tocar `desdeMs`/`hastaExclusivoMs`. La independencia es del backend; la UI solo la respeta |
| `serie` trae siempre `dias` elementos, con 0 explícito | `convex/resumen.ts:143-146` |
| Existe `buttonStyle()` para que un `<Link>` se vea como botón sin serlo | `src/components/ui/Button.tsx:33` |
| Tailwind v4 está activo → `sr-only` disponible | `src/app/globals.css:1` |

---

## 1. Alcance

**Entra:** la pantalla `/resumen` de solo lectura con las cinco secciones de §5, el componente `BarChart`, y el cierre del gate de medición contra deployment real (§4.4-ter del plan matriz).

**No entra:** ningún cambio en Convex (la query queda **intacta**), ninguna pantalla existente, métrica de conversión (Decisión 1 del plan matriz), navegación a fichas, escritura de datos.

### Ficheros

| Fichero | Operación | ¿En la tabla de §1 del plan matriz? |
|---|---|---|
| `src/app/(app)/resumen/page.tsx` | Nuevo | Sí |
| `src/app/(app)/resumen/textos.ts` | Nuevo | Sí |
| `src/app/(app)/resumen/error.tsx` | Nuevo | Sí |
| `src/app/(app)/resumen/page.test.tsx` | Nuevo | Sí |
| `src/app/(app)/resumen/error.test.tsx` | Nuevo | Sí |
| `src/components/ui/BarChart.tsx` | Nuevo | Sí |
| `src/components/ui/BarChart.test.tsx` | Nuevo | Sí |
| `src/components/ui/index.ts` | Modificado — un `export *` más | Sí |

**La lista es exactamente la del plan matriz: ni un fichero más** (ver D5, retirada). Ningún fichero de `convex/` se toca. Ningún fichero existente salvo `index.ts` (una línea).

---

## 2. Decisiones que este plan toma (y que la auditoría debe validar)

### D1 · El estado "CRM vacío" se deriva en cliente, sin campo nuevo del servidor

**El problema.** Pipeline y Actividad Diaria reciben `tieneProspectos` del servidor, con el comentario explícito *"grupos vacíos por sí solos no bastan"* (`prospectos/page.tsx:64`). `resumen` **no devuelve ese campo**. La salida fácil sería añadirlo — pero eso significa tocar la query ya auditada y mergeada.

**Por qué aquí no hace falta.** El razonamiento de las otras dos pantallas no aplica: allí las listas pueden estar vacías con prospectos existentes (seguimientos futuros, etapas terminales, filtros). Aquí la lectura es **una pasada sin filtro sobre todo el tenant**:

```
suma(porEtapa) === filas.length            (convex/resumen.ts:100-101, un incremento por fila)
suma(porEtapa) === 0  ⟹  filas.length === 0  ⟹  no hubo truncamiento  ⟹  exacto === true
```

Es decir: **`totales.activos + totales.descartados === 0` es equivalente a "el tenant no tiene ni un prospecto"**, y lo es sin ambigüedad, porque el caso truncado da 1.200, nunca 0. No es una heurística: es una identidad que se sigue del código citado.

**Decisión: derivarlo en cliente.** Cero lecturas nuevas, cero cambios en el backend auditado. Se fija con un test y se comenta en el código señalando la identidad, para que nadie lo lea después como una suposición floja.

### D2 · La marca de parcialidad es el sufijo `+` en cada cifra, más un banner

§5.2 exige que *"un número marcado como no exacto nunca se muestra desnudo"*, con *"el mismo lenguaje que ya usa el Pipeline"* — que es `textoTotal()` → `"200+"` más el banner de vista parcial.

**Por qué el `+` es semánticamente exacto en las siete métricas de prospectos.** Todas se calculan iterando el subconjunto leído: cada recuento es un **cota inferior** del valor real (`convex/resumen.ts:100-117`). Vale para las etapas, para vencidos, para hoy, para `nuevosEnPeriodo` y para los tres totales. No hay ninguna métrica de prospectos donde `+` mienta.

Regla de implementación, única y sin excepciones:

```ts
cifra(valor, exacto)  →  exacto ? "1200" : "1200+"
```

Toda métrica de la tabla de §5.2 se renderiza a través de esa función, pasándole **su** flag. No existe otra vía de pintar un número en esta pantalla. Es lo que hace verificable la regla "por métrica y no por sección".

### D3 · Al cambiar de período se retiene el último resultado (evita el parpadeo global)

**El problema, que el plan matriz no previó.** `useQuery` de `convex/react` devuelve `undefined` mientras la query re-corre con argumentos nuevos. Al tocar el selector, la pantalla entera pasaría a "Cargando…" y volvería — incluidas las secciones 2, 3 y 5. Visualmente, el selector afectaría a **toda** la pantalla, que es justo lo contrario de lo que §5 promete y de lo que exige el test de §6.

**Decisión: retener el último payload entregado, pero SOLO dentro del mismo día.**

> ⚠️ **Corregido en la rev. 3.** La rev. 2 retenía ante *cualquier* recarga y afirmaba que el payload se sustituía "en el mismo ciclo". Eso **no lo garantiza `useQuery`**: `useDayKey` también cambia sus argumentos a medianoche, y ahí lo retenido pertenece a **otro día**. Los "pendientes" son exactamente eso — `convex/resumen.ts:75,104-108` los calcula con `ventanaDia(dayKey)` —, así que la pantalla habría mostrado los vencidos y el "para hoy" de ayer, sin decirlo, durante toda la ida y vuelta a la red. La auditoría acertó de pleno.

El `useRef` guarda **el payload junto con el `dayKey` con el que se pidió**, y la política es distinta según qué haya cambiado:

| Qué cambió | Política | Por qué |
|---|---|---|
| **Período** (mismo día) | **Retener** secciones 2, 3 y 5; sección 4 con `aria-busy` | Esas tres no dependen del período: `convex/resumen.ts:100-117` las calcula sin tocar `desdeMs`/`hastaExclusivoMs`. Lo retenido **sigue siendo verdad** |
| **`dayKey`** (medianoche) | **Descartar todo** → pantalla de carga | La sección 3 depende del día por construcción. Lo retenido **ya no es verdad**, y no hay forma honesta de pintarlo |
| Primera carga | Pantalla de carga | No hay nada que retener |

Regla en código, deliberadamente en un solo sitio:

```ts
// Se retiene por PERÍODO, nunca por DÍA: cruzada la medianoche, los pendientes
// de ayer son datos falsos, no datos viejos.
const mostrable = datos ?? (retenido.current?.dayKey === dayKey ? retenido.current.datos : undefined);
```

Consecuencias declaradas:

- Al tocar el selector, las secciones 2, 3 y 5 no parpadean y su contenido es **idéntico** antes y después.
- Durante ~una décima de segundo la sección 4 muestra el período anterior. Es una lectura reciente, no inventada, y el rótulo (`periodo.desde`/`hastaIncluido`) viaja **dentro del mismo objeto retenido**: nunca se desincroniza de la serie que acompaña.
- A medianoche la pantalla muestra su estado de carga durante ese ida y vuelta. **Es el comportamiento correcto**: preferimos un instante de "Cargando…" a un instante de cifras falsas. Coincide además con lo que ya hacen Pipeline y Actividad, que no retienen nada.

Las dos alternativas se descartan por lo mismo: aceptar el parpadeo global incumple §5 de forma observable; retener sin anclar al día muestra datos falsos.

### D4 · "Sin actividad reciente" es un estado de la **sección 4**, no de la pantalla

JOS-62 enumera tres estados y el plan matriz los repite en §5.3. Al bajarlos a código, dos son excluyentes a nivel de pantalla (**normal** y **CRM vacío**) y el tercero no: si hay prospectos pero ninguna interacción en el período, las secciones 2, 3 y 5 tienen contenido legítimo que **debe** verse. Ocultarlas sería perder información por un tecnicismo de nomenclatura.

**Decisión:** `interacciones.totalEnPeriodo === 0` → gráfico plano (todas las barras a cero visible) y una frase sobria en la sección 4; el resto de la pantalla, normal. Se declara aquí porque es una lectura interpretativa de la especificación, no una omisión.

### D5 · ~~Se añade `textos.test.ts`~~ → **RETIRADA (2026-08-04)**

> Propuesta original: un fichero de test para las funciones puras de `textos.ts`, por analogía con Pipeline y Actividad Diaria, que sí lo tienen.

**Retirada tras revisarla con producto.** La analogía no se sostiene: el `textos.ts` de esas dos pantallas contiene aritmética civil de fechas de verdad (`formatTimeAgo`, `textoSeguimiento` con `diffCalendarDays` y fronteras de medianoche), donde un test unitario tabular gana mucho. El de esta pantalla es **formato y concatenación**.

Y hay una razón de fondo, no solo de coste: la garantía que importa aquí no es *"`cifra()` añade el `+`"*, sino ***"ninguna métrica llega a la pantalla sin su marca"***. Eso solo lo demuestra un test sobre el DOM renderizado. Un unitario verde sobre `cifra()` convive perfectamente con una página que se olvide de llamarla — es decir, cubriría lo fácil y dejaría fuera justo el riesgo. Los tests 3, 4 y 6 de §4 ya recorren esas combinaciones por donde de verdad cuentan.

**El alcance de ficheros vuelve a ser exactamente el del plan matriz.** Si al escribir el código alguna función pura resultara tener una superficie combinatoria incómoda de cubrir por DOM, se plantea entonces con el caso concreto delante — no se preautoriza ahora.

#### Respuesta al menor 3 de la auditoría (rev. 3): la cobertura se repone, no se pierde

La auditoría objeta —con razón— que retirar el fichero deja sin cobertura *directa* las combinaciones puras. La superficie real es pequeña y **finita**, así que se enumera **entera** como casos de `page.test.tsx`, variando únicamente el payload simulado:

| Función | Combinaciones | Dónde quedan cubiertas |
|---|---|---|
| `avisoSerie` | 3 (exacta · parcial-desde-fecha · serie no fiable) | Tests 6, 16 y el caso exacto del test 1 |
| `fraseActividad` | 4 (los dos flags × 2) | Tests 3, 4, 17 y el caso exacto del test 1 |
| `numero` | frontera del separador de millar (1200 / 10.000) | Test 18 |
| `rotuloPeriodo` | formato de fecha larga en español | Test 19 |

Son **9 combinaciones, todas enumeradas**, no una muestra. La diferencia con un fichero aparte es dónde se afirman, no cuántas: y afirmándolas sobre el DOM se prueba además que la página **usa** esas funciones, que es la garantía que de verdad protege al usuario.

Si aun así la auditoría considera insuficiente la cobertura por DOM, es una decisión de producto reabrir D5 — no la cambio por mi cuenta habiéndola cerrado el product owner.

### D6 · "Sin datos" ≠ "cero", y la diferencia no se confía solo al color

Cuando `interacciones.exacto === false`, los días no cubiertos por completo **no se midieron**. Pintarlos como 0 sería afirmar algo falso.

#### El predicado, único y exhaustivo (corregido en la rev. 3)

> ⚠️ **Agujero detectado por la auditoría.** La rev. 2 decía "sin datos si `dayKey < diaCompletoDesde`". Con `diaCompletoDesde === null` esa comparación **no dispara nunca**, así que en el peor caso —serie entera no fiable— se habrían pintado 30 ceros reales: exactamente la afirmación falsa que §5.2 del plan matriz prohíbe, y encima anunciada a los lectores de pantalla como "sin interacciones". El fallo no estaba en la intención sino en que la regla se escribió mirando un solo caso.

```ts
// ÚNICA definición de "sin datos" de la pantalla. Los tres casos, en una línea:
//   exacto            → nada sin datos (no hubo truncamiento)
//   diaCompletoDesde  → sin datos los días anteriores a esa fecha
//   null + !exacto    → NINGÚN día quedó completo: TODOS son sin datos
const sinDatos = (dayKey: string) =>
  !exacto && (diaCompletoDesde === null || dayKey < diaCompletoDesde);
```

Las tres ramas se derivan del contrato de `convex/resumen.ts:188-203`, y la comparación lexicográfica es la misma que usa el handler (línea 202): válida y exacta en `YYYY-MM-DD`.

Nota de por qué "sin datos" y no "al menos N": un día parcialmente cubierto puede tener interacciones retenidas, así que su recuento sería una cota inferior. Se descarta pintarlo como barra pequeña con `+`: §5.2 del plan matriz ya fijó que esos días **se dibujan como sin datos, visualmente distintos de un 0 real**, y mezclar dos lenguajes de parcialidad en el mismo gráfico lo haría ilegible. Sobre esos días, el total del período —que sí lleva su `+`— es quien informa.

#### Los tres canales

Ningún día "sin datos" recibe jamás la etiqueta "sin interacciones":

| | Barra | Texto oculto de la barra | Frase resumen |
|---|---|---|---|
| Valor 0 real | Traza vacía + **tope de línea base de 2 px** | "martes, 4 de agosto: sin interacciones" | — |
| Sin datos | Traza con **patrón rayado**, sin tope | "martes, 4 de agosto: sin datos" | declara el período no cubierto entero |

El texto oculto es texto real en el DOM (`sr-only`), no `aria-label` sobre un elemento no interactivo: se anuncia siempre y se puede afirmar en test con `getByText`. Cumple WCAG 1.4.1 (el color/patrón nunca es el único canal).

Con la serie entera no fiable, el gráfico se pinta **íntegramente rayado** (30 trazas, ninguna barra) sobre el aviso de `avisoSerie`. Es honesto y coherente: no se oculta el gráfico —el rótulo del período y el resto de la sección siguen teniendo sentido— pero no afirma ni un solo valor.

### D7 · Copy del CTA del estado vacío — ✅ **RESUELTA**

§5.3 cita de JOS-62 el CTA *"Empieza añadiendo prospectos"*. Las otras dos pantallas raíz usan **"Añadir prospecto"** con `href="/prospectos/nuevo"` (`prospectos/page.tsx:66`, `actividad/page.tsx:80`), y `EmptyState` le antepone un icono `+`.

**Resuelta: "Añadir prospecto"**, por coherencia entre las tres pantallas raíz y porque es una etiqueta de botón, no una frase.

> ✅ **Aprobado por el product owner el 2026-08-04**, con autorización expresa para apartarse del copy de JOS-62 en este punto. Es la segunda desviación autorizada sobre ese diseño, tras la Decisión 2 del plan matriz (rótulos del selector de período). La aprobación es de producto, no de la auditoría.

---

## 3. La pantalla, sección a sección

Ruta `src/app/(app)/resumen/page.tsx`, componente cliente (`"use client"`), contenedor y `<h1>` con el mismo patrón exacto que las otras dos pantallas raíz.

```
useDayKey()  →  dayKey
useState     →  periodo: "semana" | "mes"   (inicial "semana")
useQuery(api.resumen.resumen, { dayKey, periodo })  →  retenido (D3)
```

### Sección 1 · Cabecera

`<h1>Resumen</h1>` + `PillSelect` con `"Últimos 7 días"` / `"Últimos 30 días"` (Decisión 2 del plan matriz, aprobada por producto el 2026-08-03). `label` del grupo: "Período" — el `radiogroup` necesita nombre accesible.

### Sección 2 · Distribución del pipeline — dato principal

Las 6 etapas en el orden de `OPCIONES_ETAPA` (`@/lib/etiquetas`), cada una: `StageBadge` + barra horizontal proporcional + cifra. Réplica del embudo del UI kit (`screens.jsx:155-163`), que ya usa `--color-stage-*-dot` sobre traza `--color-neutral-100`.

- Denominador de la proporción: **el máximo entre las seis etapas** (como el kit), mínimo 1 para no dividir por cero.
- Las etapas a 0 se listan igualmente, con barra vacía: un embudo con huecos no se lee.
- Con `prospectos.exacto === false`: banner de vista parcial + todas las cifras con `+`. La proporción de las barras se calcula sobre lo leído; el banner impide leerlo como el reparto del total.

### Sección 3 · Seguimientos pendientes

`Card` con número grande = `vencidos + hoy`, desglose "N vencidos · M para hoy", y enlace **"Ver en Actividad Diaria →"** (`<Link href="/actividad">` con `buttonStyle({ variant: "ghost" })`, patrón de `EmptyState`). Navega; no escribe nada. Gobernado por `prospectos.exacto`.

### Sección 4 · Actividad — la única que depende del período

Contiene cuatro cosas, **con dos orígenes distintos** (es la razón de ser de la regla "por métrica"):

| Elemento | Flag |
|---|---|
| `BarChart` de la serie | `interacciones.exacto` + `diaCompletoDesde` |
| Total de interacciones del período | `interacciones.exacto` |
| **Nuevos prospectos del período** | **`prospectos.exacto`** |
| Rótulo del período (`desde` – `hastaIncluido`) | — (no es una métrica) |

Frase resumen, que repite en texto lo que dibuja el gráfico:
`"12 interacciones y 3 prospectos nuevos entre el 29 de julio y el 4 de agosto."`
Cada cifra pasa por `cifra()` con **su** flag: el caso mixto (`"12 interacciones y 3+ prospectos nuevos"`) es exactamente el que exige el test de §6.

Si `interacciones.exacto === false`: aviso adicional. Con `diaCompletoDesde !== null`, que los días previos a esa fecha no están cubiertos; con `diaCompletoDesde === null`, que **la serie entera** no es fiable.

### Sección 5 · Totales

`Card` con tres cifras: activos / incorporados / descartados. Con `prospectos.exacto === false` el encabezado deja de decir "Totales" y pasa a **"Recuento parcial"** (lo exige §5.2 literalmente), y las tres cifras llevan `+`.

### `BarChart` — `src/components/ui/BarChart.tsx`

Sin librería, sin ejes, sin interactividad, sin tooltips (§5.1). Divs en flex; **nada de SVG con `width` fijo**, que es la vía por la que aparecería scroll horizontal.

```tsx
interface BarChartProps {
  datos: Array<{ dayKey: string; valor: number; sinDatos?: boolean }>;
  etiqueta: (d: { dayKey: string; valor: number; sinDatos?: boolean }) => string; // texto sr-only
  rotulo?: (dayKey: string, indice: number, total: number) => string | null;      // eje: null = sin rótulo
  ariaLabel: string;
}
```

- `<ul>` con un `<li flex:1 minWidth:0>` por día → 30 barras caben en 375 px sin desbordar (≈8 px + `gap: 2px`). El contenedor **no** lleva `overflow-x`.
- Altura fija 120 px; altura de cada barra = `valor / max` (max ≥ 1), con **mínimo 2 px cuando `valor > 0`** para que un 1 no se confunda con un 0.
- `sinDatos` → traza rayada (`repeating-linear-gradient`), sin barra ni tope.
- Cada `<li>` contiene un `<span className="sr-only">` con el texto de `etiqueta(...)`.
- Rótulos del eje: en 7 días, la inicial del día de la semana bajo cada barra; en 30, solo primera y última. Nada técnico.
- El componente es **presentacional puro**: no conoce `resumen`, ni parcialidad, ni fechas. Recibe `sinDatos` ya resuelto por día. Quien lo decide es la página, con el **predicado único de D6** — que cubre las tres ramas, incluida `diaCompletoDesde === null`.

### Textos y formato — `textos.ts`

Todo el copy fuera del componente, más estas funciones puras:

| Función | Qué hace |
|---|---|
| `numero(n)` | `Intl.NumberFormat("es-ES")` → `"1200"`, `"10.000"` |
| `cifra(n, exacto)` | `numero(n)` + `"+"` si no es exacto — **única vía de pintar un número** |
| `fraseActividad(datos)` | La frase resumen, con un flag por métrica |
| `avisoSerie(exacto, diaCompletoDesde)` | `null` \| parcial-desde-fecha \| serie-no-fiable |
| `etiquetaBarra(dayKey, valor, sinDatos)` | Texto `sr-only` de cada barra |
| `rotuloPeriodo(desde, hastaIncluido)` | "entre el 29 de julio y el 4 de agosto" |

Las fechas se formatean reutilizando `formatearFechaEs` (`@/lib/etiquetas`) sobre `zonedMidnightToMs(parseDayKey(dayKey), APP_TZ)`. **No se reimplementa aritmética de fechas en el cliente**: §3.2 del plan matriz dice que la UI nunca construye rangos, y esto lo respeta — solo convierte un `dayKey` que ya viene dado en texto legible.

### `error.tsx`

Copia exacta del patrón de `actividad/error.tsx` (contrato Next 16: `error` + `unstable_retry`), con el título "No se pudo cargar el resumen".

---

## 4. Tests

**Los ocho de §6 del plan matriz, uno a uno:**

1. Los tres estados renderizan lo suyo (normal · CRM vacío · sin actividad reciente).
2. El selector cambia **solo la sección 4**: se afirma que los textos de las secciones 2, 3 y 5 son idénticos antes y después de tocar el pill.
3. `prospectos.exacto === false` → **ninguna** de sus siete métricas aparece sin `+`.
4. Caso mixto en la sección 4: `prospectos.exacto === false` + `interacciones.exacto === true` → "nuevos" marcado, interacciones sin marcar.
5. Días anteriores a `diaCompletoDesde` **no** se dibujan como 0 (se afirma el texto "sin datos", no un "0").
6. `diaCompletoDesde === null` con `exacto === false` → la serie entera se declara no fiable.
7. El enlace a Actividad Diaria tiene `href="/actividad"` y no invoca ninguna mutation.
8. Valores del gráfico accesibles sin visión (`getByText` de las etiquetas `sr-only`).

**Añadidos por las decisiones de este plan:**

9. D1 — `porEtapa` todo a cero → `EmptyState`; y con una sola etapa a 1, **no** aparece.
10. D3 — al cambiar de período mientras la query devuelve `undefined`, las secciones 2/3/5 siguen mostrando sus cifras (no aparece la pantalla de carga).
11. D3 — primera carga (`undefined` sin nada retenido) → pantalla de carga, sin secciones.
12. D6 — un 0 real y un "sin datos" producen textos distintos en la misma serie.
13. `BarChart` aislado: valor > 0 nunca produce altura 0; serie todo-ceros no rompe (max = 1); `sinDatos` no pinta barra.
14. `error.tsx` — "Reintentar" invoca `unstable_retry` una vez (patrón ya establecido).

**Añadidos por el NO-GO de la rev. 2:**

15. **Mayor 1** — al cambiar el `dayKey` (medianoche) con la query en `undefined`, **no** se retiene nada: aparece la pantalla de carga y **ninguna** cifra del día anterior queda visible. Es el test que distingue las dos políticas de D3, y se afirma sobre la sección 3 (pendientes), que es la que dependía del día.
16. **Mayor 2** — con `exacto === false` y `diaCompletoDesde === null`, **las 30 barras** son "sin datos": ni una sola etiqueta dice "sin interacciones", ni siquiera en los días cuyo `valor` es 0 en el payload.
17. Menor 3 — cuarta combinación de `fraseActividad`: ambos flags a `false` (las dos cifras marcadas).
18. Menor 3 — frontera del separador de millar: 1200 se pinta `"1200"` y `"1200+"` si es parcial; 10.000 sí lleva separador.
19. Menor 3 — el rótulo del período se pinta en fecha larga española.

Las funciones puras de `textos.ts` quedan cubiertas **a través del DOM**, con sus 9 combinaciones enumeradas (tabla de D5), no por un fichero propio.

**Recuento esperado:** ~29-33 tests nuevos en **3 ficheros** (`page.test.tsx`, `error.test.tsx`, `BarChart.test.tsx`). Se contrastará el **número de ficheros ejecutados** con los que hay en disco, por lo de los verdes falsos.

---

## 5. Gates de cierre

| Gate | Cómo se acredita |
|---|---|
| `npx tsc --noEmit` | Salida íntegra. Esperados **los 5 errores preexistentes** de `import.meta.glob` — ni uno más. Este bocado no añade ficheros de test en `convex/`, así que el número **no debe crecer** |
| `npm run lint` | Salida íntegra |
| `npm run build` | **Sin canalizar por `tail`** (fue uno de los verdes falsos). La ruta `/resumen` **debe** aparecer ahora en la tabla de rutas — es la comprobación objetiva inversa a la del bocado A |
| `npm test` | Salida íntegra + recuento de ficheros contrastado contra `find` |
| **Medición contra deployment real** | §6 de este documento — el gate trasladado desde el bocado A |

Todo se vuelca en `docs/auditoria/JOS-24-bocado-B-gates.txt` con la salida real, no con un resumen mío.

---

## 6. El gate trasladado: medición contra deployment real

Guión: [`JOS-24-e2e.md`](./JOS-24-e2e.md) §3, que ya está escrito. Se ejecuta **al terminar el código y antes de la auditoría**, porque su resultado puede obligar a revisar las cotas.

**Lo ejecutas tú, no yo.** Requiere navegador con sesión iniciada; el proyecto no tiene automatización de navegador. Te iré dando **una instrucción cada vez**, sin DevTools: las cifras salen del dashboard de Convex → Functions → `resumen:resumen`.

### 6.0 Entorno

Pausar la sincronización de Dropbox y `rm -rf .next` antes de arrancar (Dropbox bloquea `.next` → `EACCES: rmdir`); dev server **con `--webpack`**; abrir siempre `http://localhost:3000` (Clerk en desarrollo no carga en la IP de WSL).

> Sobre `rm -rf .next`, que la auditoría agrupa con el borrado de datos: **no son la misma clase de acción**. `.next` es salida generada por el compilador —caché de build—, no contiene nada escrito por una persona y se regenera sola en el siguiente arranque. Su borrado no necesita backup; el coste máximo es una compilación. El borrado que sí lo necesita es el de la base de datos, y va a continuación.

### 6.1 Backup verificable ANTES de tocar nada (exigido por la auditoría)

🔴 El seed **borra en cascada los prospectos e interacciones del tenant** en el deployment de desarrollo. Es por diseño desde JOS-22, para que el escenario sea reproducible. Procedimiento, en este orden y sin saltarse pasos:

```bash
# 1. Snapshot COMPLETO del deployment, restaurable, no un volcado de pantalla.
#    FUERA del repositorio y fuera de Dropbox (condición 4 de la auditoría).
mkdir -p ~/crm-backups
npx convex export --path ~/crm-backups/JOS-24-backup-pre-medicion.zip

# 2. Recuento de partida, que es contra lo que se verificará la restauración
npx convex data prospectos
npx convex data interacciones
```

Del paso 2 se anota además el **`_id`, nombre y etapa de un prospecto concreto**: es lo que se comprobará en §6.2 y lo que distingue una restauración real de una coincidencia de cifras.

Se anotan en el fichero de gates, **antes** de seguir: nombre del snapshot, su tamaño en bytes, y el número de filas de cada tabla. Sin esas tres cosas escritas, la medición no empieza.

`convex export` produce un fichero restaurable con `npx convex import`, que es lo que convierte esto en un backup y no en una impresión. El escenario `populated` **no** es un backup: reconstruye datos de ejemplo, no los tuyos.

### 6.2 Restauración desde el snapshot (corregido en la rev. 4)

> ⚠️ **Bloqueante de la 2ª auditoría, aceptado sin reservas.** La rev. 3 restauraba con `seed:seed populated` y solo importaba el snapshot **si los recuentos no cuadraban**. Eso está mal por dos motivos: `populated` **fabrica datos de ejemplo**, no devuelve los tuyos —documentos, IDs y contenidos serían otros—, y usar los recuentos como criterio permite que una coincidencia numérica dé por buena una restauración incorrecta. El seed queda **fuera** de la restauración.

La restauración es **el import del snapshot, siempre y como primer paso**, sin condicionarla a comprobación previa:

```bash
# 1. RESTAURAR — no es el plan B, es el plan
npx convex import --replace-all ~/crm-backups/JOS-24-backup-pre-medicion.zip
```

Solo después se **verifica** (las comprobaciones ya no deciden qué hacer; acreditan que lo hecho salió bien):

```bash
# 2. Recuentos contra lo anotado en 6.1
npx convex data prospectos
npx convex data interacciones
```

3. **Contenido representativo**, no solo cantidades: se comprueba que un prospecto concreto anotado en 6.1 —nombre, etapa y su `_id`— vuelve a estar ahí con los mismos valores. Es lo que distingue una restauración de una coincidencia de cifras.
4. **Funcionamiento**: `/resumen` y `/actividad` cargan y muestran datos coherentes.

`--replace-all` es la opción correcta aquí y no `--replace`: devuelve el deployment al estado del snapshot **borrando además las tablas que el import no contenga**, de modo que nada sembrado por el escenario `resumen` sobreviva. Ambas opciones están verificadas contra el CLI instalado.

Dos notas de alcance del snapshot, comprobadas y no supuestas:

- El esquema tiene **exactamente dos tablas** (`prospectos` e `interacciones`, `convex/schema.ts:52,77`), las dos que el seed toca. El snapshot las cubre íntegras.
- **No se usa almacenamiento de ficheros** en ninguna función de `convex/`, así que `--include-file-storage` no hace falta. Si algún día se usara, habría que añadirlo.

El resultado de los cuatro pasos se anota en el fichero de gates. El backup vive **fuera del repositorio** (`~/crm-backups/`), así que no puede entrar en un commit ni aparecer en `git status` — no hace falta tocar `.gitignore`. Se conserva hasta que el PR esté mergeado.

### 6.3 Aislamiento del deployment — ⚠️ HALLAZGO VERIFICADO (rev. 4)

> La 2ª auditoría pide *"confirmarse que el deployment está aislado o congelado"*. Se comprobó en vez de afirmarse, y **la comprobación sale mal**: no está aislado.

Evidencia, leída de la configuración real:

| Origen | Variable | Valor |
|---|---|---|
| Local (`.env.local`) | `CONVEX_DEPLOYMENT` | `dev:adamant-mockingbird-816` |
| **Railway (app desplegada)** | `NEXT_PUBLIC_CONVEX_URL` | `https://adamant-mockingbird-816.eu-west-1.convex.cloud` |

**La aplicación desplegada en Railway escribe contra el mismo deployment que la medición va a borrar y restaurar.** Es un residuo conocido —memoria del proyecto: *"apunta al Convex DEV; siguiente: migrar a Convex de producción al «ajustar»"*—, pero hasta ahora nunca había importado. Aquí sí: un `--replace-all` durante una escritura desde la app desplegada la perdería sin dejar rastro.

Matiz sobre "otros tenants", que es como la auditoría lo formula: el proyecto es de un solo usuario, así que no hay terceros. El riesgo real no es de terceros sino de **dos vías de escritura sobre los mismos datos** — el servidor local de la medición y la app desplegada — y basta con que el propio product owner abra la app en el móvil durante la ventana.

**La ventana debe cerrarse antes de medir.** Opciones, para decisión de producto:

| Opción | Qué implica | Verificable |
|---|---|---|
| **A — Congelar Railway durante la medición** (recomendada) | Escalar el servicio a 0 réplicas antes de empezar y devolverlo al terminar. La web queda inaccesible ~30 min | **Sí**: no hay proceso capaz de escribir |
| B — Acordar no abrir la app | Coste cero, pero descansa en recordarlo | No |
| C — Deployment de prueba aparte | Lo más limpio y lo que la auditoría sugiere como alternativa. Exige configurar Clerk y variables para un deployment nuevo: alcance propio, desproporcionado para cerrar este gate | Sí |

> ✅ **RESUELTA — Opción A, aprobada por el product owner el 2026-08-04.** Railway se congela durante la ventana de medición. Convierte el aislamiento en un hecho comprobable en vez de una promesa, es reversible con una sola acción y su coste es media hora de web caída en un MVP sin usuarios.

**Procedimiento, con la ventana acotada por escrito:**

1. Congelar el servicio de Railway a 0 réplicas. **Anotar la hora.**
2. Comprobar que la web ya no responde — el aislamiento se acredita, no se supone.
3. Ejecutar §6.1 (backup) → §3 del e2e (medición) → §6.2 (restauración y verificación).
4. Devolver el servicio a su escala original. **Anotar la hora.**
5. Comprobar que la web vuelve a cargar y muestra los datos restaurados.

Las dos horas anotadas y el resultado de los pasos 2 y 5 van al fichero de gates: son lo que permite afirmar que ninguna escritura ajena pudo entrar en la ventana.

**Deriva a registrar (no se resuelve aquí):** que la app publicada apunte al Convex de desarrollo es un residuo conocido, y este trabajo es la primera vez que causa un problema concreto. Se anotará como issue propio junto a la migración pendiente a un Convex de producción — fuera del alcance de JOS-24.

Cifras de contraste: **1.702 documentos (5,3 %)** y **5.485.256 B (32,7 %)**, medidas en memoria con `convex-test`. Si el servidor difiere de forma apreciable, **manda el servidor** y revisamos las cotas antes de dar por cerrado el bocado.

---

## 7. Lo que este plan NO hace

- No toca `convex/` — ni la query, ni el esquema, ni las constantes.
- No añade métrica de conversión (Decisión 1 del plan matriz, ya cerrada).
- No navega a fichas ni escribe datos desde el Resumen.
- No añade dependencias (el gráfico es CSS).
- No implementa el FAB `+` ni el menú de cuenta: son M8 y JOS-72.
- No cierra JOS-77 ni JOS-74.

---

## 8. Riesgos

| Riesgo | Gravedad | Mitigación |
|---|---|---|
| La medición real contradiga la de memoria | Media | Es el gate de §6. Manda el servidor; si no hay margen, se revisan las cotas antes de cerrar |
| 30 barras no quepan en 375 px | Media | Flex con `min-width: 0` y sin `overflow-x`; nada de anchos fijos. Se comprueba visualmente durante la medición (§3.3 del e2e, misma sesión) |
| El `+` se lea como "y algo más" en cifras pequeñas | Baja | Nunca aparece sin el banner de vista parcial, que explica el corte en 1.200. Es el lenguaje que el Pipeline ya usa desde JOS-21 |
| ~~El payload retenido (D3) muestre datos de otro día tras medianoche~~ | — | **Cerrado en la rev. 3, era un mayor de la auditoría.** La mitigación anterior ("se sustituye en el mismo ciclo") era una afirmación sin respaldo. La retención pasa a estar anclada al `dayKey`: cruzada la medianoche se descarta y se muestra el estado de carga. Lo fija el test 15 |
| ~~La serie entera no fiable se pinte como 30 ceros reales~~ | — | **Cerrado en la rev. 3, era el segundo mayor.** Predicado único de D6, con las tres ramas en una expresión. Lo fija el test 16 |
| Restaurar el tenant tras la medición deje datos incoherentes | Media | Snapshot con `npx convex export` **antes** de tocar nada; la restauración **es** el `import --replace-all`, no el seed (§6.2, bloqueante de la 2ª auditoría). Se verifica recuento **y contenido** (`_id` concreto). Comandos verificados contra el CLI instalado, no citados de memoria |
| ~~Una escritura desde la app de Railway durante la ventana se pierda al restaurar~~ | — | **Cerrado.** Verificado que el deployment NO estaba aislado (§6.3); se congela Railway durante la ventana, con horas anotadas y comprobación de que la web no responde. Aprobado por el product owner el 2026-08-04 |
| Una métrica futura se añada sin flag | Media | `cifra()` es la única vía de pintar un número y **exige** el flag como argumento: olvidarlo es un error de tipos, no un descuido de revisión |

---

## 9. Proceso

1. ✅ Plan rev. 2 → 1ª auditoría → **NO-GO condicional**: 2 mayores y 3 menores, todos cerrados en la rev. 3 y confirmados por la 2ª auditoría.
2. ✅ Plan rev. 3 → 2ª auditoría → **NO-GO**: bloqueante de restauración + riesgo de aislamiento.
3. ⬅️ **AQUÍ ESTAMOS.** Plan rev. 4 → 3ª auditoría → GO/NO-GO. **Los dos hallazgos, cerrados**: restauración corregida (§6.2) y aislamiento resuelto con la opción A (§6.3), aprobada por el product owner el 2026-08-04. **Sin decisiones de producto pendientes.**
   - Decisiones de producto cerradas: D5 retirada y D7 resuelta. El alcance de ficheros sigue siendo exactamente el del plan matriz: la respuesta al menor 3 **no** añade ficheros, solo enumera casos dentro de los ya previstos.
   - Lo que se somete a GO es la **implementación**. El rendimiento se acredita en el paso 6, no aquí.
4. Código del bocado B dentro del alcance autorizado.
5. Gates locales (§5) con salida íntegra.
6. Medición contra deployment real (§6): congelar Railway (§6.3) → backup (§6.1) → medir → restaurar desde el snapshot y verificar (§6.2) → reactivar Railway.
7. Auditoría del código, ya con las cifras reales delante → GO/NO-GO.
8. Con el GO **y tu OK explícito**: commit, push y PR contra `master`. El merge lo haces tú.
