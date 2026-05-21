import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  obtenerRoles,
  desactivarRol,
  reactivarRol,
} from "../services/rolesService";
import ConfirmacionAccionModal from "../components/ConfirmacionAccionModal";
import "../styles/roles.css";

function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const [modalConfirmacion, setModalConfirmacion] = useState({
    abierto: false,
    tipoAccion: null,
    rol: null,
  });

  const navegar = useNavigate();

  async function cargarRoles() {
    try {
      setCargando(true);
      setMensajeError("");

      const datos = await obtenerRoles();
      const listaRoles = datos.roles || datos.data || datos || [];

      setRoles(Array.isArray(listaRoles) ? listaRoles : []);
    } catch (error) {
      const codigoEstado = error.response?.status;
      const mensajeBackend = error.response?.data?.mensaje;

      if (codigoEstado === 403) {
        setMensajeError(
          "No tenés permisos suficientes para acceder a la administración de roles."
        );
      } else {
        setMensajeError(
          mensajeBackend || "No se pudieron cargar los roles del consultorio."
        );
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarRoles();
  }, []);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
  }

  function abrirModalDesactivarRol(rol) {
    limpiarMensajes();

    setModalConfirmacion({
      abierto: true,
      tipoAccion: "desactivar",
      rol,
    });
  }

  function abrirModalReactivarRol(rol) {
    limpiarMensajes();

    setModalConfirmacion({
      abierto: true,
      tipoAccion: "reactivar",
      rol,
    });
  }

  function cerrarModalConfirmacion() {
    if (procesandoAccion) return;

    setModalConfirmacion({
      abierto: false,
      tipoAccion: null,
      rol: null,
    });
  }

  async function confirmarAccionRol() {
    const { tipoAccion, rol } = modalConfirmacion;

    if (!tipoAccion || !rol) return;

    try {
      setProcesandoAccion(true);
      limpiarMensajes();

      if (tipoAccion === "desactivar") {
        await desactivarRol(rol.id_rol);
        setMensajeExito("Rol desactivado correctamente.");
      }

      if (tipoAccion === "reactivar") {
        await reactivarRol(rol.id_rol);
        setMensajeExito("Rol reactivado correctamente.");
      }

      setModalConfirmacion({
        abierto: false,
        tipoAccion: null,
        rol: null,
      });

      await cargarRoles();
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(
        mensajeBackend || "No se pudo completar la acción sobre el rol."
      );
    } finally {
      setProcesandoAccion(false);
    }
  }

  const rolesFiltrados = roles.filter((rol) => {
    const nombreRol = rol.nombre_rol?.toLowerCase() || "";
    const descripcionRol = rol.descripcion?.toLowerCase() || "";
    const textoBusqueda = busqueda.toLowerCase();

    const coincideBusqueda =
      nombreRol.includes(textoBusqueda) ||
      descripcionRol.includes(textoBusqueda);

    const rolActivo = Number(rol.activo) === 1 || rol.activo === true;

    if (filtroEstado === "activos") {
      return coincideBusqueda && rolActivo;
    }

    if (filtroEstado === "inactivos") {
      return coincideBusqueda && !rolActivo;
    }

    return coincideBusqueda;
  });

  const rolDelModal = modalConfirmacion.rol;
  const esModalDesactivar = modalConfirmacion.tipoAccion === "desactivar";

  return (
    <>
      <main className="roles-page">
        <section className="roles-page__encabezado">
          <div>
            <p className="roles-page__etiqueta"></p>
            <h1>Administración de roles y permisos</h1>
            <p className="roles-page__descripcion">
              Gestioná los roles del consultorio, su estado y los permisos
              asociados a cada perfil de usuario.
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              className="roles-page__boton-secundario"
              type="button"
              onClick={() => navegar("/panel/administrador/usuarios")}
            >
              Ver usuarios
            </button>

            <button
              className="roles-page__boton-principal"
              type="button"
              onClick={() => navegar("/panel/administrador/nuevo")}
            >
              Nuevo rol
            </button>
          </div>
        </section>

        <section className="roles-page__panel">
          <div className="roles-page__filtros">
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />

            <select
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

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
            <p className="roles-page__estado">Cargando roles...</p>
          ) : rolesFiltrados.length === 0 ? (
            <p className="roles-page__estado">
              No se encontraron roles con los filtros seleccionados.
            </p>
          ) : (
            <div className="roles-page__tabla-contenedor">
              <table className="roles-page__tabla">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {rolesFiltrados.map((rol) => {
                    const rolActivo =
                      Number(rol.activo) === 1 || rol.activo === true;

                    return (
                      <tr key={rol.id_rol}>
                        <td>
                          <strong>{rol.nombre_rol}</strong>
                        </td>

                        <td>{rol.descripcion || "Sin descripción"}</td>

                        <td>
                          <span
                            className={
                              rolActivo
                                ? "roles-page__badge roles-page__badge--activo"
                                : "roles-page__badge roles-page__badge--inactivo"
                            }
                          >
                            {rolActivo ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td>
                          <div className="roles-page__acciones">
                            <button
                              type="button"
                              onClick={() =>
                                navegar(
                                  `/panel/administrador/roles/${rol.id_rol}/detalle`
                                )
                              }
                            >
                              Detalle
                            </button>

                            {rolActivo ? (
                              <button
                                type="button"
                                className="roles-page__accion-peligro"
                                onClick={() => abrirModalDesactivarRol(rol)}
                              >
                                Desactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="roles-page__accion-exito"
                                onClick={() => abrirModalReactivarRol(rol)}
                              >
                                Reactivar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <ConfirmacionAccionModal
        abierto={modalConfirmacion.abierto}
        tipo={esModalDesactivar ? "peligro" : "exito"}
        titulo={esModalDesactivar ? "Confirmar baja lógica" : "Confirmar reactivación"}
        descripcion={
          esModalDesactivar
            ? `Estás por desactivar el rol "${rolDelModal?.nombre_rol}". No se eliminará de la base de datos, pero dejará de estar disponible para nuevas asignaciones.`
            : `Estás por reactivar el rol "${rolDelModal?.nombre_rol}". El rol volverá a estar disponible para asignarlo a usuarios.`
        }
        textoConfirmar={esModalDesactivar ? "Desactivar rol" : "Reactivar rol"}
        textoCancelar="Cancelar"
        cargando={procesandoAccion}
        onCancelar={cerrarModalConfirmacion}
        onConfirmar={confirmarAccionRol}
      />
    </>
  );
}

export default RolesPage;