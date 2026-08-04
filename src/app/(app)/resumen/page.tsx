"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import { BarChart, Card, EmptyState, Icon, PillSelect, StageBadge, buttonStyle } from "@/components/ui";
import { OPCIONES_ETAPA } from "@/lib/etiquetas";
import { useDayKey } from "@/lib/useDayKey";
import {
  BANNER_VISTA_PARCIAL,
  CARGANDO,
  GRAFICO_ARIA,
  OPCIONES_PERIODO,
  PENDIENTES_ENLACE,
  PENDIENTES_HOY,
  PENDIENTES_VENCIDOS,
  PERIODO_LABEL,
  SECCION_ACTIVIDAD,
  SECCION_ETAPAS,
  SECCION_PENDIENTES,
  SECCION_TOTALES,
  SECCION_TOTALES_PARCIAL,
  SIN_PENDIENTES,
  TITULO,
  TOTAL_ACTIVOS,
  TOTAL_DESCARTADOS,
  TOTAL_INCORPORADOS,
  VACIO_CTA,
  VACIO_DESCRIPCION,
  VACIO_TITULO,
  avisoSerie,
  cifra,
  etiquetaBarra,
  fraseActividad,
  fraseSinActividad,
  inicialDiaSemana,
  type Periodo,
} from "./textos";

type Datos = FunctionReturnType<typeof api.resumen.resumen>;

/** Cifras con figuras tabulares, como el resto del sistema (design.md §1). */
const NUMERICO: React.CSSProperties = {
  fontFamily: "var(--font-numeric)",
  fontFeatureSettings: "var(--num-features)",
};

export default function ResumenPage() {
  const dayKey = useDayKey();
  const [periodo, setPeriodo] = React.useState<Periodo>("semana");
  const datos = useQuery(api.resumen.resumen, { dayKey, periodo });
  const mostrable = useRetenidoDelDia(datos, dayKey);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8" style={{ fontFamily: "var(--font-sans)" }}>
      <h1
        style={{
          fontSize: "var(--text-h2-size)",
          fontWeight: "var(--text-h2-weight)" as React.CSSProperties["fontWeight"],
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--color-neutral-900)",
          marginBottom: 16,
        }}
      >
        {TITULO}
      </h1>
      <Contenido datos={mostrable} actualizando={datos === undefined} periodo={periodo} onPeriodo={setPeriodo} />
    </div>
  );
}

/**
 * Último resultado entregado, PERO solo dentro del mismo día (plan §D3).
 *
 * Al cambiar de período `useQuery` devuelve `undefined` mientras viaja la nueva
 * consulta. Sin retención, la pantalla entera parpadearía a "Cargando…" y el
 * selector afectaría a las cinco secciones, que es lo contrario de lo
 * especificado: las secciones 2, 3 y 5 no dependen del período (lo garantiza el
 * backend, `convex/resumen.ts:100-117`), así que lo retenido SIGUE siendo verdad.
 *
 * ⚠️ Cruzada la MEDIANOCHE no lo es: los pendientes se calculan con
 * `ventanaDia(dayKey)`, y los de ayer serían datos falsos, no datos viejos. Por
 * eso la retención va anclada al dayKey y se descarta al cambiar de día:
 * preferimos un instante de "Cargando…" a un instante de cifras falsas.
 */
function useRetenidoDelDia(datos: Datos | undefined, dayKey: string): Datos | undefined {
  // Ref y NO estado: guardar el último payload no debe provocar un render. Con
  // estado, una query que devolviera un objeto nuevo en cada render entraría en
  // bucle (guardar → renderizar → guardar). `useQuery` de Convex memoiza el
  // resultado y no lo haría, pero la retención no puede depender de esa gentileza.
  const retenido = React.useRef<{ dayKey: string; datos: Datos } | null>(null);

  React.useEffect(() => {
    if (datos !== undefined) retenido.current = { dayKey, datos };
  }, [datos, dayKey]);

  if (datos !== undefined) return datos;
  // Leer la ref en render es deliberado: es justo el valor del commit anterior,
  // y sin él la pantalla parpadearía entera en cada cambio de período.
  // eslint-disable-next-line react-hooks/refs
  return retenido.current !== null && retenido.current.dayKey === dayKey ? retenido.current.datos : undefined;
}

