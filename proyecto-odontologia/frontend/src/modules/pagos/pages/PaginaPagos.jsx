import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerPagos,
  obtenerOpcionesPago,
  anularPago,
} from "../services/pagosService";
import AnularPagoModal from "../components/AnularPagoModal";
import "../../roles/styles/roles.css";
import "../../pacientes/styles/pacientes.css";
import "../../tratamientos/styles/tratamientos.css";
import "../styles/pagos.css";

/*
  ABM 04 — Pagos. Vista «caja»: listado global de pagos del consultorio con
  filtros por rango de fechas, medio de pago y estado (vigentes / anulados /
  todos), totales y paginación. La anulación se hace por fila.
*/

const ESTADOS = [
  { valor: "vigentes", etiqueta: "Vigentes" },
  { valor: "anulados", etiqueta: "Anulados" },
  { valor: "todos", etiqueta: "Todos" },
];

const ORDENES = [
  { valor: "fecha_desc", etiqueta: "Fecha de pago ↓" },
  { valor: "fecha_asc", etiqueta: "Fecha de pago ↑" },
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
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

function PaginaPagos() {
  const { tienePermiso } = useAuth();
  const puedeAnular = tienePermiso("anular_pagos");
  const navegar = useNavigate();

  const [pagos, setPagos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState({ vigente: 0, anulado: 0 });
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);

  const [opciones, setOpciones] = useState({ medios: [] });

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [filtroMedio, setFiltroMedio] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("vigentes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState("fecha_desc");

  const [pagoAAnular, setPagoAAnular] = useState(null);

  useEffect(() => {
    obtenerOpcionesPago()
      .then((datos) => setOpciones({ medios: datos.medios || [] }))
      .catch(() => {});
  }, []);

  const cargarPagos = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");
      const datos = await obtenerPagos({
        idMedioPago: filtroMedio || undefined,
        estado: filtroEstado,
        desde: desde || undefined,
        hasta: hasta || undefined,
        orden,
        pagina,
        porPagina,
      });
      setPagos(Array.isArray(datos.pagos) ? datos.pagos : []);
      setTotal(Number(datos.total) || 0);
      setTotales(datos.totales || { vigente: 0, anulado: 0 });
    } catch (error) {
      const codigo = error.response?.status;
      setMensajeError(
        codigo === 403
          ? "No tenés permisos suficientes para consultar los pagos."
          : error.response?.data?.mensaje || "No se pudo cargar la caja."
      );
      setPagos([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [filtroMedio, filtroEstado, desde, hasta, orden, pagina, porPagina]);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  function cambiarFiltro(setter, valor) {
    setPagina(1);
    setter(valor);
  }

  async function confirmarAnulacion(motivo) {
    try {
      setProcesando(true);
      setMensajeError("");
      setMensajeExito("");
      await anularPago(pagoAAnular.id_pago, motivo);
      setPagoAAnular(null);
      setMensajeExito("El pago se anuló correctamente.");
      await cargarPagos();
    } catch (error) {
      setMensajeError(
        error.response?.data?.mensaje || "No se pudo anular el pago."
      );
      setPagoAAnular(null);
    } finally {
      setProcesando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <>
      <main className="roles-page pagos-page">
        <section className="roles-page__encabezado">
          <div>
            <h1>Pagos</h1>
            <p className="roles-page__descripcion">
              Caja del consultorio: todos los pagos registrados contra
              tratamientos, con su medio y su estado.
            </p>
          </div>
        </section>

        <section className="roles-page__panel">
          <form
            className="roles-page__filtros tratamientos-page__filtros"
            onSubmit={(e) => e.preventDefault()}
          >
            <select
              value={filtroEstado}
              onChange={(e) => cambiarFiltro(setFiltroEstado, e.target.value)}
            >
              {ESTADOS.map((estado) => (
                <option key={estado.valor} value={estado.valor}>
                  {estado.etiqueta}
                </option>
              ))}
            </select>

            <select
              value={filtroMedio}
              onChange={(e) => cambiarFiltro(setFiltroMedio, e.target.value)}
            >
              <option value="">Todos los medios</option>
              {opciones.medios.map((medio) => (
                <option key={medio.id} value={medio.id}>
                  {medio.nombre}
                </option>
              ))}
            </select>

            <label className="tratamientos-page__filtro-fecha">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(e) => cambiarFiltro(setDesde, e.target.value)}
              />
            </label>
            <label className="tratamientos-page__filtro-fecha">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(e) => cambiarFiltro(setHasta, e.target.value)}
              />
            </label>

            <select
              value={orden}
              onChange={(e) => cambiarFiltro(setOrden, e.target.value)}
            >
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </form>

          <dl className="pagos-page__totales">
            <div>
              <dt>Total vigente</dt>
              <dd>
                <strong>{formatearMoneda(totales.vigente)}</strong>
              </dd>
            </div>
            <div>
              <dt>Total anulado</dt>
              <dd>{formatearMoneda(totales.anulado)}</dd>
            </div>
          </dl>

          {mensajeError && (
            <div className="roles-page__mensaje roles-page__mensaje--error">
              {mensajeError}
            </div>
          )}
          {mensajeExito && (
            <div className="roles-page__mensaje roles-page__mensaje--exito">
              {mensajeExito}
            </div>
          )}

          {cargando ? (
            <p className="roles-page__estado">Cargando pagos...</p>
          ) : pagos.length === 0 ? (
            <p className="roles-page__estado">Sin resultados</p>
          ) : (
            <>
              <div className="roles-page__tabla-contenedor">
                <table className="roles-page__tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Paciente</th>
                      <th>Tratamiento</th>
                      <th>Monto</th>
                      <th>Medio</th>
                      <th>Estado</th>
                      {puedeAnular && <th aria-label="Acciones" />}
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((pago) => (
                      <tr
                        key={pago.id_pago}
                        className={pago.anulado ? "pagos-fila--anulada" : ""}
                      >
                        <td>{formatearFecha(pago.fecha_pago)}</td>
                        <td>
                          <button
                            type="button"
                            className="pagos-page__enlace"
                            onClick={() =>
                              navegar(
                                `/panel/tratamientos/${pago.id_tratamiento}`
                              )
                            }
                          >
                            {pago.paciente_apellido}, {pago.paciente_nombre}
                          </button>
                        </td>
                        <td>
                          {pago.tipo_nombre}
                          {pago.tratamiento_descripcion
                            ? ` · ${pago.tratamiento_descripcion}`
                            : ""}
                        </td>
                        <td>{formatearMoneda(pago.monto)}</td>
                        <td>{pago.medio_nombre}</td>
                        <td>
                          <span
                            className={`roles-page__badge ${
                              pago.anulado
                                ? "tratamientos-badge--estado-4"
                                : "tratamientos-badge--estado-3"
                            }`}
                          >
                            {pago.anulado ? "anulado" : "vigente"}
                          </span>
                        </td>
                        {puedeAnular && (
                          <td className="pagos-fila__acciones">
                            {!pago.anulado && (
                              <button
                                type="button"
                                className="roles-page__boton-peligro roles-page__boton--chico"
                                onClick={() => {
                                  setMensajeError("");
                                  setMensajeExito("");
                                  setPagoAAnular(pago);
                                }}
                              >
                                Anular
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pacientes-page__paginacion">
                <span>
                  {total} pago{total === 1 ? "" : "s"} · página {pagina} de{" "}
                  {totalPaginas}
                </span>
                <div className="pacientes-page__paginacion-botones">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <AnularPagoModal
        abierto={Boolean(pagoAAnular)}
        pago={pagoAAnular}
        cargando={procesando}
        onConfirmar={confirmarAnulacion}
        onCancelar={() => {
          if (!procesando) setPagoAAnular(null);
        }}
      />
    </>
  );
}

export default PaginaPagos;
