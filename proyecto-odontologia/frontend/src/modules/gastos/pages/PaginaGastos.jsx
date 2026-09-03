import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerGastos,
  obtenerOpcionesGasto,
  registrarGasto,
  actualizarGasto,
  anularGasto,
} from "../services/gastosService";
import FormularioGasto from "../components/FormularioGasto";
import AnularGastoModal from "../components/AnularGastoModal";
import "../../roles/styles/roles.css";
import "../../pacientes/styles/pacientes.css";
import "../../tratamientos/styles/tratamientos.css";
import "../styles/gastos.css";

/*
  ABM 05 — Gastos. Listado global de los egresos del consultorio con filtros por
  tipo de gasto, período (fecha del gasto), imputación (general / de un
  tratamiento) y estado (vigentes / anulados / todos), con el total del período
  y paginación. El alta, la edición acotada y la anulación se hacen desde acá.
*/

const ESTADOS = [
  { valor: "vigentes", etiqueta: "Vigentes" },
  { valor: "anulados", etiqueta: "Anulados" },
  { valor: "todos", etiqueta: "Todos" },
];

const IMPUTACIONES = [
  { valor: "todos", etiqueta: "Todas las imputaciones" },
  { valor: "generales", etiqueta: "Gastos generales" },
  { valor: "con_tratamiento", etiqueta: "Imputados a un tratamiento" },
];