function Contenido({
  datos,
  actualizando,
  periodo,
  onPeriodo,
}: {
  datos: Datos | undefined;
  actualizando: boolean;
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
}) {
  // Tres estados excluyentes: carga / CRM vacío / resumen.
  if (datos === undefined) {
    return (
      <p role="status" style={{ padding: "48px 0", textAlign: "center", color: "var(--color-neutral-500)", fontSize: 15 }}>
        {CARGANDO}
      </p>
    );
  }

  // CRM vacío, derivado sin campo extra del servidor (plan §D1): la lectura es
  // una pasada SIN filtro sobre el tenant, así que cero prospectos contados
  // implica que no hubo truncamiento y que no existe ninguno. El caso truncado
  // daría 1.200, nunca 0.
  if (datos.prospectos.totales.activos + datos.prospectos.totales.descartados === 0) {
    return <EmptyState icon="users" title={VACIO_TITULO} description={VACIO_DESCRIPCION} ctaLabel={VACIO_CTA} ctaHref="/prospectos/nuevo" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PillSelect label={PERIODO_LABEL} options={OPCIONES_PERIODO} value={periodo} onChange={onPeriodo} />
      {!datos.prospectos.exacto && <BannerVistaParcial />}
      <SeccionEtapas porEtapa={datos.prospectos.porEtapa} exacto={datos.prospectos.exacto} />
      <SeccionPendientes pendientes={datos.prospectos.pendientes} exacto={datos.prospectos.exacto} />
      <SeccionActividad datos={datos} actualizando={actualizando} />
      <SeccionTotales totales={datos.prospectos.totales} exacto={datos.prospectos.exacto} />
    </div>
  );
}

