import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerPacientes,
  crearPaciente,
} from "../services/pacientesService";
import FormularioPaciente from "../components/FormularioPaciente";
import "../../roles/styles/roles.css";
import "../styles/pacientes.css";

const MODAL_FORM_CERRADO = { abierto: false };

function PaginaPacientes() {
  const { tienePermiso } = useAuth();
  const puedeCrear = tienePermiso("crear_pacientes");

  const navegar = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina] = useState(20);

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // `busqueda` es lo que se tipea; `busquedaAplicada` es lo que se manda al backend.
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [modalForm, setModalForm] = useState(MODAL_FORM_CERRADO);
  const [erroresForm, setErroresForm] = useState([]);

  const cargarPacientes = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");

      const datos = await obtenerPacientes({
        busqueda: busquedaAplicada,
        estado: filtroEstado,
        pagina,
        porPagina,
      });

      setPacientes(Array.isArray(datos.pacientes) ? datos.pacientes : []);
      setTotal(Number(datos.total) || 0);
    } catch (error) {
      const codigoEstado = error.response?.status;
      const mensajeBackend = error.response?.data?.mensaje;

      if (codigoEstado === 403) {
        setMensajeError(
          "No tenés permisos suficientes para consultar los pacientes."
        );
      } else {
        setMensajeError(
          mensajeBackend || "No se pudo cargar el listado de pacientes."
        );
      }

      setPacientes([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  }, [busquedaAplicada, filtroEstado, pagina, porPagina]);

  useEffect(() => {
    cargarPacientes();
  }, [cargarPacientes]);

  function aplicarBusqueda(evento) {
    evento.preventDefault();
    setPagina(1);
    setBusquedaAplicada(busqueda.trim());
  }

  function cambiarFiltroEstado(valor) {
    setPagina(1);
    setFiltroEstado(valor);
  }

  // ── Alta ────────────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    setMensajeError("");
    setMensajeExito("");
    setErroresForm([]);
    setModalForm({ abierto: true });
  }

  function cerrarModalForm() {
    if (procesando) return;
    setModalForm(MODAL_FORM_CERRADO);
    setErroresForm([]);
  }

  async function guardarPaciente(datos) {
    try {
      setProcesando(true);
      setErroresForm([]);
      setMensajeError("");
      setMensajeExito("");

      const respuesta = await crearPaciente(datos);

      setModalForm(MODAL_FORM_CERRADO);
      setMensajeExito(
        `Se creó la ficha de ${datos.nombre} ${datos.apellido} (ID ${respuesta.paciente.id_paciente}).`
      );

      setPagina(1);
      setBusquedaAplicada("");
      setBusqueda("");
      setFiltroEstado("todos");
      await cargarPacientes();
    } catch (error) {
      const datosError = error.response?.data;

      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresForm(datosError.errores);
      } else {
        setErroresForm([
          datosError?.mensaje || "No se pudo guardar la ficha del paciente.",
        ]);
      }
    } finally {
      setProcesando(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <>
      <main className="roles-page pacientes-page">
        <section className="roles-page__encabezado">
          <div>
            <h1>Pacientes</h1>
            <p className="roles-page__descripcion">
              Gestioná las fichas y la información de los pacientes del
              consultorio.
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              className="roles-page__boton-principal"
              type="button"
              disabled={!puedeCrear}
              onClick={abrirModalNuevo}
            >
              Nuevo paciente
            </button>
          </div>
        </section>

        <section className="roles-page__panel">
          <form className="roles-page__filtros" onSubmit={aplicarBusqueda}>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />

            <select
              value={filtroEstado}
              onChange={(evento) => cambiarFiltroEstado(evento.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>

            <button
              type="submit"
              className="roles-page__boton-secundario"
            >
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
            <p className="roles-page__estado">Cargando pacientes...</p>
          ) : pacientes.length === 0 ? (
            <p className="roles-page__estado">
              No se encontraron pacientes con los filtros seleccionados.
            </p>
          ) : (
            <>
              <div className="roles-page__tabla-contenedor">
                <table className="roles-page__tabla">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>DNI</th>
                      <th>Teléfono</th>
                      <th>Obra social</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pacientes.map((paciente) => {
                      const activo = Number(paciente.activo) === 1;

                      return (
                        <tr
                          key={paciente.id_paciente}
                          className="pacientes-page__fila"
                          onClick={() =>
                            navegar(`/panel/pacientes/${paciente.id_paciente}`)
                          }
                        >
                          <td>
                            <strong>{paciente.nombre}</strong>
                          </td>
                          <td>{paciente.apellido}</td>
                          <td>{paciente.dni}</td>
                          <td>{paciente.telefono || "—"}</td>
                          <td>{paciente.obra_social || "—"}</td>
                          <td>
                            <span
                              className={
                                activo
                                  ? "roles-page__badge roles-page__badge--activo"
                                  : "roles-page__badge roles-page__badge--inactivo"
                              }
                            >
                              {activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pacientes-page__paginacion">
                <span>
                  {total} paciente{total === 1 ? "" : "s"} · página {pagina} de{" "}
                  {totalPaginas}
                </span>

                <div className="pacientes-page__paginacion-botones">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() => setPagina((previa) => Math.max(1, previa - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    onClick={() =>
                      setPagina((previa) => Math.min(totalPaginas, previa + 1))
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

      {modalForm.abierto && (
        <FormularioPaciente
          modo="crear"
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarPaciente}
          onCancelar={cerrarModalForm}
        />
      )}
    </>
  );
}

export default PaginaPacientes;
