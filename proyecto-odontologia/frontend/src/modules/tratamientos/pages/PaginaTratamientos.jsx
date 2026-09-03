import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerTratamientos,
  obtenerOpcionesTratamiento,
  crearTratamiento,
} from "../services/tratamientosService";
import FormularioTratamiento from "../components/FormularioTratamiento";
import "../../roles/styles/roles.css";
import "../../pacientes/styles/pacientes.css";
import "../styles/tratamientos.css";

const ORDENES = [
  { valor: "fecha_desc", etiqueta: "Fecha de inicio ↓" },
  { valor: "fecha_asc", etiqueta: "Fecha de inicio ↑" },
  { valor: "actualizacion_desc", etiqueta: "Última actualización" },
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

function PaginaTratamientos() {
  const { tienePermiso } = useAuth();
  const puedeCrear = tienePermiso("crear_tratamientos");

  const navegar = useNavigate();

  const [tratamientos, setTratamientos] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);

  const [opciones, setOpciones] = useState({ tipos: [], estados: [], pacientes: [] });

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState("fecha_desc");

  const [modalForm, setModalForm] = useState(false);
  const [erroresForm, setErroresForm] = useState([]);

  useEffect(() => {
    obtenerOpcionesTratamiento()
      .then((datos) =>
        setOpciones({
          tipos: datos.tipos || [],
          estados: datos.estados || [],
          pacientes: datos.pacientes || [],
        })
      )
      .catch(() => {
        /* si falla, los selectores quedan vacíos; el listado igual funciona */
      });
  }, []);

  const cargarTratamientos = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");

      const datos = await obtenerTratamientos({
        busqueda: busquedaAplicada,
        idEstado: filtroEstado || undefined,
        idTipo: filtroTipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        orden,
        pagina,
        porPagina,
      });

      setTratamientos(Array.isArray(datos.tratamientos) ? datos.tratamientos : []);
      setTotal(Number(datos.total) || 0);
    } catch (error) {
      const codigo = error.response?.status;
      const mensaje = error.response?.data?.mensaje;
      setMensajeError(
        codigo === 403
          ? "No tenés permisos suficientes para consultar los tratamientos."
          : mensaje || "No se pudo cargar el listado de tratamientos."
      );
      setTratamientos([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [busquedaAplicada, filtroEstado, filtroTipo, desde, hasta, orden, pagina, porPagina]);

  useEffect(() => {
    cargarTratamientos();
  }, [cargarTratamientos]);

  function aplicarBusqueda(evento) {
    evento.preventDefault();
    setPagina(1);
    setBusquedaAplicada(busqueda.trim());
  }

  function cambiarFiltro(setter, valor) {
    setPagina(1);
    setter(valor);
  }

  async function guardarTratamiento(datos) {
    try {
      setProcesando(true);
      setErroresForm([]);
      setMensajeError("");
      setMensajeExito("");

      const respuesta = await crearTratamiento(datos);

      setModalForm(false);
      setMensajeExito(
        `Tratamiento creado (ID ${respuesta.tratamiento.id_tratamiento}) en estado «${respuesta.tratamiento.estado_nombre}».`
      );
      setPagina(1);
      setOrden("fecha_desc");
      await cargarTratamientos();
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresForm(datosError.errores);
      } else {
        setErroresForm([datosError?.mensaje || "No se pudo guardar el tratamiento."]);
      }
    } finally {
      setProcesando(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <>
      <main className="roles-page tratamientos-page">
        <section className="roles-page__encabezado">
          <div>
            <h1>Tratamientos</h1>
            <p className="roles-page__descripcion">
              Registrá y seguí los tratamientos del consultorio: su precio, su
              estado y el saldo pendiente de cada uno.
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              className="roles-page__boton-principal"
              type="button"
              disabled={!puedeCrear}
              onClick={() => {
                setErroresForm([]);
                setMensajeError("");
                setMensajeExito("");
                setModalForm(true);
              }}
            >
              Nuevo tratamiento
            </button>
          </div>
        </section>

        <section className="roles-page__panel">
          <form className="roles-page__filtros tratamientos-page__filtros" onSubmit={aplicarBusqueda}>
            <input
              type="text"
              placeholder="Buscar por paciente o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <select
              value={filtroEstado}
              onChange={(e) => cambiarFiltro(setFiltroEstado, e.target.value)}
            >
              <option value="">Todos los estados</option>
              {opciones.estados.map((estado) => (
                <option key={estado.id} value={estado.id}>
                  {estado.nombre}
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

            <select value={orden} onChange={(e) => cambiarFiltro(setOrden, e.target.value)}>
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>

            <button type="submit" className="roles-page__boton-secundario">
              Buscar
            </button>
          </form>

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
            <p className="roles-page__estado">Cargando tratamientos...</p>
          ) : tratamientos.length === 0 ? (
            <p className="roles-page__estado">Sin resultados</p>
          ) : (
            <>
              <div className="roles-page__tabla-contenedor">
                <table className="roles-page__tabla">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Tipo</th>
                      <th>Inicio</th>
                      <th>Precio</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tratamientos.map((t) => (
                      <tr
                        key={t.id_tratamiento}
                        className="pacientes-page__fila"
                        onClick={() =>
                          navegar(`/panel/tratamientos/${t.id_tratamiento}`)
                        }
                      >
                        <td>
                          <strong>
                            {t.paciente_apellido}, {t.paciente_nombre}
                          </strong>
                        </td>
                        <td>{t.tipo_nombre}</td>
                        <td>{formatearFecha(t.fecha_inicio)}</td>
                        <td>{formatearMoneda(t.precio_paciente)}</td>
                        <td>{formatearMoneda(t.saldo)}</td>
                        <td>
                          <span
                            className={`roles-page__badge tratamientos-badge--estado-${t.id_estado}`}
                          >
                            {t.estado_nombre}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pacientes-page__paginacion">
                <span>
                  {total} tratamiento{total === 1 ? "" : "s"} · página {pagina} de{" "}
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

      {modalForm && (
        <FormularioTratamiento
          modo="crear"
          opciones={opciones}
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarTratamiento}
          onCancelar={() => {
            if (!procesando) setModalForm(false);
          }}
        />
      )}
    </>
  );
}

export default PaginaTratamientos;