function SeccionEtapas({ porEtapa, exacto }: { porEtapa: Datos["prospectos"]["porEtapa"]; exacto: boolean }) {
  // Proporción relativa a la etapa más poblada, como el diseño aprobado. Mínimo
  // 1 para no dividir por cero cuando todas están vacías.
  const max = Math.max(1, ...OPCIONES_ETAPA.map(({ value }) => porEtapa[value]));

  return (
    <Seccion titulo={SECCION_ETAPAS}>
      <Card>
        <ul style={{ display: "flex", flexDirection: "column", gap: 14, margin: 0, padding: 0, listStyle: "none" }}>
          {OPCIONES_ETAPA.map(({ value }) => (
            <li key={value} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Etiqueta y cifra arriba, barra debajo a todo el ancho: en 375 px
                  ninguna etiqueta se corta, ni la más larga del sistema. */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <StageBadge stage={value} />
                <span style={{ ...NUMERICO, fontSize: 15, fontWeight: 600, color: "var(--color-neutral-900)" }}>
                  {cifra(porEtapa[value], exacto)}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--color-neutral-100)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(porEtapa[value] / max) * 100}%`,
                    background: `var(--color-stage-${value}-dot)`,
                    borderRadius: 4,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Seccion>
  );
}

function SeccionPendientes({ pendientes, exacto }: { pendientes: Datos["prospectos"]["pendientes"]; exacto: boolean }) {
  const total = pendientes.vencidos + pendientes.hoy;

  return (
    <Seccion titulo={SECCION_PENDIENTES}>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ ...NUMERICO, fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: "var(--color-neutral-900)" }}>
              {cifra(total, exacto)}
            </div>
            <div style={{ fontSize: 14, color: "var(--color-neutral-500)", marginTop: 4 }}>
              {/* "No tienes pendientes" es una afirmación de AUSENCIA, y solo se
                  puede hacer habiendo leído todo: con la lectura truncada, los
                  ceros son de los 1.200 leídos y puede haber pendientes entre los
                  que no se leyeron. Sin la guarda de `exacto`, esta rama se
                  saltaba la regla de §5.2 justo en el caso más engañoso. */}
              {total === 0 && exacto
                ? SIN_PENDIENTES
                : `${cifra(pendientes.vencidos, exacto)} ${PENDIENTES_VENCIDOS} · ${cifra(pendientes.hoy, exacto)} ${PENDIENTES_HOY}`}
            </div>
          </div>
          {/* Navegación, no acción: el Resumen es de solo lectura y no escribe nada. */}
          <Link href="/actividad" style={{ ...buttonStyle({ variant: "ghost" }), alignSelf: "flex-start", paddingLeft: 0 }}>
            {PENDIENTES_ENLACE}
          </Link>
        </div>
      </Card>
    </Seccion>
  );
}

function SeccionActividad({ datos, actualizando }: { datos: Datos; actualizando: boolean }) {
  const { interacciones, prospectos, periodo } = datos;
  const { exacto, diaCompletoDesde, serie, totalEnPeriodo } = interacciones;

  /**
   * ÚNICA definición de "sin datos" de la pantalla (plan §D6). Las tres ramas:
   *   exacto           → nada sin datos, no hubo truncamiento
   *   diaCompletoDesde → sin datos los días anteriores a esa fecha
   *   null + !exacto   → NINGÚN día quedó completo: todos son sin datos
   * La comparación lexicográfica es exacta en YYYY-MM-DD (igual que el handler).
   */
  const sinDatos = (dayKey: string) => !exacto && (diaCompletoDesde === null || dayKey < diaCompletoDesde);

  const barras = serie.map((punto) => ({ ...punto, sinDatos: sinDatos(punto.dayKey) }));
  const aviso = avisoSerie(exacto, diaCompletoDesde);
  /**
   * "Sin actividad" afirma una AUSENCIA, así que exige haber leído las DOS
   * lecturas enteras. Los dos flags van explícitos aunque `totalEnPeriodo === 0`
   * ya implique `interacciones.exacto`: la regla que se quiere hacer visible es
   * "solo se afirma ausencia con lectura completa", no una deducción sobre las
   * cotas. Sin la guarda de `prospectos.exacto` esta rama ocultaba altas que
   * pudieran existir fuera del subconjunto leído.
   */
  const sinActividad = exacto && prospectos.exacto && totalEnPeriodo === 0 && prospectos.nuevosEnPeriodo === 0;

  return (
    <Seccion titulo={SECCION_ACTIVIDAD} ariaBusy={actualizando}>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BarChart
            datos={barras}
            ariaLabel={GRAFICO_ARIA}
            etiqueta={(d) => etiquetaBarra(d.dayKey, d.valor, d.sinDatos ?? false)}
            // En 30 días los rótulos serían ilegibles: el rango va en la frase.
            rotulo={(d, _indice, total) => (total <= 7 ? inicialDiaSemana(d.dayKey) : null)}
          />
          <p style={{ fontSize: 14, color: "var(--color-neutral-700)", lineHeight: 1.5 }}>
            {sinActividad
              ? fraseSinActividad(periodo.desde, periodo.hastaIncluido)
              : fraseActividad({
                  interacciones: totalEnPeriodo,
                  interaccionesExactas: exacto,
                  // Viene de la OTRA lectura y lleva SU flag: la sección puede
                  // mostrar una métrica marcada junto a otra sin marcar.
                  nuevos: prospectos.nuevosEnPeriodo,
                  nuevosExactos: prospectos.exacto,
                  desde: periodo.desde,
                  hastaIncluido: periodo.hastaIncluido,
                })}
          </p>
          {aviso !== null && <Aviso texto={aviso} />}
        </div>
      </Card>
    </Seccion>
  );
}

function SeccionTotales({ totales, exacto }: { totales: Datos["prospectos"]["totales"]; exacto: boolean }) {
  const columnas: Array<[string, number]> = [
    [TOTAL_ACTIVOS, totales.activos],
    [TOTAL_INCORPORADOS, totales.incorporados],
    [TOTAL_DESCARTADOS, totales.descartados],
  ];

  return (
    // Con lectura truncada el encabezado deja de decir "totales": no lo son.
    <Seccion titulo={exacto ? SECCION_TOTALES : SECCION_TOTALES_PARCIAL}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          {columnas.map(([etiqueta, valor]) => (
            <div key={etiqueta} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ ...NUMERICO, fontSize: 22, fontWeight: 700, color: "var(--color-primary-600)" }}>{cifra(valor, exacto)}</div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-500)", marginTop: 3 }}>{etiqueta}</div>
            </div>
          ))}
        </div>
      </Card>
    </Seccion>
  );
}

function Seccion({ titulo, ariaBusy, children }: { titulo: string; ariaBusy?: boolean; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} aria-busy={ariaBusy} className="flex flex-col gap-3">
      <h2
        style={{
          fontSize: "var(--text-h3-size)",
          fontWeight: "var(--text-h3-weight)" as React.CSSProperties["fontWeight"],
          color: "var(--color-neutral-900)",
        }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Mismo tratamiento visual que el banner de vista parcial del Pipeline. */
function Aviso({ texto }: { texto: string }) {
  return (
    <p
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        background: "var(--color-warning-bg)",
        color: "var(--color-warning-text)",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <Icon name="info" size={15} style={{ flex: "none" }} />
      {texto}
    </p>
  );
}

function BannerVistaParcial() {
  return <Aviso texto={BANNER_VISTA_PARCIAL} />;
}
