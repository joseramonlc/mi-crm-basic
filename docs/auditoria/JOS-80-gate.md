# JOS-80 · Evidencia del gate de producción (borrado atómico)

Artefacto reproducible del gate exigido por el plan JOS-80 (rev. 8, §4.2(b)) antes de habilitar
`prospectos.eliminar`. Certifica cuánto consume, en una transacción de Convex, borrar un prospecto
y TODO su historial (`eliminarProspectoEnCascada`, `convex/lib/borrado.ts`), y fija
`MAX_INTERACCIONES_POR_PROSPECTO`.

Ejecutado el **2026-08-24**. Convex CLI **1.42.1**.

> **rev. 2 de esta evidencia — corrige un error de medición (blocker de la 3ª auditoría):** la 1ª
> versión sembraba texto ASCII y trataba «2.000 caracteres» como «2.000 bytes». Las validaciones
> acotan por `string.length`, NO por bytes (`convex/lib/validacion.ts`), así que un carácter BMP
> puede ocupar 3 bytes UTF-8. El peor caso admisible es **~3× mayor**. Aquí se remide sembrando
> TODOS los campos libres a su tope de longitud con caracteres de 3 bytes ("一", U+4E00).

Límites de transacción de Convex (https://docs.convex.dev/production/state/limits), denominador de
los porcentajes (`used / (used + remaining)`):

| Métrica | Límite |
|---|---|
| bytesRead | 16 777 216 (16 MiB) |
| bytesWritten | 16 777 216 (16 MiB) |
| documentsRead | 32 000 |
| documentsWritten | 16 000 |

---

## 0. Deployments y guardas

- **Producción** (target `--prod`, proyecto `crm-networker`): solo la auditoría de SOLO LECTURA
  (`auditarTamanos`). `APP_ENV=production`.
- **Desechable** = deployment de desarrollo `jose-lumbreras:crm-networker:dev`
  (`https://adamant-mockingbird-816.eu-west-1.convex.cloud`). `APP_ENV=development`. Solo aquí
  corren `sembrarPeorCaso`/`medirBorrado`, que `exigirDesarrollo()` (`convex/gateBorrado.ts`)
  bloquea si `APP_ENV !== "development"`.

```
$ npx convex env get APP_ENV --prod
production
$ npx convex env get APP_ENV
development
```

> Esta guarda protege SOLO las funciones de MEDICIÓN del gate (`sembrarPeorCaso`/`medirBorrado`),
> nunca `prospectos.eliminar` (que SÍ debe correr en producción, protegida por autorización +
> esta certificación). No hay requisito contradictorio.

---

## 1. Paso 1 — auditoría de tamaños en PRODUCCIÓN (solo lectura)

Devuelve SOLO tres enteros; ningún `prospectoId` ni campo personal cruza la frontera.

```
$ npx convex run gateBorrado:auditarTamanos --prod
{
  "maxBytesInteraccion": 348,
  "maxBytesProspecto": 434,
  "maxInteraccionesPorProspecto": 1
}
```

Máximo histórico existente: 1 interacción por prospecto, documentos ≤ 434 B. Nada existente se
acerca al tope; el peor caso a certificar es el ADMISIBLE hacia delante.

---

## 2. Pasos 2-3 — peor caso ADMISIBLE EN BYTES + borrado REAL medido (desechable)

Peor caso admisible por `convex/lib/validacion.ts` (cada carácter hasta 3 bytes UTF-8):
- Interacción: `queOcurrio` (2000) + `siguientePasoAcordado` (2000) = 4000 car. → **12 000 B** libres.
- Prospecto: `nombre`(80)+`comoSeConocio`(120)+`telefono`(25)+`email`(254)+`notas`(2000) = 2479 car.
  → **7 437 B** libres.

`sembrarPeorCaso` (`convex/gateBorrado.ts`) rellena TODOS esos campos con "一" a su tope de longitud,
por `ctx.db.insert` directo (salta validación: reproduce también históricos pre-cotas). El `email`
se siembra como un email VÁLIDO de longitud máxima (`[^\s@]+@[^\s@]+\.[^\s@]+`, 254 car.), no 254
"一": así representa el ALTA PÚBLICA real, no solo el esquema `v.string()`. El `@` y el `.` cuestan
1 byte (el resto 3): el documento queda ~8 bytes por debajo de 254×"一" — despreciable, y del lado
conservador. `medirBorrado` ejecuta `eliminarProspectoEnCascada` (el MISMO helper que usa
`prospectos.eliminar`) y devuelve `getTransactionMetrics()`.

**Hallazgo (se mantiene):** `documentsRead = 2·(N+1)`. Convex LEE CADA DOC DOS VECES al borrar
(localizar por índice + lectura interna de `ctx.db.delete`); por eso `bytesRead ≈ 2×` el contenido.

**Comandos** (por cada tope N; el id cambia en cada corrida):
```
$ npx convex run gateBorrado:sembrarPeorCaso '{"usuarioId":"gate-jos80","numInteracciones":N}'
"<id>"
$ npx convex run gateBorrado:medirBorrado '{"id":"<id>"}'
```

### 2.1 · N = 500 (tope provisional) — id `k173zmv4e58edkzfgrchzmw8kx8d36n5`
```
{ "bytesRead":       { "used": 12232292, "remaining": 4544924 },
  "bytesWritten":    { "used": 0,        "remaining": 16777216 },
  "documentsRead":   { "used": 1002,     "remaining": 30998 },
  "documentsWritten":{ "used": 501,      "remaining": 15499 } }
```
bytesRead **72,91 %** · docsRead 3,13 % · docsWritten 3,13 % · bytesWritten 0 % → ❌

### 2.2 · N = 200 — id `k173k46n9er1xwq3vd1zfq3j0h8d3yjm`
```
{ "bytesRead":       { "used": 4902092, "remaining": 11875124 },
  "bytesWritten":    { "used": 0,       "remaining": 16777216 },
  "documentsRead":   { "used": 402,     "remaining": 31598 },
  "documentsWritten":{ "used": 201,     "remaining": 15799 } }
```
bytesRead **29,22 %** · docsRead 1,26 % · docsWritten 1,26 % → ❌

### 2.3 · N = 170 — id `k17cgwanepbqn5mwwk9avb8z6s8d3cgt` (email válido máx.)
```
{ "bytesRead":       { "used": 4169064, "remaining": 12608152 },
  "bytesWritten":    { "used": 0,       "remaining": 16777216 },
  "documentsRead":   { "used": 342,     "remaining": 31658 },
  "documentsWritten":{ "used": 171,     "remaining": 15829 } }
```
bytesRead **24,85 %** · docsRead 1,07 % · docsWritten 1,07 % → ✅ (al borde)

### 2.4 · N = 150 — id `k175wpgttcdratefnz8az9hd2d8d3631` (email válido máx.) — **TOPE ELEGIDO**
```
{ "bytesRead":       { "used": 3680384, "remaining": 13096832 },
  "bytesWritten":    { "used": 0,       "remaining": 16777216 },
  "documentsRead":   { "used": 302,     "remaining": 31698 },
  "documentsWritten":{ "used": 151,     "remaining": 15849 } }
```
bytesRead **21,94 %** · docsRead 0,94 % · docsWritten 0,94 % → ✅

> Las filas §2.1/§2.2/§2.5 (500/200/100) se midieron con `email` de 254 "一"; la corrección a email
> válido resta ~8 bytes al ÚNICO documento de prospecto (independiente de N), así que esas cifras
> siguen siendo cotas superiores válidas. 170 y 150 están re-medidas con el email válido.

### 2.5 · N = 100 — id `k171xen8ga67v1n2dsxtpzyae18d31vy`
```
{ "bytesRead":       { "used": 2458692, "remaining": 14318524 },
  "bytesWritten":    { "used": 0,       "remaining": 16777216 },
  "documentsRead":   { "used": 202,     "remaining": 31798 },
  "documentsWritten":{ "used": 101,     "remaining": 15899 } }
```
bytesRead **14,65 %** · docsRead 0,63 % · docsWritten 0,63 % → ✅

---

## 3. Veredicto

- El binding es **bytesRead** (doble lectura de Convex). En el PEOR CASO PATOLÓGICO (cada carácter
  de 3 bytes en todos los campos), el criterio ≤ 25 % se cumple hasta **N ≈ 170**; con margen
  cómodo, **N = 150** (21,94 %).
- Nota: por debajo del 100 % el borrado SÍ cabe aunque supere el 25 %; el 25 % es el margen de
  DISEÑO (4×), no el límite físico. A 500, el peor caso patológico es 72,91 % (cabe, con 1,37× de
  holgura).
- `MAX_INTERACCIONES_POR_PROSPECTO` = **150** (decisión de producto 2026-08-24): se conservan los
  límites de texto por caracteres y se baja el tope; bytesRead 21,94 % (§2.4). Ver `auditoria/plan-jos80-A2.md`.
- Cada `medirBorrado` borra su propia siembra; la desechable quedó limpia.

**Reproducción:** re-ejecutar §2 en un deployment con `APP_ENV=development` con el `numInteracciones`
de cada fila.

---

## 4. Evidencia de despliegue de A1 (precondición del gate)

- **`2005459`** — commit de A1 en la rama `joseramonlc/jos-80-a1-gate-y-tope`.
- **`45dadea`** — MERGE de **PR #20** a `master` (contiene `2005459`); es lo que corre producción.
  (HEAD de la rama = `2005459`; master/prod = `45dadea`: rama vs. merge, no discrepancia.)

```
$ gh pr view 20 --json baseRefName,mergeCommit,mergedAt,mergedBy,number,state,title
{"baseRefName":"master","mergeCommit":{"oid":"45dadea67b2b0442e5d71c26a899f737d4ccf858"},
 "mergedAt":"2026-08-23T23:39:36Z","mergedBy":{"login":"joseramonlc"},"number":20,
 "state":"MERGED","title":"JOS-80 (A1): gate de presupuesto de borrado y tope de interacciones"}

$ railway deployment list   # environment production
SUCCESS  2026-08-23T23:39:37.760Z  45dadea67b  Merge pull request #20 …   (instancia RUNNING)
REMOVED  2026-08-22T15:01:56.931Z  e9b7e87457  Merge pull request #19 …
```

> Verificabilidad: GitHub, Railway y la producción de Convex son sistemas EXTERNOS; este documento
> captura la salida observada. La MEDICIÓN (§2) es reproducible en cualquier deployment desechable.
