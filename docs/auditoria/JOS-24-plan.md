# PLAN JOS-24 — Pantalla Resumen (Dashboard): resumen global del estado del pipeline

**Revisión 4** · corrige el NO-GO de la auditoría sobre la rev. 3
**Issue:** [JOS-24](https://linear.app/jose-lumbreras/issue/JOS-24/pantalla-dashboard-resumen-global-del-estado-del-pipeline) · Milestone M7 · Prioridad Alta
**Diseño aprobado:** [JOS-62](https://linear.app/jose-lumbreras/issue/JOS-62/pantalla-dashboard-crm-networker-mvp) (Fase 0, Done)
**Rama prevista:** `joseramonlc/jos-24-pantalla-dashboard-resumen-global-del-estado-del-pipeline`
**Base:** `origin/master` = `4c51b12` (verificado contra el remoto el 2026-08-03)

---

## Respuesta a la 2ª auditoría del BOCADO A (código)

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | El presupuesto sigue sin estar acotado por completo (`nombre`, `comoSeConocio`, `telefono`) | Bloqueante | **Resuelto acotando**, no aceptando el riesgo — §4.4-quater. Se detecta además un cuarto campo que la auditoría no cita: `email` se validaba de forma pero no de longitud. Nueva medición: 32,7 %, margen 3,06× |
| 2 | Interacciones históricas por encima de los topes nuevos | Mayor | **Verificado contra el deployment real**: 12 prospectos, 9 interacciones, campo de texto más largo = **70 caracteres**. Riesgo nulo, acreditado con datos (§4.4-quater, final) |
| 3 | La cabecera de los gates cita rev. 4 + §4.4-bis pero también aplica §4.4-ter | Menor | Corregido en `JOS-24-gates.txt` |
| 4 | El texto original de §4.3 debe rotularse más claramente como no vigente | Menor | Corregido — §4.3 lleva ahora aviso explícito de "TEXTO ORIGINAL NO VIGENTE" |

**Confirmado correcto por la auditoría y sin cambios:** ausencia de UI en el bocado A · `requireUsuario` antes de tocar datos · publicación del índice en deployment real · aislamiento multi-tenant y truncamientos cubiertos por tests · desplazamiento del e2e al cierre del bocado B.

---

## Respuesta a la auditoría de la rev. 3

| # | Hallazgo | Gravedad | Respuesta |
|---|---|---|---|
| 1 | `periodo` contradice el contrato temporal semiabierto | Bloqueante | Corregido — §2.6 y §3.2: se renombra a `hastaIncluido` y se separa **nomenclatura de rótulo** (dayKeys inclusivos) de **frontera de consulta** (ms, semiabierta e interna) |
| 2 | §10 seguía diciendo "rev. 2" | Menor | Corregido |
| 3 | "no se modifica ningún índice" es ambiguo si se añade uno | Menor | Corregido — §1 y §7 lo dicen ahora sin depender de la lectura del adjetivo |

**Cerrados en revisiones anteriores y confirmados por la auditoría:** lecturas ilimitadas, totales derivados de recuentos truncados, pendientes sin cota, parcialidad de `nuevosEnPeriodo`, cálculo de `diaCompletoDesde` y fronteras 1.200 / 1.201. El gate de copy figura aprobado por producto.

> **Sobre la observación de la auditoría de la rev. 1** (referencias a JOS-24/JOS-62/JOS-47 y medición sin evidencia): las citas de JOS-24 y JOS-62 están reproducidas literalmente en §5 y §8 para ser verificables sin salir del documento. La medición de deployment **no existe todavía** y se declara como gate obligatorio, no como hecho consumado.
>
> ⚠️ **Actualización:** ese gate **se definió originalmente como cierre del bocado A** (§4.3) y **se trasladó después al cierre del bocado B** en §4.4-ter, al comprobarse que `resumen` no puede invocarse autenticada mientras no exista la pantalla que la llama. La redacción de arriba se conserva por ser la respuesta literal a la auditoría de la rev. 1.

---

## 0. Hallazgos de la lectura previa del repo

Verificados sobre el código real el 2026-08-03.

### 0.1 La pestaña existe; la pantalla, no

`src/components/layout/nav.ts:5` ya declara el tercer destino raíz:

```ts
{ href: "/resumen", label: "Resumen", icon: "bar-chart-3" }
```

No existe `src/app/(app)/resumen/`. **Hoy esa pestaña lleva a un 404.**

### 0.2 Falta un índice en `interacciones` — bloqueante

`convex/schema.ts:87` declara un único índice:

```
by_usuario_prospecto_fecha  [usuarioId, prospectoId, fecha]
```

Con `prospectoId` en posición intermedia **no se puede consultar por rango de fechas todas las interacciones de un usuario**. Se añade `by_usuario_fecha` = `[usuarioId, fecha]`. Convex construye los índices en el despliegue: sin migración de datos, sin ventana de indisponibilidad, sin modificar ningún documento.

### 0.3 Convex no tiene `COUNT`

Contar obliga a leer documentos. El patrón del proyecto (JOS-21) es lectura acotada + centinela `+1` + "vista parcial" declarada. `convex/lib/constants.ts:11-28`:

> `MAX_PIPELINE = 200` … *"MEDIDO contra deployment real el 2026-07-28 con las seis etapas saturadas: 277 ms y 3,8 % del límite de documentos (docs/auditoria/JOS-21-e2e.md §3)"*

Ese dato es la referencia de presupuesto de este plan (§4).

### 0.4 La aritmética de fechas ya está resuelta y es estricta

`convex/lib/fecha.ts` aporta lo necesario, y con garantías que este plan usa como cimiento:

- `APP_TZ = "Europe/Madrid"` (línea 12), zona única del MVP.
- `parseDayKey` (116-125) **ya rechaza** formatos inválidos **y fechas irreales** (`2026-02-31` falla por round-trip civil).
- `addCivilDays` (99-102) suma en dominio civil, **nunca múltiplos fijos de 24 h** → correcto ante cambios de hora.
- `ventanaDia` (136-142) devuelve ventana **semiabierta** `[hoyInicio, mananaInicio)`.

### 0.5 En producto no se borran prospectos

`grep` sobre `convex/*.ts`: las únicas llamadas a `ctx.db.delete` están en `convex/seed.ts:102,109` (interno, solo-dev). Las mutations de producto son `crear`, `actualizar` y `cambiarEtapa`. Relevante para descartar la estrategia de contadores (§2.3).

### 0.6 Tres especificaciones que no coinciden

| Fuente | Qué describe |
|---|---|
| JOS-24 (funcional) | 4 secciones; *"no se navega a fichas ni se registran interacciones"* |
| JOS-62 (diseño aprobado) | 5 secciones, incluye totales globales y CTA *"Ver en Actividad Diaria →"* |
| Design system §5 | *"Resumen (embudo por etapa + **conversión**)"* |

Se resuelve en la Decisión 1 (§5).

---

## 1. Alcance

**Entra:** pantalla `/resumen` de solo lectura con cinco secciones, y la query de Convex que la alimenta.

**No entra:** M8 (navegación, botón "+", responsive global), M10 (prioridad), M11 (fecha acordada). Ninguna pantalla existente se modifica.

### Ficheros

| Fichero | Operación |
|---|---|
| `convex/schema.ts` | Modificado — **solo añade** el índice `by_usuario_fecha` |
| `convex/lib/constants.ts` | Modificado — **solo añade** las cotas del Resumen |
| `convex/resumen.ts` | Nuevo — query `resumen` |
| `convex/resumen.test.ts` | Nuevo |
| `src/app/(app)/resumen/page.tsx` | Nuevo |
| `src/app/(app)/resumen/textos.ts` | Nuevo |
| `src/app/(app)/resumen/error.tsx` | Nuevo |
| `src/app/(app)/resumen/page.test.tsx` | Nuevo |
| `src/app/(app)/resumen/error.test.tsx` | Nuevo |
| `src/components/ui/BarChart.tsx` | Nuevo — sin librería |
| `src/components/ui/BarChart.test.tsx` | Nuevo |
| `src/components/ui/index.ts` | Modificado — un `export *` más |

Los dos ficheros de Convex se tocan **solo por adición**: se añade el índice `by_usuario_fecha` y se añaden dos constantes. **Ningún índice ya existente se modifica ni se elimina**, y ninguna función o constante ya existente cambia de forma ni de significado.

---

## 2. Bocado A — Backend: la query `resumen`

### 2.1 Cambio de arquitectura respecto a la rev. 1

La rev. 1 planteaba **cuatro lecturas** sobre índices distintos (etapas, pendientes, nuevos, interacciones) y tres de ellas sin cota. Los bloqueantes 1, 2 y 3 son tres síntomas del mismo error de diseño.

La rev. 2 lo corrige de raíz: **dos lecturas, ambas acotadas**.

| Lectura | Tabla | Índice | Cota | Alimenta |
|---|---|---|---|---|
| 1 | `prospectos` | `by_usuario` | `MAX_RESUMEN_PROSPECTOS + 1` | porEtapa · pendientes · nuevos · totales |
| 2 | `interacciones` | `by_usuario_fecha` (nuevo) | `MAX_RESUMEN_INTERACCIONES + 1` | total del período · serie |

### 2.2 Lectura 1 — prospectos, una sola pasada

```
ctx.db.query("prospectos")
  .withIndex("by_usuario", q => q.eq("usuarioId", usuarioId))
  .take(MAX_RESUMEN_PROSPECTOS + 1)
```

Si se devuelven más de `MAX_RESUMEN_PROSPECTOS` filas → se descarta el centinela y `exacto = false`.

Sobre las filas retenidas se calcula **todo** en memoria, en una sola pasada:

- **porEtapa** — contador por cada una de las 6 etapas.
- **pendientes** — `vencidos`: `fechaProximoSeguimiento < hoyInicio`; `hoy`: `hoyInicio ≤ fechaProximoSeguimiento < mananaInicio`. Prospectos sin `fechaProximoSeguimiento` (etapas terminales) no cuentan en ninguno.
- **nuevosEnPeriodo** — `desdeMs ≤ fechaAlta < hastaExclusivoMs` (§3.2).
- **totales** — `activos` = todo menos `discarded`; `incorporados` = `joined`; `descartados` = `discarded`.

**Esto cierra los bloqueantes 1 y 3**: no queda ninguna lectura de prospectos sin cota, porque solo hay una lectura de prospectos.

### 2.3 Por qué una pasada acotada y no el índice `[usuarioId, fechaAlta]`

La auditoría exigía, para el bloqueante 1, *"índice `[usuarioId, fechaAlta]`, rango temporal y centinela/cota explícita, o una estrategia de contadores"*. **Este plan propone una tercera vía y lo hace explícito para que la auditoría pueda rechazarla.**

Razones:

1. **Menos documentos leídos en el peor caso.** Con lecturas separadas y acotadas, el peor caso suma `6×(200+1)` (etapas) + `2×(cota+1)` (pendientes) + `(cota+1)` (nuevos) ≈ **más de 2.400 documentos de prospecto**. Con una sola pasada el techo es `MAX_RESUMEN_PROSPECTOS + 1`. Menos lectura, no más.
2. **Coherencia de flags.** Con lecturas separadas, cada métrica trunca por su cuenta y la pantalla puede mostrar simultáneamente un total exacto y unas etapas parciales que no suman. Con una pasada, o todo es exacto o todo se declara parcial: **imposible mostrar un conjunto internamente inconsistente**.
3. **Los contadores quedan descartados** como alternativa: exigirían tocar `crear`, `actualizar` y `cambiarEtapa` (§0.5), más un backfill de los datos existentes, e introducirían riesgo de deriva permanente entre el contador y la realidad. Desproporcionado para el MVP. Si el uso real lo reclamara, es un issue propio (componente `@convex-dev/aggregate` o tabla de contadores), no parte de esta pantalla.

**Contrapartida asumida y declarada:** se leen todos los prospectos del tenant, no solo los del rango. Para tenants por debajo de la cota el coste es idéntico (son los mismos documentos), y por encima degradan todas las métricas a la vez en lugar de solo una.

### 2.4 Valor de la cota y coherencia con el Pipeline

**`MAX_RESUMEN_PROSPECTOS = 1200`**, es decir `6 × MAX_PIPELINE`.

No es arbitrario: garantiza que **siempre que el Pipeline muestre recuentos exactos, el Resumen también** — dos pantallas que cuentan lo mismo no pueden contradecirse. Si el Pipeline satura (200 en una etapa), el Resumen puede seguir siendo exacto; nunca al revés.

Consecuencia para el presupuesto: el peor caso son **1.201 documentos de prospecto**, prácticamente los mismos **1.207** que el Pipeline ya midió en 277 ms y 3,8 % del límite (§0.3). No es una extrapolación optimista: es el mismo orden de lectura de una pantalla ya medida en deployment real.

**Bloqueante 2 cerrado:** `totales` se deriva de la misma lectura y hereda el mismo flag `exacto`. Cuando `exacto === false`, la pantalla **no** presenta ningún número como total global: los rotula como parciales (§3.3 del bocado B). No hay forma de que un total truncado se muestre como exacto, porque no existe una ruta de código que lo produzca.

### 2.5 Lectura 2 — interacciones del período

```
ctx.db.query("interacciones")
  .withIndex("by_usuario_fecha", q => q.eq("usuarioId", usuarioId)
                                       .gte("fecha", desdeMs)
                                       .lt("fecha", hastaExclusivoMs))
  .order("desc")
  .take(MAX_RESUMEN_INTERACCIONES + 1)
```

**`MAX_RESUMEN_INTERACCIONES = 500`** (17/día sostenidos durante 30 días: fuera del alcance realista de un networker individual, igual que el razonamiento de `MAX_PIPELINE`). El valor **lo fijó la medición**, no una estimación previa — ver §4.4-bis.

**El orden descendente es una decisión de contrato, no un detalle** (cierra el mayor 4): si se truncara leyendo en ascendente, se perderían **los días más recientes**, que son justo los que el usuario mira. Leyendo descendente, la truncadura cae siempre en los días **más antiguos** del rango.

Salida:

- `totalEnPeriodo` — número de interacciones retenidas.
- `serie` — un elemento **por cada día del rango**, incluidos los de valor 0 (un día sin actividad es información, no un hueco).
- `exacto` — `false` si se alcanzó la cota.
- `diaCompletoDesde` — `null` si `exacto`. Si no, se calcula comparando el día del documento más antiguo **retenido** con el del **centinela descartado** (ver abajo). La UI **no dibuja como 0** los días anteriores a esa marca: los presenta como "sin datos" (§5.2).

#### Cálculo de `diaCompletoDesde` (corregido en la rev. 3)

La rev. 2 daba siempre por parcial el día más antiguo retenido. **Es incorrectamente conservador**: si los documentos retenidos terminan justo en la frontera de un día, ese día está entero y se estaría ocultando información medida.

Como el centinela es el documento inmediatamente **anterior** al corte (lectura descendente, se leen `MAX + 1`), basta compararlos:

```
si !truncado                      → diaCompletoDesde = null
si dia(masAntiguoRetenido) == dia(centinela)  → el corte parte ese día por la mitad
                                  → diaCompletoDesde = dia(masAntiguoRetenido) + 1 día
si no                             → ese día está íntegro
                                  → diaCompletoDesde = dia(masAntiguoRetenido)
```

**Por qué la segunda rama es segura:** los documentos vienen ordenados por `fecha` descendente. Si el centinela pertenece a un día anterior, entonces **todo** documento del día del más antiguo retenido tiene `fecha` mayor que la del centinela y, por tanto, cae dentro del conjunto retenido. Ese día está completo por construcción.

Los días se comparan como `dayKey` en `APP_TZ` (`formatDayKey(civilDate(fecha, APP_TZ))`), no por timestamp: dos instantes del mismo día civil deben tratarse como el mismo día aunque medie un cambio de hora.

**Caso límite:** si al sumar un día `diaCompletoDesde` cae más allá del último día del período, significa que **ningún día del rango está completo**. Se devuelve `diaCompletoDesde = null` junto a `exacto = false` — combinación que la UI interpreta como serie entera no fiable (§5.2), distinta del `null` con `exacto = true`.

`totalEnPeriodo` y `serie` comparten el flag porque provienen de la misma lectura; la distinción que pedía la auditoría se resuelve con `diaCompletoDesde`, que informa **de qué parte concreta** de la serie no es fiable.

### 2.6 Contrato de salida

```
resumen({ dayKey: string, periodo: "semana" | "mes" }) → {
  periodo:      { desde: dayKey, hastaIncluido: dayKey },   // días reales mostrados, ambos incluidos
  prospectos: {
    exacto:            boolean,
    porEtapa:          { new, contacted, presented, evaluating, joined, discarded },
    pendientes:        { vencidos: number, hoy: number },
    nuevosEnPeriodo:   number,
    totales:           { activos, incorporados, descartados },
  },
  interacciones: {
    exacto:            boolean,
    totalEnPeriodo:    number,
    serie:             { dayKey: string, valor: number }[],
    diaCompletoDesde:  string | null,
  },
}
```

Con validador `returns` explícito, como el resto de queries del proyecto.

Primera línea del handler, sin excepción:

```ts
const usuarioId = await requireUsuario(ctx);
```

Ninguna función acepta `usuarioId` del cliente (ADR 0001; `convex/lib/usuario.ts`).

---

## 3. Contrato temporal (cierra el mayor 5)

### 3.1 Zona horaria y fronteras

Todas las fronteras son **medianoches de `APP_TZ` (`Europe/Madrid`)** obtenidas con `zonedMidnightToMs`. Todos los rangos son **semiabiertos `[inicio, fin)`**, igual que `ventanaDia`. `fechaAlta` y `fecha` de interacción son ms epoch y se comparan siempre contra esas medianoches.

### 3.2 Definición exacta de los períodos

Ventanas **móviles** que **incluyen el día visible**, calculadas en dominio civil con `addCivilDays` (nunca sumando 24 h fijas → correcto ante cambios de hora):

| Período | `desdeMs` (incluido) | `hastaExclusivoMs` (excluido) | Días |
|---|---|---|---|
| `semana` | medianoche de `addCivilDays(dayKey, −6)` | `mananaInicio` de `dayKey` | 7 |
| `mes` | medianoche de `addCivilDays(dayKey, −29)` | `mananaInicio` de `dayKey` | 30 |

#### Dos vocabularios que no deben mezclarse (corregido en la rev. 4)

La rev. 3 devolvía `periodo: { desde, hasta }` rotulado *"ambos inclusive"* mientras el resto del documento operaba con rangos semiabiertos. Con `hasta` significando dos cosas distintas según dónde se leyera, un día podía entrar o salir del cálculo. Se separan de forma permanente:

| | Nombre | Tipo | Semántica | Dónde vive |
|---|---|---|---|---|
| **Frontera de consulta** | `desdeMs` / `hastaExclusivoMs` | ms epoch | Semiabierta `[desdeMs, hastaExclusivoMs)` | **Solo dentro del handler.** Nunca cruza el contrato |
| **Rótulo** | `desde` / `hastaIncluido` | `dayKey` | Días reales mostrados, **ambos incluidos** | Salida de la query, para que la UI titule sin recalcular |

Correspondencia, para el período `mes` y `dayKey = "2026-08-03"`:

```
desde            = "2026-07-05"   (addCivilDays(dayKey, −29))
hastaIncluido    = "2026-08-03"   (siempre el propio dayKey visible)
desdeMs          = medianoche APP_TZ de 2026-07-05
hastaExclusivoMs = medianoche APP_TZ de 2026-08-04     ← un día MÁS que hastaIncluido
serie.length     = 30
```

**La UI nunca construye rangos.** No los necesita: cada elemento de `serie` trae su propio `dayKey`, y `desde` / `hastaIncluido` solo se usan para el rótulo del período. La única aritmética de fronteras vive en el handler.

**"Mes" significa 30 días naturales, NO mes civil.** Es lo que pide el texto funcional de JOS-24 (*"en los últimos 30 días"*), y evita que el primer día de mes la pantalla aparezca casi vacía. Consecuencia sobre el copy: ver Decisión 2.

La ventana `[hoyInicio, mananaInicio)` de los **pendientes** sale directamente de `ventanaDia(dayKey, APP_TZ)` y es independiente del período seleccionado: los seguimientos vencidos/de hoy no cambian porque el usuario mire la semana o el mes.

### 3.3 `dayKey` inválido

No requiere código nuevo: `ventanaDia` → `parseDayKey` (`fecha.ts:116-125`) ya lanza ante formato incorrecto y ante fechas irreales (`2026-02-31`). La query hereda ese comportamiento; **se añade test explícito** para fijarlo como contrato y no como accidente.

---

## 4. Presupuesto de lectura (cierra el mayor 6)

### 4.1 Inventario completo de lecturas

La query hace **exactamente dos** lecturas. No hay ninguna otra, ni condicional ni derivada:

| # | Tabla | Documentos, peor caso | Tamaño por documento |
|---|---|---|---|
| 1 | `prospectos` | 1.201 | Documento completo, incluida `notas` |
| 2 | `interacciones` | 501 | Documento completo, incluidos `queOcurrio` y `siguientePasoAcordado` |

Todo lo demás (totales, porcentajes, serie) se calcula en memoria sobre esas filas: **cero lecturas adicionales**.

### 4.2 Comparación con lo ya medido

El Pipeline lee 1.207 documentos de prospecto y midió **277 ms / 3,8 %** del límite de documentos. La lectura 1 del Resumen es equivalente (1.201). La lectura 2 añade documentos de interacción, más pequeños. La expectativa razonable es del mismo orden de magnitud — **pero es una expectativa, no una medición, y no se acepta como prueba.**

### 4.3 ~~Gate de cierre del bocado A~~ → **TEXTO ORIGINAL NO VIGENTE**

> ⚠️ **Lo que sigue en esta sección es el texto de la rev. 4 y NO refleja el estado actual.** Se conserva sin retocar solo para que sea auditable qué se aprobó y qué cambió después.
>
> **Vigente:** el gate se ejecuta al cierre del **bocado B**, no del A (§4.4-ter). La medición sigue siendo obligatoria y con el mismo escenario; lo único que cambia es cuándo. Las cifras de contraste están actualizadas en §4.4-quater, no aquí.

El bocado A **no se da por terminado** sin una medición contra deployment real que **sature ambas lecturas a la vez**, replicando el método de `docs/auditoria/JOS-21-e2e.md` §3:

- 1.201+ prospectos, con `notas` en su longitud máxima admitida hoy.
- 501+ interacciones dentro de la ventana de 30 días, con sus dos campos libres en el tope.
- Ambas condiciones **simultáneas**, no en escenarios separados.

Resultado documentado en `docs/auditoria/JOS-24-e2e.md`, con el mismo detalle que el de JOS-21. Se añade además un test de "presupuesto de lectura" análogo al que ya vigila el Pipeline.

### 4.4-bis ⚠️ CORRECCIÓN POSTERIOR AL GO (2026-08-03)

> Este bloque se añade **después** del GO de la auditoría sobre la rev. 4, al verificar el código durante el bocado A. El texto original de §4.4 se conserva íntegro debajo **sin retocar**, para que sea auditable exactamente qué cambió respecto a lo aprobado. **§4.4 contiene una afirmación falsa** y queda sustituida por lo que sigue.

**Error 1 — el tope de `notas` YA EXISTE.** §4.4 y la tabla de riesgos afirman que `notas` no está acotado y que JOS-74 podría pasar a prerequisito. Es falso: `convex/lib/validacion.ts:44` define `LONGITUD_MAX_NOTAS = 2000` y `notasOpcional` lo aplica en `crear` y `actualizar`. Los puntos 1, 2 y 4 de JOS-74 se implementaron **dentro de la rama de JOS-21**, por ser condición de su GO; JOS-74 sigue abierta solo por el **punto 3 (la UI)**. Por tanto:

- El peor caso de la lectura 1 está acotado en **2.706 B/documento** (medición de JOS-74).
- 1.201 × 2.706 B ≈ **3,1 MiB ≈ 19 %** del límite de 16 MiB — coincide con la fila "200/etapa" de la tabla de JOS-74.
- **JOS-74 no es prerequisito de esta incidencia.** El riesgo declarado como "alto" en §9 estaba mal fundado.

**Error 2 — el campo `queOcurrio` de `interacciones` NO tiene tope, y eso sí bloquea.** Al verificar lo anterior se comprueba que en `convex/lib/validacion.ts` **solo `notas`** está acotado: `textoObligatorio` y `textoOpcional` únicamente hacen `trim()`. `queOcurrio` y `siguientePasoAcordado` son texto libre sin límite.

Hasta ahora era inocuo porque la única query que lee `interacciones` es `listarPorProspecto`, **paginada** con `PAGINA_MAX_FILAS = 100` y `PAGINA_MAX_BYTES = 4 MiB` (`conLimites`): los topes de paginación acotaban los bytes.

**El Resumen introduce la primera lectura AGREGADA y SIN PAGINAR sobre `interacciones`** — `.take(1.001)` de documentos completos. Se reproduce en la otra tabla exactamente la vulnerabilidad que JOS-74 documentó:

> *"No es un problema teórico: es una vía de degradación por datos válidos del propio tenant."* (JOS-74)

Consecuencia sobre el gate de medición de §4.3: **no se puede cumplir honestamente**. El test del Pipeline mide el peor caso **admisible**, y "admisible" lo define el tope que impone el servidor (`LONGITUD_MAX_NOTAS`). Sin tope en `queOcurrio` no existe un peor caso admisible que medir, solo una estimación optimista — justo lo que la auditoría rechazó en las revisiones 1 y 2.

**Propuesta (requiere decisión de producto + nueva pasada de auditoría):** acotar `queOcurrio` y `siguientePasoAcordado` dentro de esta misma rama, como condición del GO del bocado A —el mismo tratamiento que recibió JOS-74 respecto a JOS-21—, con issue propio de registro. Valor sugerido: **2.000 caracteres**, coherente con `notas`. Implica modificar la mutation `interacciones.crear`, lo que **excede el alcance autorizado** (§7 declara que no se modifica ninguna función existente): no se toca sin GO expreso.

**Resolución (2026-08-03).** El product owner aprueba acotar **ambos** campos libres a **2.000 caracteres** (`LONGITUD_MAX_TEXTO_INTERACCION`), aplicado en `interacciones.crear` con tests de tope, exceso y trim-antes-de-medir. Topar solo `queOcurrio` habría dejado el documento sin límite por `siguientePasoAcordado`, y el peor caso seguiría sin existir.

#### Medición del presupuesto y ajuste de la cota

> ⚠️ **CIFRAS SUPERADAS POR §4.4-quater.** La tabla y los porcentajes que siguen corresponden a la **1ª medición**, tomada cuando el documento de prospecto aún no era finito. Se conservan porque son los que justificaron bajar la cota a 500, pero **las cifras vigentes son 2.786 B/prospecto, 5.485.256 B y 32,7 % (margen 3,06×)**. La decisión de mantener 500 se revalidó con las cifras nuevas.

Con los topes ya en vigor, el peor caso admisible es por fin medible. Bytes por documento obtenidos sobre datos reales del esquema:

| Lectura | Documentos | B/doc | Total |
|---|---|---|---|
| `prospectos` | 1.201 | 2.383 | 2.861.983 B |
| `interacciones` | 501 | 4.270 | 2.139.270 B |
| **Suma** | **1.702** | | **5.001.253 B** |

**5.001.253 B = 29,8 % del límite de 16 MiB → margen 3,35×.** En documentos, 1.702 de 32.000 (5,3 %).

Hallazgo estructural: **el Resumen es la primera pantalla que lee dos tablas en la misma query**, y ambas suman contra el mismo límite. Ninguna anterior lo hacía, así que el margen 4× del test del Pipeline no es directamente trasladable. Con `MAX_RESUMEN_PROSPECTOS` atado por coherencia al Pipeline, la cota de interacciones era el único parámetro libre:

| Cota | % del límite | Margen | Trunca a partir de |
|---|---|---|---|
| 1.000 (valor de la rev. 4) | 42,5 % | 2,3× | 33 contactos/día · 30 días |
| **500 ✅ elegida** | **29,8 %** | **3,4×** | 17/día · 30 días |
| 300 | 24,7 % | 4,1× | 10/día · 30 días |

**Decisión de producto (2026-08-03): 500.** Bajar a 300 recuperaría el 4× a costa de declarar la pantalla parcial en uso plausible; 500 conserva holgura para añadir campos al documento más adelante, que es para lo que sirve el margen. El plan pasa de `1000` a `500` en §2.5 y §4.1.

⚠️ **Lo que esta medición NO es.** Se obtiene con `convex-test` (en memoria), igual que la guarda que ya vigila el Pipeline. **NO sustituye a la medición contra deployment real** que exige §4.3 y que en JOS-21 quedó en `JOS-24-e2e.md`/`JOS-21-e2e.md` con latencia y porcentaje reales. Ese gate **sigue abierto**.

### 4.4-quater ⚠️ EL DOCUMENTO DE PROSPECTO PASA A SER FINITO (2026-08-03)

> Tercer añadido posterior al GO. Cierra el **bloqueante de la 2ª auditoría del bocado A**.

**El problema.** JOS-74 acotó únicamente `notas`, por ser con diferencia el campo más voluminoso. Pero `nombre`, `comoSeConocio` y `telefono` seguían aceptando longitud arbitraria, así que **el documento de prospecto no era finito** y la medición de §4.4-bis (5.001.253 B / 29,8 %) era el peor caso **realista**, no el **admisible**. Un tenant podía degradar su propia pantalla con datos perfectamente válidos.

**Hallazgo adicional, no señalado por la auditoría:** `email` se validaba de **forma** pero no de **longitud** — `EMAIL_RE` acepta una cadena de cualquier tamaño mientras tenga arroba y punto. Son cuatro campos, no tres.

**Resolución (decisión de producto, 2026-08-03): acotar, no aceptar el riesgo.** Es coherente con lo que se decidió en el caso idéntico de JOS-74, y evita dejar por escrito que un usuario puede romper su pantalla con datos legítimos.

| Campo | Tope | Criterio |
|---|---|---|
| `nombre` | 80 | Nombre y apellidos largos no llegan a 60 |
| `comoSeConocio` | 120 | Nota breve: *"Referido por Ana"*, *"Evento de networking"* |
| `telefono` | 25 | Número internacional con prefijo y espacios |
| `email` | 254 | Máximo real de una dirección de correo |

Aplicados en `crear` **y** en `actualizar` — un tope solo en el alta se esquiva editando.

#### Nueva medición: la cifra SUBE, y eso es correcto

| | Antes (peor caso *realista*) | Ahora (peor caso *admisible*) |
|---|---|---|
| B/documento de prospecto | 2.383 | **2.786** |
| Total | 5.001.253 B · 29,8 % | **5.485.256 B · 32,7 %** |
| Margen | 3,35× | **3,06×** |

Que el número crezca es la **señal de que la medición pasó a ser exhaustiva**, no de que algo haya empeorado: antes se medía con valores realistas sobre un documento sin límite; ahora se mide el mayor documento que el servidor permite crear.

Con la guarda en 1/3 del límite (5.592.405 B) quedan ~107 KB de holgura, un 2 %. Es **deliberadamente estrecha**: cualquier campo nuevo en el documento de prospecto la rompe y obliga a volver a medir, que es exactamente su función. `MAX_RESUMEN_INTERACCIONES` se mantiene en 500: bajarlo a 400 devolvería el margen a 3,3× a costa de truncar antes, y 3,06× sigue muy por encima del 2,3× que se rechazó.

**Riesgo de datos antiguos, verificado y descartado.** Los topes rigen para escrituras nuevas; los documentos ya existentes no se migran (misma deuda que anotó JOS-74). Comprobado contra el deployment real el 2026-08-03: **12 prospectos, 9 interacciones, y el campo de texto más largo del deployment mide 70 caracteres**. Nada se acerca a ningún tope. El riesgo es nulo, y queda acreditado con datos en lugar de con una declaración.

### 4.4-ter ⚠️ EL GATE DE MEDICIÓN SE MUEVE AL BOCADO B (2026-08-03)

> Segundo añadido posterior al GO. Detectado al intentar ejecutar el gate de §4.3.

**El problema.** `resumen` exige identidad de sesión (`requireUsuario`). Para medirla con datos reales hay que **invocarla autenticada**, y en el bocado A no existe ninguna vía:

- `npx convex run` **no lleva identidad**. Verificado contra el deployment real: devuelve `UNAUTHENTICATED` desde `requireUsuario`. Eso acredita a la vez que la función está desplegada y que la guarda actúa, pero impide medir.
- **No hay pantalla que la llame**: `/resumen` es el bocado B. El build lo confirma — la ruta no aparece.
- El proyecto **no tiene automatización de navegador**. Misma conclusión que el departamento de auditoría en JOS-21: *"solo lo puede hacer una persona con navegador y sesión iniciada. No es automatizable con lo que hay hoy en el proyecto."*

**Por qué no pasó en JOS-21.** Allí la pantalla iba en el mismo bocado y se midió usándola. Este plan separó backend y UI en dos bocados, y la consecuencia —no prevista al redactarlo— es que el gate no puede cerrarse en el A. **Es un fallo de diseño del plan, no del código.**

**Resolución (autorizada por el product owner el 2026-08-03): mover el gate al cierre del bocado B.** La medición sigue siendo obligatoria, con el mismo escenario y las mismas cifras de contraste; solo cambia el momento. El guión completo está en [`JOS-24-e2e.md`](./JOS-24-e2e.md), con la parte no autenticada **ya ejecutada y verificada**.

Lo que el bocado A aporta en su lugar como evidencia de presupuesto:

1. La guarda de `convex/resumen.test.ts` sobre el **peor caso admisible** (1.702 documentos / **5.485.256 B / 32,7 %**, cifra vigente de §4.4-quater), que ya no es una estimación porque los topes de texto la hacen acotable.
2. La verificación contra deployment real de §1 de `JOS-24-e2e.md`: el índice `by_usuario_fecha` se publica y la query aborta sin identidad.

**Estado del bocado A: COMPLETO.** Índice, constantes, query, topes de texto, escenario de seed y 28 tests nuevos, todo en verde. Listo para auditoría de código.

### 4.4 Acoplamiento con JOS-74

`constants.ts:11-28` documenta que `MAX_PIPELINE` está **acoplado** a `LONGITUD_MAX_NOTAS`. `MAX_RESUMEN_PROSPECTOS` queda acoplado igual, y se anotará en el mismo sitio: **subir el tope de notas obliga a volver a medir las dos pantallas**, no solo el Pipeline.

Si la medición de §4.3 no deja margen suficiente, [JOS-74](https://linear.app/jose-lumbreras/issue/JOS-74) pasa de tarea suelta a **prerequisito bloqueante** de esta incidencia. La decisión se toma con el número delante, no antes.

---

## 5. Bocado B — La pantalla

Ruta `/resumen`, componente cliente, estructura de JOS-62.

| Sección | Contenido | Reutiliza |
|---|---|---|
| 1. Cabecera | Título "Resumen" + selector de período | `PillSelect` |
| 2. Distribución del pipeline | Las 6 etapas con sus colores y números. Dato principal | `StageBadge` |
| 3. Seguimientos pendientes | Número grande, desglose vencidos / hoy, enlace "Ver en Actividad Diaria →" | `Card`, `Button` ghost |
| 4. Actividad | Gráfico de barras + frase resumen | `BarChart` (nuevo) |
| 5. Totales | Activos / incorporados / descartados | `Card` |

### 5.1 El gráfico: sin librería

Cita literal de JOS-62, para que sea verificable sin salir del documento:

> *"El gráfico de actividad debe ser simple, nada técnico — el usuario es un networker, no un analista"*

SVG mínimo o divs de altura proporcional. Sin ejes técnicos, sin interactividad, sin tooltips, sin dependencia nueva. Cada barra expone su valor a lectores de pantalla, y la frase resumen repite el dato en texto: el gráfico nunca es la única vía a la información.

### 5.2 Presentación de datos parciales

Regla única y no negociable: **un número marcado como no exacto nunca se muestra desnudo.**

La rev. 2 aplicaba la marca **por sección**, y eso dejaba un agujero: la **sección 4 se alimenta de las dos lecturas** —`nuevosEnPeriodo` viene de los prospectos y el resto de las interacciones—, así que una sección podía quedar mitad exacta y mitad parcial sin que la regla lo dijera. En la rev. 3 la marca es **por métrica**, y el mapeo es exhaustivo:

| Métrica mostrada | Sección UI | Lectura de origen | Flag que la gobierna |
|---|---|---|---|
| Recuento de cada etapa | 2 | prospectos | `prospectos.exacto` |
| Pendientes: vencidos | 3 | prospectos | `prospectos.exacto` |
| Pendientes: hoy | 3 | prospectos | `prospectos.exacto` |
| **Nuevos prospectos del período** | **4** | **prospectos** | **`prospectos.exacto`** |
| Interacciones del período | 4 | interacciones | `interacciones.exacto` |
| Serie del gráfico | 4 | interacciones | `interacciones.exacto` + `diaCompletoDesde` |
| Activos / Incorporados / Descartados | 5 | prospectos | `prospectos.exacto` |

**No existe ninguna métrica sin flag asignado en esta tabla.** Cualquier métrica nueva que se añada en el futuro debe entrar aquí antes de renderizarse.

Comportamiento concreto:

- `prospectos.exacto === false` → todas las métricas de la columna correspondiente se rotulan como parciales, con el mismo lenguaje que ya usa el Pipeline. En la sección 5 el texto deja de decir "totales". **En la sección 4, "nuevos prospectos" se marca aunque las interacciones sean exactas** — y viceversa: la sección puede mostrar una métrica marcada junto a otra sin marcar, porque proceden de lecturas distintas.
- `interacciones.exacto === false` → los días anteriores a `diaCompletoDesde` se dibujan como **sin datos**, visualmente distintos de un 0 real, y la frase resumen declara que el período no está cubierto entero. Si además `diaCompletoDesde === null`, la serie entera se declara no fiable.

### 5.3 Estados

Los tres de JOS-62: **normal**; **sin actividad reciente** (serie toda a cero → gráfico plano y aviso sutil, sin dramatismo: el design system §1 exige *"sin signos de exclamación de más, sin hype"*); y **CRM vacío** (`EmptyState` con CTA "Empieza añadiendo prospectos").

### 5.4 Convenciones

Copy en `textos.ts` fuera del componente · `error.tsx` propio · tono *tú*, sentence case, sin emoji, cifras en formato español con figuras tabulares · mobile-first 375px · el gráfico **nunca** provoca scroll horizontal.

---

## 6. Tests

**Bocado A — correcta lectura de datos**

- Recuentos por etapa, incluidas etapas vacías.
- Frontera de medianoche: seguimiento a las 23:59 de ayer → vencido; a las 00:00 de hoy → hoy.
- Prospecto sin `fechaProximoSeguimiento` (etapa terminal) no cuenta ni en vencidos ni en hoy.
- Fronteras del período: interacción justo en `desdeMs` (dentro) y justo en `hastaExclusivoMs` (fuera).
- Coherencia rótulo ↔ frontera: `hastaExclusivoMs` es la medianoche del día **siguiente** a `hastaIncluido`, y `serie.length` es 7 o 30 según el período. Una interacción registrada el propio `hastaIncluido` a las 23:59 **entra**.
- Ventana móvil correcta a través de un cambio de hora (vía `addCivilDays`, no 24 h fijas).
- Los pendientes **no** cambian al cambiar de período (dependen de `ventanaDia`, no del rango).
- `dayKey` inválido y fecha irreal (`2026-02-31`) → lanza.
- **Aislamiento multi-tenant** sobre las dos lecturas: recuentos, serie y totales de un usuario no incluyen nada del otro.
- Aborto sin identidad.
- Serie: días sin interacciones con valor 0, no ausentes.

**Bocado A — frontera de la cota de prospectos** (exigido por la auditoría de la rev. 2)

La aritmética de cada caso, explícita para que el test no dependa de interpretación:

| Escenario | Total | Resultado esperado |
|---|---|---|
| 1.200 prospectos | 1.200 = cota | `exacto === true`; todos los recuentos y totales exactos |
| 1.201 prospectos | 1.201 > cota | `exacto === false`; **todas** las métricas de prospectos marcadas, incluida `nuevosEnPeriodo` |
| 200 en cada una de las 6 etapas | 6 × 200 = 1.200 | `exacto === true`; los 6 contadores valen 200 y los totales cuadran |
| 201 en una etapa + 200 en las otras cinco | 201 + 1.000 = 1.201 | `exacto === false`; resumen parcial |
| 201 en una etapa, resto vacío | 201 < cota | `exacto === true` y el contador de esa etapa vale **201** |

> El último caso documenta una **divergencia esperada con el Pipeline**, no un fallo: el Pipeline acota **por etapa** (`MAX_PIPELINE = 200`) y mostraría "200+", mientras el Resumen acota **por total** y puede ser exacto. "200+" y "201" no se contradicen; el Resumen es simplemente más preciso. Se fija en un test para que nadie lo lea después como bug.

**Bocado A — truncamiento de interacciones y `diaCompletoDesde`**

- Truncado con centinela de **día distinto** al del más antiguo retenido → `diaCompletoDesde` = ese mismo día (está completo). Es el caso que la rev. 2 marcaba mal.
- Truncado con centinela del **mismo día** → `diaCompletoDesde` = día siguiente.
- Truncado de forma que ningún día queda completo → `exacto === false` **y** `diaCompletoDesde === null`.
- Sin truncar → `exacto === true` y `diaCompletoDesde === null`. Los dos `null` anteriores se distinguen por el flag, y el test lo fija.
- Con truncamiento, los días **más recientes** están completos (consecuencia del orden descendente).
- Presupuesto de lectura dentro de lo medido en §4.3.

**Bocado B**

- Los tres estados renderizan lo suyo.
- El selector de período cambia **solo la sección 4**. Las secciones 2, 3 y 5 no varían: las etapas, los pendientes y los totales globales no dependen del rango elegido.
- Con `prospectos.exacto === false`, **ninguna** de sus métricas aparece sin marca — recuentos de etapa, vencidos, hoy, totales **y `nuevosEnPeriodo`**.
- Caso mixto en la sección 4: `prospectos.exacto === false` con `interacciones.exacto === true` → "nuevos prospectos" marcado y las interacciones sin marcar, en la misma sección.
- Días anteriores a `diaCompletoDesde` no se dibujan como 0.
- `diaCompletoDesde === null` con `exacto === false` → la serie entera se declara no fiable.
- El enlace a Actividad Diaria navega y no escribe datos.
- Valores del gráfico accesibles sin visión.

---

## 7. Lo que este plan NO hace

- No añade métrica de conversión entre etapas (Decisión 1).
- No navega a fichas individuales ni crea/modifica datos desde el Resumen.
- No toca Actividad Diaria, Pipeline, Ficha ni motor de seguimiento.
- No modifica ni elimina ningún índice, función o constante **ya existente**. Añade uno nuevo (`by_usuario_fecha`) y dos constantes nuevas; nada más.
- No implementa contadores materializados ni el componente de agregación (§2.3).
- No cierra JOS-77 (Decisión 3).

---

## 8. Decisiones a resolver

**1. Fuente de verdad visual y métrica de conversión.**
Propuesta: **JOS-62 manda** como diseño, JOS-24 define el alcance funcional, y **la conversión queda fuera** — no está especificado en ninguna parte cómo se calcula ni sobre qué ventana, y existe issue propio para métricas ([JOS-47](https://linear.app/jose-lumbreras/issue/JOS-47), CRM-PRD). Añadirla aquí sería inventar producto durante la implementación.

**2. Copy del selector de período — cambia texto de un diseño aprobado. ✅ RESUELTA**
JOS-62 rotula el selector *"Esta semana" / "Este mes"*, pero §3.2 implementa ventanas móviles de 7 y 30 días. Con ventana móvil, *"Este mes"* es engañoso: el día 2 de agosto incluiría casi todo julio.
Propuesta: **rotular "Últimos 7 días" / "Últimos 30 días"**. Es fiel a lo que el número significa y coherente con el texto funcional de JOS-24 (*"en los últimos 30 días"*).
La alternativa —semana y mes civiles— hace que el lunes por la mañana y el día 1 de cada mes la pantalla aparezca casi vacía, que es justo cuando un networker revisa su ritmo.

> ✅ **Aprobada por el product owner el 2026-08-03.** El cambio de copy respecto a JOS-62 queda autorizado. La aprobación es del product owner, no de la auditoría: esta última solo señaló que el gate existía y estaba pendiente.

**3. ¿Se agrupa [JOS-77](https://linear.app/jose-lumbreras/issue/JOS-77)?**
JOS-77 pide calcular el contador de ritmo de la Actividad Diaria sobre `interacciones` en vez de sobre `fechaUltimoContacto`. **El índice `by_usuario_fecha` de este plan es exactamente lo que necesita**, y su ausencia es la causa de la aproximación que JOS-77 corrige.
Propuesta: **no agruparlo** — alcance distinto y tocaría una pantalla ya cerrada. Se anota en JOS-77 que tras este trabajo pasa a ser tarea pequeña. Si se prefiere agrupar, debe decidirse **ahora**.

**4. ¿Uno o dos bocados?**
Propuesta: **dos**, con auditoría de código entre medias (como JOS-66). El bocado A es verificable solo —query, tests y medición— sin nada visible; el B es puro interfaz. Auditarlos juntos dificultaría detectar un fallo de aislamiento o de presupuesto entre el ruido de la UI.

---

## 9. Riesgos

| Riesgo | Gravedad | Mitigación |
|---|---|---|
| ~~La medición de §4.3 no deja margen~~ | — | **Reformulado.** El presupuesto ya está acotado y medido sobre el peor caso admisible: 32,7 %, margen 3,06× (§4.4-quater). JOS-74 **no** es prerequisito: su parte de backend ya estaba implementada dentro de JOS-21 |
| La medición contra deployment real contradiga la medición local | Media | Gate al cierre del **bocado B**, no del A (§4.4-ter). Guión y cifras de contraste en [`JOS-24-e2e.md`](./JOS-24-e2e.md) §3. Si el servidor difiere, manda el servidor y se revisan las cotas |
| Una etapa satura y el usuario lee cifras parciales como exactas | Media | Flag único + §5.2: no existe ruta de código que muestre un parcial sin marcar |
| ~~El copy de períodos contradice el diseño aprobado~~ | — | **Cerrado**: Decisión 2 aprobada por el product owner el 2026-08-03 |
| Una métrica nueva se añade sin flag de parcialidad | Media | La tabla de §5.2 es exhaustiva y de cumplimiento obligatorio: nada se renderiza sin figurar en ella |
| El gráfico crece hasta ser un proyecto propio | Media | Sin librería, sin ejes, sin interactividad. Si crece, se para y se replantea |
| El índice nuevo altera queries existentes | Baja | Puramente aditivo; ninguna query existente lo referencia |
| Subir `LONGITUD_MAX_NOTAS` invalida la medición | Baja | Acoplamiento anotado en `constants.ts` junto al de `MAX_PIPELINE` (§4.4) |

---

## 10. Proceso

1. ✅ Este plan (rev. 4) → auditoría → **GO condicionado** (2026-08-03).
2. ✅ Bocado A implementado dentro del alcance autorizado, más **tres ampliaciones** aprobadas expresamente por el product owner, todas nacidas de hallazgos y no de conveniencia:
   - topes de texto en `interacciones` (§4.4-bis),
   - escenario de seed `resumen`, instrumental para la medición,
   - topes de `nombre` / `comoSeConocio` / `telefono` / `email` en `prospectos` (§4.4-quater), que cierran el bloqueante de la 2ª auditoría del código.
3. ⬅️ **AQUÍ ESTAMOS.** Bocado A → auditoría de código → GO/NO-GO. La medición §4.3 **ya no forma parte de este paso** (§4.4-ter).
4. Bocado B **+ medición contra deployment real** (`JOS-24-e2e.md` §3) → auditoría de código → GO/NO-GO.
5. Con el GO **y el OK explícito del product owner**: rama, commit, push y PR contra `master`. El merge lo hace el product owner.
6. Railway despliega al fusionar.
