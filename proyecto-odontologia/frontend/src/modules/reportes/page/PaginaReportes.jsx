import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  obtenerResumen,
  obtenerIngresosPorTipo,
  obtenerIngresosPorMedio,
  obtenerEgresosPorTipo,
  obtenerPendientes,
  obtenerMensual,
} from "../services/reportesService";
import BarrasReporte from "../components/BarrasReporte";

import "../../roles/styles/roles.css";
import "../../pacientes/styles/pacientes.css";
import "../styles/reportes.css";

/*
  Módulo 06 — Reportes (consumo, solo lectura). Responde la pregunta central del
  negocio: cuánto se cobra, cuánto ingresa por cada práctica, cuánto se gasta.

  - Selector de período (por defecto, el mes actual).
  - Tarjetas KPI: ingresos, egresos y resultado neto del período.
  - Tratamientos por estado (snapshot del consultorio).
  - Barras (div/CSS, sin librería): ingresos por práctica, arqueo por medio de
    pago y egresos por tipo de gasto.
  - Tabla de pendientes de cobro por tratamiento.
  - Vista mensual de un año (ingresos / egresos / neto por mes).
*/

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function formatearFecha(valor) {
  if (!valor) return "—";
  const fecha = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

function hoyISO() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
}

function primerDiaDelMesISO() {
  return `${hoyISO().slice(0, 7)}-01`;
}

function mensajeDeError(error, accion) {
  if (error?.response?.status === 403) {
    return "No tenés permisos suficientes para consultar los reportes.";
  }
  return error?.response?.data?.mensaje || `No se pudieron ${accion}.`;
}

