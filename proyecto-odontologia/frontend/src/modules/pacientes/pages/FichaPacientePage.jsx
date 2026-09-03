import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import {
  obtenerPaciente,
  actualizarPaciente,
  desactivarPaciente,
  reactivarPaciente,
} from "../services/pacientesService";
import FormularioPaciente from "../components/FormularioPaciente";
import ConfirmacionAccionModal from "../../roles/components/ConfirmacionAccionModal";
import {
  obtenerTratamientos,
  obtenerOpcionesTratamiento,
  crearTratamiento,
} from "../../tratamientos/services/tratamientosService";
import FormularioTratamiento from "../../tratamientos/components/FormularioTratamiento";
import "../../roles/styles/roles.css";
import "../../tratamientos/styles/tratamientos.css";
import "../styles/pacientes.css";

const MODAL_CONFIRM_CERRADO = { abierto: false, tipo: null };

function formatearFecha(valor, conHora = false) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  const opciones = conHora
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" };
  return fecha.toLocaleString("es-AR", opciones);
}

function FichaPacientePage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { tienePermiso } = useAuth();

  const puedeEditar = tienePermiso("editar_pacientes");
  const puedeDesactivar = tienePermiso("desactivar_pacientes");
  const puedeReactivar = tienePermiso("reactivar_pacientes");
  const puedeVerTratamientos = tienePermiso("ver_tratamientos");
  const puedeCrearTratamientos = tienePermiso("crear_tratamientos");

  const [paciente, setPaciente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [advertencia, setAdvertencia] = useState("");

  const [editando, setEditando] = useState(false);
  const [erroresForm, setErroresForm] = useState([]);
  const [modalConfirm, setModalConfirm] = useState(MODAL_CONFIRM_CERRADO);

  // ── Tratamientos del paciente (integración ABM 03) ──────────────────────────
  const [tratamientos, setTratamientos] = useState([]);
  const [cargandoTratamientos, setCargandoTratamientos] = useState(false);
  const [errorTratamientos, setErrorTratamientos] = useState("");
  const [opcionesTratamiento, setOpcionesTratamiento] = useState({
    tipos: [],
    estados: [],
    pacientes: [],
  });
  const [modalNuevoTratamiento, setModalNuevoTratamiento] = useState(false);
  const [procesandoTratamiento, setProcesandoTratamiento] = useState(false);
  const [erroresTratamiento, setErroresTratamiento] = useState([]);
  const [mensajeTratamiento, setMensajeTratamiento] = useState("");

  const cargarTratamientos = useCallback(async () => {
    if (!puedeVerTratamientos) return;
    try {
      setCargandoTratamientos(true);
      setErrorTratamientos("");
      const datos = await obtenerTratamientos({
        idPaciente: id,
        orden: "fecha_desc",
        porPagina: 100,
      });
      setTratamientos(
        Array.isArray(datos.tratamientos) ? datos.tratamientos : []
      );
    } catch (error) {
      setErrorTratamientos(
        error.response?.data?.mensaje ||
          "No se pudieron cargar los tratamientos del paciente."
      );
      setTratamientos([]);
    } finally {
      setCargandoTratamientos(false);
    }
  }, [id, puedeVerTratamientos]);

  useEffect(() => {
    cargarTratamientos();
  }, [cargarTratamientos]);

  useEffect(() => {
    if (!puedeCrearTratamientos) return;
    obtenerOpcionesTratamiento()
      .then((datos) =>
        setOpcionesTratamiento({
          tipos: datos.tipos || [],
          estados: datos.estados || [],
          pacientes: datos.pacientes || [],
        })
      )
      .catch(() => {});
  }, [puedeCrearTratamientos]);

  async function guardarNuevoTratamiento(datos) {
    try {
      setProcesandoTratamiento(true);
      setErroresTratamiento([]);
      setMensajeTratamiento("");
      const respuesta = await crearTratamiento(datos);
      setModalNuevoTratamiento(false);
      setMensajeTratamiento(
        `Tratamiento creado (ID ${respuesta.tratamiento.id_tratamiento}) en estado «${respuesta.tratamiento.estado_nombre}».`
      );
      await cargarTratamientos();
    } catch (error) {
      const datosError = error.response?.data;
      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresTratamiento(datosError.errores);
      } else {
        setErroresTratamiento([
          datosError?.mensaje || "No se pudo guardar el tratamiento.",
        ]);
      }
    } finally {
      setProcesandoTratamiento(false);
    }
  }

  const cargarPaciente = useCallback(async () => {
    try {
      setCargando(true);
      setMensajeError("");

      const datos = await obtenerPaciente(id);
      setPaciente(datos.paciente);
    } catch (error) {
      const codigoEstado = error.response?.status;
      const mensajeBackend = error.response?.data?.mensaje;

      if (codigoEstado === 403) {
        setMensajeError("No tenés permisos suficientes para ver esta ficha.");
      } else if (codigoEstado === 404) {
        setMensajeError("El paciente no existe o no pertenece a tu consultorio.");
      } else {
        setMensajeError(mensajeBackend || "No se pudo cargar la ficha.");
      }

      setPaciente(null);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargarPaciente();
  }, [cargarPaciente]);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
    setAdvertencia("");
  }

  // ── Edición ─────────────────────────────────────────────────────────────────

  function abrirEdicion() {
    limpiarMensajes();
    setErroresForm([]);
    setEditando(true);
  }

  function cerrarEdicion() {
    if (procesando) return;
    setEditando(false);
    setErroresForm([]);
  }

  async function guardarEdicion(datos) {
    try {
      setProcesando(true);
      setErroresForm([]);
      limpiarMensajes();

      const respuesta = await actualizarPaciente(id, datos);
      setPaciente(respuesta.paciente);
      setEditando(false);
      setMensajeExito("La ficha se actualizó correctamente.");
    } catch (error) {
      const datosError = error.response?.data;

      if (Array.isArray(datosError?.errores) && datosError.errores.length > 0) {
        setErroresForm(datosError.errores);
      } else {
        setErroresForm([
          datosError?.mensaje || "No se pudo actualizar la ficha.",
        ]);
      }
    } finally {
      setProcesando(false);
    }
  }

  // ── Baja / reactivación ─────────────────────────────────────────────────────

  function abrirModalDesactivar() {
    limpiarMensajes();
    setModalConfirm({ abierto: true, tipo: "desactivar" });
  }

  function abrirModalReactivar() {
    limpiarMensajes();
    setModalConfirm({ abierto: true, tipo: "reactivar" });
  }

  function cerrarModalConfirm() {
    if (procesando) return;
    setModalConfirm(MODAL_CONFIRM_CERRADO);
  }

  async function confirmarAccion() {
    const { tipo } = modalConfirm;
    if (!tipo) return;

    try {
      setProcesando(true);
      limpiarMensajes();

      if (tipo === "desactivar") {
        const respuesta = await desactivarPaciente(id);
        setPaciente(respuesta.paciente);
        setMensajeExito("La ficha se desactivó correctamente.");
        if (respuesta.advertencia) setAdvertencia(respuesta.advertencia);
      } else {
        const respuesta = await reactivarPaciente(id);
        setPaciente(respuesta.paciente);
        setMensajeExito("La ficha se reactivó correctamente.");
      }

      setModalConfirm(MODAL_CONFIRM_CERRADO);
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;
      setMensajeError(mensajeBackend || "No se pudo completar la acción.");
      setModalConfirm(MODAL_CONFIRM_CERRADO);
    } finally {
      setProcesando(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <main className="roles-page pacientes-ficha">
        <p className="roles-page__estado">Cargando ficha...</p>
      </main>
    );
  }

  if (!paciente) {
    return (
      <main className="roles-page pacientes-ficha">
        <div className="roles-page__mensaje roles-page__mensaje--error">
          {mensajeError || "No se pudo cargar la ficha."}
        </div>
        <button
          type="button"
          className="roles-page__boton-secundario"
          onClick={() => navegar("/panel/pacientes")}
        >
          Volver al listado
        </button>
      </main>
    );
  }

  const activo = Number(paciente.activo) === 1;
  const esModalDesactivar = modalConfirm.tipo === "desactivar";

  return (
    <>
      <main className="roles-page pacientes-ficha">
        <section className="roles-page__encabezado">
          <div>
            <p className="roles-page__etiqueta">Ficha del paciente</p>
            <h1>
              {paciente.nombre} {paciente.apellido}
            </h1>
            <p className="roles-page__descripcion">
              DNI {paciente.dni} · ID {paciente.id_paciente} ·{" "}
              <span
                className={
                  activo
                    ? "roles-page__badge roles-page__badge--activo"
                    : "roles-page__badge roles-page__badge--inactivo"
                }
              >
                {activo ? "Activo" : "Inactivo"}
              </span>
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              type="button"
              className="roles-page__boton-secundario"
              onClick={() => navegar("/panel/pacientes")}
            >
              Volver
            </button>

            {!editando && puedeEditar && (
              <button
                type="button"
                className="roles-page__boton-principal"
                onClick={abrirEdicion}
              >
                Editar
              </button>
            )}

            {activo && puedeDesactivar && (
              <button
                type="button"
                className="roles-page__boton-peligro"
                onClick={abrirModalDesactivar}
              >
                Desactivar
              </button>
            )}

            {!activo && puedeReactivar && (
              <button
                type="button"
                className="roles-page__boton-exito"
                onClick={abrirModalReactivar}
              >
                Reactivar
              </button>
            )}
          </div>
        </section>

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

        {advertencia && (
          <div className="roles-page__mensaje roles-page__mensaje--advertencia">
            {advertencia}
          </div>
        )}

        <section className="roles-page__panel">
          <h2 className="pacientes-ficha__subtitulo">Datos personales</h2>

          <dl className="pacientes-ficha__datos">
            <div>
              <dt>Nombre</dt>
              <dd>{paciente.nombre}</dd>
            </div>
            <div>
              <dt>Apellido</dt>
              <dd>{paciente.apellido}</dd>
            </div>
            <div>
              <dt>DNI</dt>
              <dd>{paciente.dni}</dd>
            </div>
            <div>
              <dt>Fecha de nacimiento</dt>
              <dd>{formatearFecha(paciente.fecha_nacimiento)}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{paciente.telefono || "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{paciente.email || "—"}</dd>
            </div>
            <div>
              <dt>Obra social</dt>
              <dd>{paciente.obra_social || "—"}</dd>
            </div>
            <div>
              <dt>Alta de la ficha</dt>
              <dd>{formatearFecha(paciente.fecha_alta, true)}</dd>
            </div>
          </dl>

          <div className="pacientes-ficha__bloque">
            <dt>Observaciones</dt>
            <dd>{paciente.observaciones || "Sin observaciones."}</dd>
          </div>
        </section>

        <section className="roles-page__panel pacientes-ficha__tratamientos">
          <div className="roles-page__titulo-seccion-permisos">
            <h2 className="pacientes-ficha__subtitulo">
              Tratamientos del paciente
            </h2>

            {puedeCrearTratamientos && (
              <button
                type="button"
                className="roles-page__boton-principal"
                onClick={() => {
                  setErroresTratamiento([]);
                  setMensajeTratamiento("");
                  setModalNuevoTratamiento(true);
                }}
              >
                Nuevo tratamiento
              </button>
            )}
          </div>

          {mensajeTratamiento && (
            <div className="roles-page__mensaje roles-page__mensaje--exito">
              {mensajeTratamiento}
            </div>
          )}
          {errorTratamientos && (
            <div className="roles-page__mensaje roles-page__mensaje--error">
              {errorTratamientos}
            </div>
          )}

          {!puedeVerTratamientos ? (
            <p className="roles-page__estado">
              No tenés permiso para ver los tratamientos de este paciente.
            </p>
          ) : cargandoTratamientos ? (
            <p className="roles-page__estado">Cargando tratamientos...</p>
          ) : tratamientos.length === 0 ? (
            <p className="roles-page__estado">
              Este paciente todavía no tiene tratamientos registrados.
            </p>
          ) : (
            <div className="roles-page__tabla-contenedor">
              <table className="roles-page__tabla">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Inicio</th>
                    <th>Precio</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tratamientos.map((tratamiento) => (
                    <tr
                      key={tratamiento.id_tratamiento}
                      className="pacientes-page__fila"
                      onClick={() =>
                        navegar(`/panel/tratamientos/${tratamiento.id_tratamiento}`)
                      }
                    >
                      <td>
                        <strong>{tratamiento.tipo_nombre}</strong>
                      </td>
                      <td>{formatearFecha(tratamiento.fecha_inicio)}</td>
                      <td>
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          minimumFractionDigits: 2,
                        }).format(Number(tratamiento.precio_paciente) || 0)}
                      </td>
                      <td>
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          minimumFractionDigits: 2,
                        }).format(Number(tratamiento.saldo) || 0)}
                      </td>
                      <td>
                        <span
                          className={`roles-page__badge tratamientos-badge--estado-${tratamiento.id_estado}`}
                        >
                          {tratamiento.estado_nombre}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {editando && (
        <FormularioPaciente
          modo="editar"
          paciente={paciente}
          cargando={procesando}
          erroresBackend={erroresForm}
          onGuardar={guardarEdicion}
          onCancelar={cerrarEdicion}
        />
      )}

      {modalNuevoTratamiento && (
        <FormularioTratamiento
          modo="crear"
          opciones={opcionesTratamiento}
          pacienteFijo={paciente.id_paciente}
          tratamiento={{
            id_paciente: paciente.id_paciente,
            paciente_nombre: paciente.nombre,
            paciente_apellido: paciente.apellido,
          }}
          cargando={procesandoTratamiento}
          erroresBackend={erroresTratamiento}
          onGuardar={guardarNuevoTratamiento}
          onCancelar={() => {
            if (!procesandoTratamiento) setModalNuevoTratamiento(false);
          }}
        />
      )}

      <ConfirmacionAccionModal
        abierto={modalConfirm.abierto}
        tipo={esModalDesactivar ? "peligro" : "exito"}
        titulo={
          esModalDesactivar
            ? "Confirmar baja lógica"
            : "Confirmar reactivación"
        }
        descripcion={
          esModalDesactivar
            ? `Estás por desactivar la ficha de ${paciente.nombre} ${paciente.apellido}. No se elimina de la base y su historial se conserva, pero deja de aparecer entre los pacientes activos.`
            : `Estás por reactivar la ficha de ${paciente.nombre} ${paciente.apellido}. Volverá a aparecer entre los pacientes activos.`
        }
        textoConfirmar={esModalDesactivar ? "Desactivar" : "Reactivar"}
        textoCancelar="Cancelar"
        cargando={procesando}
        onCancelar={cerrarModalConfirm}
        onConfirmar={confirmarAccion}
      />
    </>
  );
}

export default FichaPacientePage;
