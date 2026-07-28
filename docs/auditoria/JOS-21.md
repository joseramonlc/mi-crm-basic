# Auditoría — JOS-21 · Pantalla Pipeline de Prospectos (implementación)

| | |
|---|---|
| **Issue** | [JOS-21 · Pantalla Pipeline de Prospectos: vista agrupada por etapas](https://linear.app/jose-lumbreras/issue/JOS-21/pantalla-pipeline-de-prospectos-vista-agrupada-por-etapas) |
| **Milestone** | M5 · Pipeline de Prospectos (proyecto CRM-MVP) · prioridad High |
| **Rama** | `joseramonlc/jos-21-pantalla-pipeline-de-prospectos-vista-agrupada-por-etapas` (desde `master` `9c5c479`) |
| **Estado del código** | En árbol de trabajo, **sin commitear**. No hay commit, ni push, ni PR. |
| **Plan aprobado** | `docs/auditoria/JOS-21-plan.md` rev. 2 — **GO condicionado** |
| **Diff completo** | `docs/auditoria/JOS-21.diff` (1.329 líneas) |
| **Fecha del documento** | 2026-07-27 |
| **Revisión** | **rev. 3** — rev. 2 cerró el mayor de `notas`; rev. 3 incorpora la verificación parcial de auditoría contra deployment real |
| **Preparado para** | **Auditoría de implementación** (el veredicto GO/NO-GO lo emite el departamento de auditoría, no el autor) |

> Este documento **describe** el cambio para su auditoría; no es un veredicto. El §5 recoge el cumplimiento de las condiciones, el §6 los datos de la medición, y el §7 lo que **queda pendiente** y por qué.

> ## Rev. 2 — respuesta al NO-GO
>
> **Mayor (`notas` sin acotar) — CERRADO en código.** Se aceptó el diagnóstico: no era solo exposición de bytes, era una **vía de degradación por datos válidos del propio tenant** — un usuario pega notas enormes y rompe su propia pantalla sin poder arreglarlo desde la app.
>
> Al medir para decidir el tope apareció algo que la rev. 1 no sabía: **el tope de `notas` y `MAX_PIPELINE` están acoplados**, porque la query lee documentos completos contra el límite de 16 MiB. Con 500 por etapa, un tope generoso de 5.000 caracteres **ya superaba el límite (108 %)**. Es decir, la opción "aceptar el riesgo y demostrar que cabe" era **inviable con la configuración de la rev. 1**.
>
> Decisión de producto del usuario con los números delante: **`notas` ≤ 2.000 caracteres** y **`MAX_PIPELINE` baja de 500 a 200** → peor caso **19 % del límite**, ~5x de margen. Esto **revisa la decisión de los 500** que se había tomado en el plan sin este dato. Detalle en §6.
>
> Trazabilidad: **[JOS-74](https://linear.app/jose-lumbreras/issue/JOS-74/acotar-la-longitud-de-notas-evitar-degradacion-de-las-pantallas)** creada con el análisis y la medición. Los puntos de servidor y tests se implementan **en esta rama** (son condición del GO y no procede que el Pipeline llegue a producción con el riesgo abierto); JOS-74 conserva el punto de UI pendiente.
>
> **Bloqueantes 1 y 2 (latencia real y e2e) — SIGUEN ABIERTOS, por diseño.** Ambos requieren deployment levantado, navegador y sesión de Clerk. Se ha preparado el guión ejecutable **`docs/auditoria/JOS-21-e2e.md`**, con las comprobaciones, los comandos de seed y las casillas de la medición. Lo ejecuta el usuario. **Este documento no los da por cumplidos.**

---

## 1. Qué se ha construido

La ruta `/prospectos` —ya enlazada en la navegación pero **en 404 hasta ahora**— pasa a mostrar el Pipeline: los prospectos agrupados en las 6 etapas, con contador por etapa, lista vertical en móvil y kanban con scroll horizontal en desktop.

**19 ficheros: 10 nuevos, 9 modificados.** No toca autenticación, aislamiento multi-tenant, motor de seguimiento ni la query `listar`. Sí toca `crear` y `actualizar`, pero **solo para acotar `notas`** (rev. 2, ver §6).

```
 convex/schema.ts                        |   9 +-   índice nuevo
 convex/lib/validacion.ts                |  21 +    LONGITUD_MAX_NOTAS + notasOpcional
 convex/lib/constants.ts                 |  13 +    MAX_PIPELINE, PIPELINE_VISIBLES
 convex/prospectos.ts                    | 112 +    query `pipeline`
 convex/seed.ts                          |  ~90 +   escenarios `pipeline` y `volumen`
 convex/prospectos.test.ts               | 237 +    14 tests nuevos
 src/lib/etiquetas.ts                    |  21 +    promoción de OPCIONES_ETAPA
 src/lib/useDayKey.ts                       (NUEVO) promoción del hook
 src/app/(app)/actividad/page.tsx        |  26 -    pasa a importar useDayKey
 src/app/(app)/prospectos/[id]/textos.ts |  24 -    re-exporta lo promocionado
 src/components/ui/ProspectCard.tsx      |  22 +    showStage + accessory
 src/components/ui/ProspectCard.test.tsx    (NUEVO) 4 tests (no tenía)
 src/app/(app)/prospectos/page.tsx          (NUEVO) la pantalla
 src/app/(app)/prospectos/page.test.tsx     (NUEVO) 14 tests
 src/app/(app)/prospectos/textos.ts         (NUEVO) copy + formateadores puros
 src/app/(app)/prospectos/textos.test.ts    (NUEVO) 5 tests
 src/app/(app)/prospectos/error.tsx         (NUEVO) boundary del segmento
 src/app/(app)/prospectos/error.test.tsx    (NUEVO) 1 test
```

---

## 2. Backend — la corrección del bloqueante, ya en código

### El índice

`convex/schema.ts` añade, con el prefijo `usuarioId` de aislamiento como todos los demás:

```ts
.index("by_usuario_etapa_seguimiento", ["usuarioId", "etapaActual", "fechaProximoSeguimiento"])
```

Es aditivo: `by_usuario_etapa` se conserva para `listar`, que no se toca.

### El orden viene del índice, antes del corte

```ts
const leidos = await ctx.db
  .query("prospectos")
  .withIndex("by_usuario_etapa_seguimiento", (q) => q.eq("usuarioId", usuarioId).eq("etapaActual", etapa))
  .order(esTerminal(etapa) ? "desc" : "asc")
  .take(MAX_PIPELINE + 1);

const truncado = leidos.length > MAX_PIPELINE;
const filas = truncado ? leidos.slice(0, MAX_PIPELINE) : leidos;
```

**No hay `.sort()` posterior.** Esa ausencia es la corrección: al fijar `usuarioId` y `etapaActual` por igualdad, el índice queda ordenado por `fechaProximoSeguimiento`, así que el `.take()` ya selecciona a los más urgentes y el corte descarta a los menos urgentes.

La invariante está escrita como comentario de aviso sobre la query (`convex/prospectos.ts:151-155`), no solo en este documento.

- **No terminales** → `asc`: lo más vencido arriba.
- **Terminales** (`joined`/`discarded`) → `desc`: nadie tiene fecha, todas empatan y decide el desempate implícito `_creationTime`, dejando arriba lo más reciente. `esTerminal` se deriva de `SEGUIMIENTO_DIAS` (JOS-8), no de una lista duplicada.

### Contrato de salida validado en runtime

La query declara `returns` (a diferencia de `actividadDiaria`, que no lo hace). La proyección excluye `usuarioId`, `_id` y `_creationTime`, y el validador lo **comprueba en ejecución** — el principio que enuncia `convex/lib/proyecciones.ts`, aplicado aquí a datos de tenant. Un test afirma además la forma exacta de las claves devueltas.

---

## 3. Frontend

- **Un solo árbol de DOM para los dos layouts.** `flex-col` en móvil; `md:flex-row md:items-start md:overflow-x-auto` con columnas `md:w-72 md:flex-none` en desktop. Se descartó duplicar el árbol con `md:hidden` porque doblaría cada tarjeta en el DOM.
- **Disclosure accesible:** cada cabecera es un `<h2>` que contiene un `<button aria-expanded>`. `joined` y `discarded` arrancan colapsadas.
- **Sin ampliar el design system:** el set de iconos (29, `design.md §3`) no tiene `chevron-down`; se usa `chevron-right` rotado 90° con CSS en lugar de añadir un glifo.
- **`ProspectCard`** recibe dos props opcionales con default retrocompatible — `showStage` (el Pipeline lo apaga: la sección ya declara la etapa, y "Presentación realizada" desbordaría una columna) y `accessory` (slot genérico donde el Pipeline pone `<Badge tone="error">Vencido</Badge>`). Las llamadas de Actividad Diaria no cambian.
- **Estados excluyentes** carga / sin prospectos / pipeline, con `tieneProspectos` afirmado por el servidor.

### Reutilización

`OPCIONES_ETAPA` y `etiquetaEtapa` suben a `src/lib/etiquetas.ts`; la ficha los **re-exporta** y `SelectorEtapa` no cambia. `useDayKey` sube a `src/lib/useDayKey.ts` y Actividad Diaria pasa a importarlo. `SelectorEtapa` **no** se promociona: el Pipeline no cambia etapas.

---

## 4. Gates

Ejecutados en la rama, sobre el árbol que se entrega:

| Gate | Resultado |
|---|---|
| `npx vitest run --no-file-parallelism` | **325/325 en 34 ficheros** (base `master`: 286 → **+39** nuevos) |
| `npx tsc --noEmit` | **solo los 4 errores preexistentes** de `import.meta.glob` |
| `npm run lint` | limpio |
| `npm run build` | OK, y **`/prospectos` aparece como `○` (estático)** en el árbol de rutas |

Salida literal en `docs/auditoria/JOS-21-gates.txt`.

---

## 5. Cumplimiento de las tres condiciones del GO

### Condición 1 — Actualizar Linear antes de escribir código ✅

JOS-21 se actualizó **antes del primer fichero tocado**. Incluye: la query `pipeline` y el índice nuevo en lugar de "agrupar en el frontend"; la divergencia con el diseño de Fase 0 y su resolución; y el criterio de aceptación nuevo, literal:

> **Con la lista truncada, ningún prospecto vencido queda oculto.** El corte descarta siempre los menos urgentes, nunca los más.

### Condición 3 — Mantener el test de regresión ✅ *(y verificado por sabotaje)*

Un test que nunca se ha visto fallar no prueba nada, así que **se reintrodujo temporalmente el algoritmo de la rev. 1** (leer por `by_usuario_etapa` + `.sort()` posterior) y se ejecutó la batería. Resultado:

```
× etapa terminal: sin fecha, ordena por creación descendente
× no terminal SIN fechaProximoSeguimiento encabeza el grupo
× ⭐ NO oculta vencidos al truncar, aunque se hayan creado los últimos
  AssertionError: expected [ 'Vencido 0', 'Vencido 1', …(48) ] to deeply equal []
```

Es decir: con el algoritmo anterior **los 50 vencidos desaparecían de la pantalla**, no 49 — el `.take(501)` se llevaba los 500 futuros más un vencido, y el `slice(0,500)` descartaba también ese. El bug que describió auditoría, reproducido y medido. Restaurada la implementación correcta, 24/24 en verde.

El test vive en `convex/prospectos.test.ts` y falla tanto si alguien vuelve a `by_usuario_etapa` como si reintroduce un `.sort()` tras el corte.

### Condición 2 — Medición de volumen ⚠️ *parcial*

Documentos y bytes: **medidos y acotados** (§6), y ahora sobre el **peor caso admisible**, no sobre un tamaño típico. La **latencia contra deployment real sigue sin medir** — es el bloqueante 1 del NO-GO y requiere el entorno levantado. Guión listo en `docs/auditoria/JOS-21-e2e.md`.

### Bloqueantes 1 y 2 del NO-GO — abiertos ⚠️

No se dan por cumplidos ni se maquillan. Ver §7.

---

## 6. Medición de volumen — y un hallazgo que auditoría debe valorar

**Límites por query de Convex** (verificados en `docs.convex.dev/production/state/limits`, no de memoria): **32.000 documentos escaneados**, **16 MiB leídos**, **1 s de ejecución de código de usuario**.

Peor caso de esta query, determinista: `6 × (MAX_PIPELINE + 1) + 1 = 3.007` documentos.

| Concepto | Consumo | % del límite |
|---|---|---|
| Documentos escaneados | 3.007 | **9,4 %** |

Los **bytes** dependen del tamaño del documento, y ahí está el hallazgo:

| Perfil de prospecto | B/doc | Lectura peor caso | % de 16 MiB |
|---|---|---|---|
| Ligero (sin notas) | 300 | 0,86 MiB | 5,4 % |
| Típico (notas de 200 c) | 520 | 1,49 MiB | 9,3 % |
| Pesado (notas de 500 c) | 830 | 2,38 MiB | 14,9 % |
| **Extremo (notas de 5.000 c)** | 5.330 | 15,28 MiB | **95,5 %** |

**El hallazgo original: `notas` era texto libre SIN tope de longitud.** `textoOpcional` solo hace `trim()`; el esquema tampoco lo acotaba. Los bytes leídos por esta query no estaban acotados por el modelo de datos, y como la query lee **documentos completos** (Convex no proyecta en base de datos), bastaban notas grandes para que el propio tenant rompiera su pantalla.

### La medición que cambió la decisión

Documento base real medido: **496 B** sin notas (con un `tokenIdentifier` de Clerk realista). A ~1,1 B/carácter en castellano:

| Tope de `notas` | B/doc | Peor caso con 500/etapa (3.007 docs) | Con 200/etapa (1.207 docs) |
|---|---|---|---|
| Sin notas | 506 | 1,45 MiB (9 %) | 0,58 MiB (4 %) |
| 500 c | 1.056 | 3,03 MiB (19 %) | 1,22 MiB (8 %) |
| **2.000 c** | 2.706 | 7,76 MiB (48 %) | **3,11 MiB (19 %)** |
| 5.000 c | 6.006 | **17,22 MiB (108 % — revienta)** | 6,91 MiB (43 %) |
| 10.000 c | 11.506 | 33,00 MiB (206 %) | 13,24 MiB (83 %) |

Dos conclusiones que la rev. 1 no tenía:

1. **Las dos constantes están acopladas.** No se pueden decidir por separado: el tope del campo libre multiplica por la cota de lectura por etapa.
2. **Con `MAX_PIPELINE = 500` la opción "aceptar el riesgo" era inviable.** Cualquier tope generoso de notas superaba el límite, así que "demostrar que cabe para el tamaño máximo permitido" no tenía solución.

### Lo aplicado

- **`LONGITUD_MAX_NOTAS = 2000`** en `convex/lib/validacion.ts`, con `notasOpcional()` que mide **después del trim** y lanza `VALIDATION_ERROR`. Aplicado en `crear` **y** en `actualizar` — la edición no es una puerta trasera.
- **`MAX_PIPELINE` baja de 500 a 200.** El docblock de la constante deja escrito el acoplamiento y que tocar cualquiera de las dos obliga a volver a medir.
- **Peor caso resultante: 1.207 documentos (3,8 % del límite) y ~3,11 MiB (19 %)**, ~5x de margen.

Coste asumido: el contador por etapa deja de ser exacto por encima de 200 en una sola etapa, en vez de 500. Sigue fuera del alcance realista de un networker individual, y por encima se muestra "200+" con banner de vista parcial.

### Los dos tests que lo sostienen

- **`presupuesto de lectura`** ahora inserta notas de **`LONGITUD_MAX_NOTAS`**, no de un tamaño "típico": desde JOS-74 ese es el documento **más grande que las mutaciones permiten crear**, así que el test acota el **peor caso real**. Subir cualquiera de las dos constantes sin medir hace fallar el test.
- **`las mutaciones no dejan crear el documento gigante`** cierra el círculo: comprueba que ese "máximo admisible" lo impone el servidor —en alta y en edición— y no la buena voluntad del cliente.

**Nota de contexto, no de descargo:** el riesgo ya existía — `actividadDiaria` lee hasta `3 × 501 = 1.503` documentos con la misma exposición. El tope de `notas` lo cierra **también para esa pantalla**.

---

## 7. Lo que queda pendiente

Son dos, y ambos requieren un deployment de Convex levantado; conviene hacerlos en la misma sesión.

> **Avance del 2026-07-27 (rev. 3).** El departamento de auditoría levantó el entorno e hizo la parte que no necesita sesión. **Verificado contra deployment real:** Convex arranca y **publica el índice `by_usuario_etapa_seguimiento`** (el cambio de esquema funciona de verdad, no solo en `convex-test`); Next arranca con `--webpack`; **`/prospectos` sin sesión devuelve 307 hacia `/login`** — es decir, **la ruta ya existe, se acabó el 404, y está protegida**; `/login` responde 200.
>
> Se detuvo ahí por no disponer de sesión de Clerk ni de automatización de navegador, y **se negó explícitamente a dar el e2e por bueno apoyándose en los tests mockeados**. Es la postura correcta y así queda registrado.
>
> **Consecuencia operativa:** lo que falta no lo puede hacer ni el autor ni auditoría con las herramientas actuales del proyecto. Requiere una persona con navegador y sesión iniciada. Los resultados ya obtenidos están anotados en `JOS-21-e2e.md` para no repetirlos.

1. **Medición de latencia en deployment real (condición 2, parte pendiente).** Lo medido en §6 son documentos y bytes, que son deterministas y verificables en `convex-test`. La **latencia de carga inicial y de re-ejecución reactiva contra un deployment real de Convex** no se ha medido: requiere `convex dev` levantado y datos sembrados. Se propone hacerlo durante el recorrido del punto 2, y **auditoría debería considerar la condición 2 cumplida solo a medias hasta entonces**.

2. **Recorrido manual e2e.** No ejecutado. Requiere `next dev --webpack` sobre `http://localhost:3000` (⚠️ Clerk en dev **no** carga en la IP de WSL) y comprobar: la ruta ya no da 404 desde TabBar y Sidebar; las 6 secciones con contador; `joined`/`discarded` plegadas de inicio; colapsar y expandir; lista vertical a 375 px y kanban con scroll a ≥768 px; abrir una tarjeta lleva a la ficha correcta; el badge "Vencido" solo en vencidos; y con el escenario `volumen`, el contador "500+" y el banner de vista parcial.

   Datos para el recorrido (`convex/seed.ts`, dos escenarios nuevos):

   ```bash
   npx convex run seed:seed '{"scenario":"pipeline","usuarioId":"<tokenIdentifier>"}'   # 6 etapas pobladas
   npx convex run seed:seed '{"scenario":"volumen","usuarioId":"<tokenIdentifier>"}'    # 600 en una etapa
   ```

   `volumen` inserta 600 en Contactado con notas de 500 caracteres y **crea los 50 vencidos los últimos** a propósito: es el bloqueante de la 1ª auditoría reproducible a mano en la pantalla real, no solo en test.

---

## 8. Puntos a criterio de auditoría

**A. Revisión de `MAX_PIPELINE` de 500 a 200 (§6, nuevo en rev. 2).** Es un cambio sobre una decisión de producto que el usuario ya había tomado, y se ha tomado de nuevo con la medición delante. El coste es que el contador por etapa deja de ser exacto a partir de 200 en una sola etapa en vez de 500. Conviene que auditoría valide tanto el número como el razonamiento del acoplamiento.

**A-bis. Alcance del tope de `notas` dentro de esta rama.** Auditoría pedía "preferiblemente una issue coordinada". Se ha creado JOS-74 con el análisis, pero **la validación de servidor y sus tests van en esta rama**, porque son condición del GO y el Pipeline no debería llegar a producción con el riesgo abierto. JOS-74 conserva el punto de UI (`maxLength` y aviso en los formularios), que **no** se ha hecho: hoy el usuario descubriría el tope con un error del servidor. ¿Se acepta ese reparto?

**B. Los terminales se ordenan por fecha de creación, no por antigüedad de contacto.** El plan rev. 1 usaba `antiguedad()`; se eliminó porque obligaba a ordenar tras el corte. Para `joined`/`discarded` el criterio es ahora "lo más recientemente creado arriba". Es defendible para dos secciones de archivo, pero es un cambio de criterio respecto al plan rev. 1 y conviene que quede validado.

**C. No terminales sin `fechaProximoSeguimiento` van los primeros.** Decisión tomada sobre la observación menor de la 1ª auditoría. Razón: la Actividad Diaria los excluye (`gte(1)`), así que el Pipeline es la **única** pantalla donde se ven; ponerlos arriba los hace visibles y **los protege del truncamiento**. Cubierto por test explícito. La alternativa —tratarlos como datos inválidos— exigiría decidir qué hacer con ellos, y ninguna mutación de producción los genera.

**D. Modificación de `ProspectCard`, componente compartido.** Aceptado en la 1ª auditoría condicionado a cubrir el default en tests: hecho (`ProspectCard.test.tsx`, que además es el primer test que tiene el componente).

**E. `error.tsx` nuevo en `/prospectos`.** Es boundary padre de `[id]` y `nuevo`, que ya tienen el suyo —más cercano— y por tanto no cambian de comportamiento. Verificado por lectura del árbol, no por test.

**F. Aviso de `createRouteMatcher` deprecado (reportado por auditoría, rev. 3).** No es una regresión de JOS-21 — `src/proxy.ts` viene de JOS-66 — y no se toca aquí. Registrado como **[JOS-75](https://linear.app/jose-lumbreras/issue/JOS-75/migrar-de-createroutematcher-a-comprobaciones-de-auth-por-recurso)**, post-MVP.

Conviene precisar la severidad, porque el texto del SDK suena más grave de lo que es **en este proyecto**: Clerk avisa de que el matcher del middleware "puede dejar recursos protegidos alcanzables". Aquí el middleware **no es lo que protege los datos** — toda función de Convex llama a `requireUsuario(ctx)` y ninguna acepta `usuarioId` del cliente. El riesgo real es que se renderice el armazón de una pantalla, no que se filtren datos de un tenant. Pasa a bloqueante solo si se sube de versión mayor de Clerk, porque entonces la función desaparece.

---

## 9. Cómo revisar el cambio

```bash
git add -N . && git diff HEAD -- . ':(exclude)docs/auditoria'   # o leer docs/auditoria/JOS-21.diff
npx vitest run --no-file-parallelism
npx tsc --noEmit && npm run lint && npm run build
```

Orden de lectura sugerido: `convex/schema.ts` (el índice) → la query `pipeline` en `convex/prospectos.ts` → el test ⭐ de regresión en `convex/prospectos.test.ts` → `src/app/(app)/prospectos/page.tsx`.