function PaginaReportes() {
  const navegar = useNavigate();
  const anioActual = Number(hoyISO().slice(0, 4));

  // Rango aplicado (lo que se consultó) y borrador de los inputs.
  const [rango, setRango] = useState({
    desde: primerDiaDelMesISO(),
    hasta: hoyISO(),
  });
  const [borradorDesde, setBorradorDesde] = useState(rango.desde);
  const [borradorHasta, setBorradorHasta] = useState(rango.hasta);

  const [anio, setAnio] = useState(anioActual);

  const [resumen, setResumen] = useState(null);
  const [ingresosPorTipo, setIngresosPorTipo] = useState({ items: [], total: 0 });
  const [ingresosPorMedio, setIngresosPorMedio] = useState({ items: [], total: 0 });
  const [egresosPorTipo, setEgresosPorTipo] = useState({ items: [], total: 0 });
  const [pendientes, setPendientes] = useState({ items: [], total_saldo: 0, total_pendientes: 0 });
  const [mensual, setMensual] = useState(null);

  const [cargandoPeriodo, setCargandoPeriodo] = useState(true);
  const [cargandoMensual, setCargandoMensual] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  const cargarPeriodo = useCallback(async () => {
    try {
      setCargandoPeriodo(true);
      setMensajeError("");

      const [resResumen, resTipo, resMedio, resEgreso, resPend] = await Promise.all([
        obtenerResumen(rango),
        obtenerIngresosPorTipo(rango),
        obtenerIngresosPorMedio(rango),
        obtenerEgresosPorTipo(rango),
        obtenerPendientes(),
      ]);

      setResumen(resResumen);
      setIngresosPorTipo(resTipo);
      setIngresosPorMedio(resMedio);
      setEgresosPorTipo(resEgreso);
      setPendientes(resPend);
    } catch (error) {
      setMensajeError(mensajeDeError(error, "cargar los reportes del período"));
    } finally {
      setCargandoPeriodo(false);
    }
  }, [rango]);

  const cargarMensual = useCallback(async () => {
    try {
      setCargandoMensual(true);
      const datos = await obtenerMensual(anio);
      setMensual(datos);
    } catch (error) {
      setMensajeError(mensajeDeError(error, "cargar la vista mensual"));
    } finally {
      setCargandoMensual(false);
    }
  }, [anio]);

  useEffect(() => {
    cargarPeriodo();
  }, [cargarPeriodo]);

  useEffect(() => {
    cargarMensual();
  }, [cargarMensual]);

  function aplicarPeriodo(evento) {
    evento.preventDefault();
    if (borradorHasta && borradorDesde && borradorHasta < borradorDesde) {
      setMensajeError("La fecha «hasta» no puede ser anterior a «desde».");
      return;
    }
    setRango({ desde: borradorDesde, hasta: borradorHasta });
  }

  function volverAlMesActual() {
    const desde = primerDiaDelMesISO();
    const hasta = hoyISO();
    setBorradorDesde(desde);
    setBorradorHasta(hasta);
    setRango({ desde, hasta });
  }

  const maximoMensual = useMemo(() => {
    if (!mensual?.meses?.length) return 0;
    return Math.max(
      ...mensual.meses.flatMap((mes) => [mes.ingresos, mes.egresos]),
      0
    );
  }, [mensual]);

  const aniosDisponibles = useMemo(() => {
    const anios = [];
    for (let valor = anioActual + 1; valor >= anioActual - 6; valor -= 1) {
      anios.push(valor);
    }
    return anios;
  }, [anioActual]);

  return (
    <main className="roles-page reportes-page">
      <section className="roles-page__encabezado">
        <div>
          <h1>Reportes</h1>
          <p className="roles-page__descripcion">
            Cuánto se cobra, cuánto ingresa por cada práctica y cuánto se gasta,
            en el período elegido. Sólo cuentan los pagos y gastos vigentes.
          </p>
        </div>
      </section>

      <section className="roles-page__panel">
        <form className="reportes-periodo" onSubmit={aplicarPeriodo}>
          <label className="reportes-periodo__campo">
            Desde
            <input
              type="date"
              value={borradorDesde}
              max={borradorHasta || undefined}
              onChange={(evento) => setBorradorDesde(evento.target.value)}
            />
          </label>
          <label className="reportes-periodo__campo">
            Hasta
            <input
              type="date"
              value={borradorHasta}
              min={borradorDesde || undefined}
              onChange={(evento) => setBorradorHasta(evento.target.value)}
            />
          </label>
          <button type="submit" className="roles-page__boton-principal">
            Aplicar
          </button>
          <button
            type="button"
            className="roles-page__boton-secundario"
            onClick={volverAlMesActual}
          >
            Este mes
          </button>
        </form>

        {resumen ? (
          <p className="reportes-periodo__leyenda">
            Período: {formatearFecha(resumen.periodo.desde)} –{" "}
            {formatearFecha(resumen.periodo.hasta)}
          </p>
        ) : null}

        {mensajeError ? (
          <div className="roles-page__mensaje roles-page__mensaje--error">
            {mensajeError}
          </div>
        ) : null}

        {cargandoPeriodo ? (
          <p className="roles-page__estado">Cargando reportes...</p>
        ) : (
          <>
            <div className="reportes-kpis">
              <article className="reportes-kpi reportes-kpi--ingresos">
                <span className="reportes-kpi__rotulo">Ingresos del período</span>
                <strong className="reportes-kpi__valor">
                  {formatearMoneda(resumen?.ingresos)}
                </strong>
                <span className="reportes-kpi__nota">
                  {resumen?.cantidad_pagos ?? 0} pago
                  {resumen?.cantidad_pagos === 1 ? "" : "s"} vigente
                  {resumen?.cantidad_pagos === 1 ? "" : "s"}
                </span>
              </article>

              <article className="reportes-kpi reportes-kpi--egresos">
                <span className="reportes-kpi__rotulo">Egresos del período</span>
                <strong className="reportes-kpi__valor">
                  {formatearMoneda(resumen?.egresos)}
                </strong>
                <span className="reportes-kpi__nota">
                  {resumen?.cantidad_gastos ?? 0} gasto
                  {resumen?.cantidad_gastos === 1 ? "" : "s"} vigente
                  {resumen?.cantidad_gastos === 1 ? "" : "s"}
                </span>
              </article>

              <article
                className={`reportes-kpi ${
                  (resumen?.neto ?? 0) < 0
                    ? "reportes-kpi--neto-negativo"
                    : "reportes-kpi--neto"
                }`}
              >
                <span className="reportes-kpi__rotulo">Resultado neto</span>
                <strong className="reportes-kpi__valor">
                  {formatearMoneda(resumen?.neto)}
                </strong>
                <span className="reportes-kpi__nota">Ingresos − Egresos</span>
              </article>
            </div>

            <div className="reportes-grid">
              <article className="reportes-panel">
                <header className="reportes-panel__cabecera">
                  <h2>Tratamientos por estado</h2>
                  <span className="reportes-panel__sub">Snapshot del consultorio</span>
                </header>
                <ul className="reportes-estados">
                  {(resumen?.tratamientos_por_estado ?? []).map((estado) => (
                    <li key={estado.id_estado} className="reportes-estados__item">
                      <span className="reportes-estados__nombre">{estado.nombre}</span>
                      <span className="reportes-estados__cantidad">{estado.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="reportes-panel">
                <header className="reportes-panel__cabecera">
                  <h2>Ingresos por práctica</h2>
                  <span className="reportes-panel__sub">
                    Total {formatearMoneda(ingresosPorTipo.total)}
                  </span>
                </header>
                <BarrasReporte
                  items={(ingresosPorTipo.items ?? []).map((item) => ({
                    etiqueta: item.nombre,
                    valor: item.total,
                    detalle: `${item.cantidad_pagos} pago${
                      item.cantidad_pagos === 1 ? "" : "s"
                    }`,
                  }))}
                  formatearValor={formatearMoneda}
                  vacio="Sin cobros en el período."
                />
              </article>

              <article className="reportes-panel">
                <header className="reportes-panel__cabecera">
                  <h2>Arqueo por medio de pago</h2>
                  <span className="reportes-panel__sub">
                    Total {formatearMoneda(ingresosPorMedio.total)}
                  </span>
                </header>
                <BarrasReporte
                  items={(ingresosPorMedio.items ?? []).map((item) => ({
                    etiqueta: item.nombre,
                    valor: item.total,
                    detalle: `${item.cantidad_pagos} pago${
                      item.cantidad_pagos === 1 ? "" : "s"
                    }`,
                  }))}
                  formatearValor={formatearMoneda}
                  vacio="Sin cobros en el período."
                />
              </article>

              <article className="reportes-panel">
                <header className="reportes-panel__cabecera">
                  <h2>Egresos por tipo de gasto</h2>
                  <span className="reportes-panel__sub">
                    Total {formatearMoneda(egresosPorTipo.total)}
                  </span>
                </header>
                <BarrasReporte
                  items={(egresosPorTipo.items ?? []).map((item) => ({
                    etiqueta: item.nombre,
                    valor: item.total,
                    detalle: `${item.cantidad_gastos} gasto${
                      item.cantidad_gastos === 1 ? "" : "s"
                    }`,
                  }))}
                  formatearValor={formatearMoneda}
                  vacio="Sin gastos en el período."
                />
              </article>
            </div>

            <article className="reportes-panel reportes-panel--ancho">
              <header className="reportes-panel__cabecera">
                <h2>Pendientes de cobro</h2>
                <span className="reportes-panel__sub">
                  {pendientes.total_pendientes} tratamiento
                  {pendientes.total_pendientes === 1 ? "" : "s"} · saldo total{" "}
                  {formatearMoneda(pendientes.total_saldo)}
                </span>
              </header>

              {(pendientes.items ?? []).length === 0 ? (
                <p className="reportes__vacio">
                  No hay tratamientos con saldo pendiente.
                </p>
              ) : (
                <div className="roles-page__tabla-contenedor">
                  <table className="roles-page__tabla">
                    <thead>
                      <tr>
                        <th>Paciente</th>
                        <th>Tratamiento</th>
                        <th>Estado</th>
                        <th className="reportes-num">Precio</th>
                        <th className="reportes-num">Pagado</th>
                        <th className="reportes-num">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.items.map((fila) => (
                        <tr key={fila.id_tratamiento}>
                          <td>{fila.paciente}</td>
                          <td>
                            <button
                              type="button"
                              className="reportes-enlace"
                              onClick={() =>
                                navegar(`/panel/tratamientos/${fila.id_tratamiento}`)
                              }
                            >
                              #{fila.id_tratamiento} · {fila.tipo_tratamiento}
                            </button>
                          </td>
                          <td>{fila.estado}</td>
                          <td className="reportes-num">{formatearMoneda(fila.precio)}</td>
                          <td className="reportes-num">{formatearMoneda(fila.pagado)}</td>
                          <td className="reportes-num reportes-num--saldo">
                            {formatearMoneda(fila.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </>
        )}
      </section>

      <section className="roles-page__panel">
        <div className="reportes-panel__cabecera reportes-mensual__cabecera">
          <div>
            <h2>Vista mensual</h2>
            <span className="reportes-panel__sub">
              Ingresos, egresos y neto de cada mes del año.
            </span>
          </div>
          <label className="reportes-periodo__campo">
            Año
            <select value={anio} onChange={(evento) => setAnio(Number(evento.target.value))}>
              {aniosDisponibles.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </label>
        </div>

        {cargandoMensual ? (
          <p className="roles-page__estado">Cargando vista mensual...</p>
        ) : (
          <div className="roles-page__tabla-contenedor">
            <table className="roles-page__tabla reportes-mensual">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="reportes-num">Ingresos</th>
                  <th className="reportes-num">Egresos</th>
                  <th className="reportes-num">Neto</th>
                  <th>Comparativa</th>
                </tr>
              </thead>
              <tbody>
                {(mensual?.meses ?? []).map((mes) => (
                  <tr key={mes.mes}>
                    <td>{MESES_CORTOS[mes.mes - 1]}</td>
                    <td className="reportes-num">{formatearMoneda(mes.ingresos)}</td>
                    <td className="reportes-num">{formatearMoneda(mes.egresos)}</td>
                    <td
                      className={`reportes-num ${
                        mes.neto < 0 ? "reportes-num--negativo" : ""
                      }`}
                    >
                      {formatearMoneda(mes.neto)}
                    </td>
                    <td className="reportes-mensual__barras">
                      <span
                        className="reportes-mensual__barra reportes-mensual__barra--ingreso"
                        style={{
                          width:
                            maximoMensual > 0
                              ? `${(mes.ingresos / maximoMensual) * 100}%`
                              : "0%",
                        }}
                        title={`Ingresos ${formatearMoneda(mes.ingresos)}`}
                      />
                      <span
                        className="reportes-mensual__barra reportes-mensual__barra--egreso"
                        style={{
                          width:
                            maximoMensual > 0
                              ? `${(mes.egresos / maximoMensual) * 100}%`
                              : "0%",
                        }}
                        title={`Egresos ${formatearMoneda(mes.egresos)}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total {mensual?.anio}</td>
                  <td className="reportes-num">
                    {formatearMoneda(mensual?.totales?.ingresos)}
                  </td>
                  <td className="reportes-num">
                    {formatearMoneda(mensual?.totales?.egresos)}
                  </td>
                  <td
                    className={`reportes-num ${
                      (mensual?.totales?.neto ?? 0) < 0 ? "reportes-num--negativo" : ""
                    }`}
                  >
                    {formatearMoneda(mensual?.totales?.neto)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default PaginaReportes;