const ORDENES = [
  { valor: "fecha_desc", etiqueta: "Fecha del gasto ↓" },
  { valor: "fecha_asc", etiqueta: "Fecha del gasto ↑" },
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

function PaginaGastos() {
  const { tienePermiso } = useAuth();
  const puedeRegistrar = tienePermiso("registrar_gastos");
  const puedeEditar = tienePermiso("editar_gastos");
  const puedeAnular = tienePermiso("anular_gastos");
  const navegar = useNavigate();

  const [gastos, setGastos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState({ vigente: 0, anulado: 0 });
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);

  const [opciones, setOpciones] = useState({ tipos: [], tratamientos: [] });

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroImputacion, setFiltroImputacion] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("vigentes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState("fecha_desc");

  const [modalAlta, setModalAlta] = useState(false);
  const [gastoAEditar, setGastoAEditar] = useState(null);
  const [erroresForm, setErroresForm] = useState([]);
  const [gastoAAnular, setGastoAAnular] = useState(null);

  useEffect(() => {
    obtenerOpcionesGasto()
      .then((datos) =>
        setOpciones({
          tipos: datos.tipos || [],
          tratamientos: datos.tratamientos || [],
        })
      )
      .catch(() => {});
  }, []);

  const cargarGastos = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");
      const datos = await obtenerGastos({
        idTipoGasto: filtroTipo || undefined,
        imputacion: filtroImputacion,
        estado: filtroEstado,
        desde: desde || undefined,
        hasta: hasta || undefined,
        orden,
        pagina,
        porPagina,
      });
      setGastos(Array.isArray(datos.gastos) ? datos.gastos : []);
      setTotal(Number(datos.total) || 0);
      setTotales(datos.totales || { vigente: 0, anulado: 0 });
    } catch (error) {
      const codigo = error.response?.status;
      setMensajeError(
        codigo === 403
          ? "No tenés permisos suficientes para consultar los gastos."
          : error.response?.data?.mensaje || "No se pudieron cargar los gastos."
      );
      setGastos([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [filtroTipo, filtroImputacion, filtroEstado, desde, hasta, orden, pagina, porPagina]);

  useEffect(() => {
    cargarGastos();
  }, [cargarGastos]);

  function cambiarFiltro(setter, valor) {
    setPagina(1);
    setter(valor);
  }

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
  }

  async function guardarAlta(datos) {
    try {
      setProcesando(true);
      setErroresForm([]);
      limpiarMensajes();
      const respuesta = await registrarGasto(datos);
      setModalAlta(false);
      setMensajeExito(
        `Gasto registrado (ID ${respuesta.gasto.id_gasto}) por ${formatearMoneda(
          respuesta.gasto.monto
        )}.`
      );
      await cargarGastos();
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresForm(datosError.errores);
      } else {
        setErroresForm([datosError?.mensaje || "No se pudo registrar el gasto."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function guardarEdicion(datos) {
    try {
      setProcesando(true);
      setErroresForm([]);
      limpiarMensajes();
      await actualizarGasto(gastoAEditar.id_gasto, datos);
      setGastoAEditar(null);
      setMensajeExito("El gasto se actualizó correctamente.");
      await cargarGastos();
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresForm(datosError.errores);
      } else {
        setErroresForm([datosError?.mensaje || "No se pudo actualizar el gasto."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function confirmarAnulacion(motivo) {
    try {
      setProcesando(true);
      limpiarMensajes();
      await anularGasto(gastoAAnular.id_gasto, motivo);
      setGastoAAnular(null);
      setMensajeExito("El gasto se anuló correctamente.");
      await cargarGastos();
    } catch (error) {
      setMensajeError(
        error.response?.data?.mensaje || "No se pudo anular el gasto."
      );
      setGastoAAnular(null);
    } finally {
      setProcesando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <>
      <main className="roles-page gastos-page">
        <section className="roles-page__encabezado">
          <div>
            <h1>Gastos</h1>
            <p className="roles-page__descripcion">
              Egresos del consultorio: generales o imputados a un tratamiento,
              con su tipo y su estado.
            </p>
          </div>

          {puedeRegistrar && (
            <div className="roles-page__botones-encabezado">
              <button
                type="button"
                className="roles-page__boton-principal"
                onClick={() => {
                  setErroresForm([]);
                  limpiarMensajes();
                  setModalAlta(true);
                }}
              >
                Registrar gasto
              </button>
            </div>
          )}
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
              value={filtroTipo}
              onChange={(e) => cambiarFiltro(setFiltroTipo, e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {opciones.tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>

            <select
              value={filtroImputacion}
              onChange={(e) => cambiarFiltro(setFiltroImputacion, e.target.value)}
            >
              {IMPUTACIONES.map((i) => (
                <option key={i.valor} value={i.valor}>
                  {i.etiqueta}
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

          <dl className="gastos-page__totales">
            <div>
              <dt>Total del período (vigente)</dt>
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
            <p className="roles-page__estado">Cargando gastos...</p>
          ) : gastos.length === 0 ? (
            <p className="roles-page__estado">Sin resultados</p>
          ) : (
            <>
              <div className="roles-page__tabla-contenedor">
                <table className="roles-page__tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Imputación</th>
                      <th>Descripción</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      {(puedeEditar || puedeAnular) && (
                        <th aria-label="Acciones" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((gasto) => (
                      <tr
                        key={gasto.id_gasto}
                        className={gasto.anulado ? "gastos-fila--anulada" : ""}
                      >
                        <td>{formatearFecha(gasto.fecha_gasto)}</td>
                        <td>{gasto.tipo_nombre}</td>
                        <td>
                          {gasto.imputado ? (
                            <button
                              type="button"
                              className="gastos-page__enlace"
                              onClick={() =>
                                navegar(
                                  `/panel/tratamientos/${gasto.id_tratamiento}`
                                )
                              }
                            >
                              {gasto.paciente_apellido}, {gasto.paciente_nombre}
                              {gasto.tipo_tratamiento_nombre
                                ? ` · ${gasto.tipo_tratamiento_nombre}`
                                : ""}
                            </button>
                          ) : (
                            <span className="gastos-page__general">General</span>
                          )}
                        </td>
                        <td>{gasto.descripcion || "—"}</td>
                        <td>{formatearMoneda(gasto.monto)}</td>
                        <td>
                          <span
                            className={`roles-page__badge ${
                              gasto.anulado
                                ? "tratamientos-badge--estado-4"
                                : "tratamientos-badge--estado-3"
                            }`}
                          >
                            {gasto.anulado ? "anulado" : "vigente"}
                          </span>
                        </td>
                        {(puedeEditar || puedeAnular) && (
                          <td className="gastos-fila__acciones">
                            {!gasto.anulado && puedeEditar && (
                              <button
                                type="button"
                                className="roles-page__boton-secundario roles-page__boton--chico"
                                onClick={() => {
                                  setErroresForm([]);
                                  limpiarMensajes();
                                  setGastoAEditar(gasto);
                                }}
                              >
                                Editar
                              </button>
                            )}
                            {!gasto.anulado && puedeAnular && (
                              <button
                                type="button"
                                className="roles-page__boton-peligro roles-page__boton--chico"
                                onClick={() => {
                                  limpiarMensajes();
                                  setGastoAAnular(gasto);
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
                  {total} gasto{total === 1 ? "" : "s"} · página {pagina} de{" "}
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
                    onClick={() =>
                      setPagina((p) => Math.min(totalPaginas, p + 1))
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {modalAlta && (
        <FormularioGasto
          modo="crear"
          opciones={opciones}
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarAlta}
          onCancelar={() => {
            if (!procesando) setModalAlta(false);
          }}
        />
      )}

      {gastoAEditar && (
        <FormularioGasto
          modo="editar"
          gasto={gastoAEditar}
          opciones={opciones}
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarEdicion}
          onCancelar={() => {
            if (!procesando) {
              setGastoAEditar(null);
              setErroresForm([]);
            }
          }}
        />
      )}

      <AnularGastoModal
        abierto={Boolean(gastoAAnular)}
        gasto={gastoAAnular}
        cargando={procesando}
        onConfirmar={confirmarAnulacion}
        onCancelar={() => {
          if (!procesando) setGastoAAnular(null);
        }}
      />
    </>
  );
}

export default PaginaGastos;
