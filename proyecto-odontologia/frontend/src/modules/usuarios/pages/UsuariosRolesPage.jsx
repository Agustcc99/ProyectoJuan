import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  obtenerUsuarios,
  actualizarRolUsuario,
} from "../services/usuariosService";
import { obtenerRoles } from "../../roles/services/rolesService";
import ConfirmacionAccionModal from "../../roles/components/ConfirmacionAccionModal";
import "../../roles/styles/roles.css";

function UsuariosRolesPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesSeleccionados, setRolesSeleccionados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardandoUsuario, setGuardandoUsuario] = useState(null);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [modalConfirmacion, setModalConfirmacion] = useState({
    abierto: false,
    usuario: null,
    idRolNuevo: null,
    rolNuevo: null,
  });

  const navegar = useNavigate();

  async function cargarDatosIniciales() {
    try {
      setCargando(true);
      setMensajeError("");

      const respuestaUsuarios = await obtenerUsuarios();
      const respuestaRoles = await obtenerRoles();

      const listaUsuarios =
        respuestaUsuarios.usuarios ||
        respuestaUsuarios.data ||
        respuestaUsuarios ||
        [];

      const listaRoles =
        respuestaRoles.roles || respuestaRoles.data || respuestaRoles || [];

      setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
      setRoles(Array.isArray(listaRoles) ? listaRoles : []);
      setRolesSeleccionados({});
    } catch (error) {
      const codigoEstado = error.response?.status;
      const mensajeBackend = error.response?.data?.mensaje;

      if (codigoEstado === 403) {
        setMensajeError(
          "No tenés permisos suficientes para visualizar usuarios."
        );
      } else {
        setMensajeError(
          mensajeBackend ||
            "No se pudieron cargar los usuarios del consultorio."
        );
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
  }

  function manejarCambioRol(idUsuario, idRolSeleccionado) {
    setRolesSeleccionados((estadoAnterior) => ({
      ...estadoAnterior,
      [idUsuario]: idRolSeleccionado,
    }));
  }

  function abrirModalCambioRol(usuario) {
    limpiarMensajes();

    const nuevoIdRol =
      rolesSeleccionados[usuario.id_usuario] || usuario.id_rol;

    if (Number(nuevoIdRol) === Number(usuario.id_rol)) {
      setMensajeError("Seleccioná un rol diferente antes de guardar.");
      return;
    }

    const rolNuevo = roles.find((rol) => {
      return Number(rol.id_rol) === Number(nuevoIdRol);
    });

    if (!rolNuevo) {
      setMensajeError("El rol seleccionado no es válido.");
      return;
    }

    setModalConfirmacion({
      abierto: true,
      usuario,
      idRolNuevo: nuevoIdRol,
      rolNuevo,
    });
  }

  function cerrarModalConfirmacion() {
    if (guardandoUsuario) return;

    setModalConfirmacion({
      abierto: false,
      usuario: null,
      idRolNuevo: null,
      rolNuevo: null,
    });
  }

  async function confirmarCambioRol() {
    const { usuario, idRolNuevo } = modalConfirmacion;

    if (!usuario || !idRolNuevo) return;

    try {
      setGuardandoUsuario(usuario.id_usuario);
      limpiarMensajes();

      await actualizarRolUsuario(usuario.id_usuario, Number(idRolNuevo));

      setMensajeExito("Rol del usuario actualizado correctamente.");

      setModalConfirmacion({
        abierto: false,
        usuario: null,
        idRolNuevo: null,
        rolNuevo: null,
      });

      await cargarDatosIniciales();
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(
        mensajeBackend || "No se pudo actualizar el rol del usuario."
      );
    } finally {
      setGuardandoUsuario(null);
    }
  }

  const rolesActivos = roles.filter((rol) => {
    return Number(rol.activo) === 1 || rol.activo === true;
  });

  const usuarioDelModal = modalConfirmacion.usuario;
  const rolNuevoDelModal = modalConfirmacion.rolNuevo;

  return (
    <>
      <main className="roles-page">
        <section className="roles-page__encabezado">
          <div>
            <p className="roles-page__etiqueta"></p>
            <h1>Administración de usuarios</h1>
            <p className="roles-page__descripcion">
              Visualizá los usuarios del consultorio y modificá el rol asignado
              a cada uno.
            </p>
          </div>

          <div className="roles-page__botones-encabezado">
            <button
              className="roles-page__boton-secundario"
              type="button"
              onClick={() => navegar("/panel/administrador")}
            >
              Volver a roles
            </button>
          </div>
        </section>

        <section className="roles-page__panel">
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
            <p className="roles-page__estado">Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p className="roles-page__estado">
              No se encontraron usuarios registrados.
            </p>
          ) : (
            <div className="roles-page__tabla-contenedor">
              <table className="roles-page__tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol actual</th>
                    <th>Estado</th>
                    <th>Nuevo rol</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {usuarios.map((usuario) => {
                    const usuarioActivo =
                      Number(usuario.activo) === 1 || usuario.activo === true;

                    const rolSeleccionado =
                      rolesSeleccionados[usuario.id_usuario] || usuario.id_rol;

                    const guardandoEsteUsuario =
                      guardandoUsuario === usuario.id_usuario;

                    const rolSinCambios =
                      Number(rolSeleccionado) === Number(usuario.id_rol);

                    return (
                      <tr key={usuario.id_usuario}>
                        <td>
                          <strong>
                            {usuario.nombre} {usuario.apellido}
                          </strong>
                        </td>

                        <td>{usuario.email}</td>

                        <td>{usuario.nombre_rol || "Sin rol"}</td>

                        <td>
                          <span
                            className={
                              usuarioActivo
                                ? "roles-page__badge roles-page__badge--activo"
                                : "roles-page__badge roles-page__badge--inactivo"
                            }
                          >
                            {usuarioActivo ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        <td>
                          <select
                            className="roles-page__select-tabla"
                            value={rolSeleccionado || ""}
                            disabled={!usuarioActivo || guardandoEsteUsuario}
                            onChange={(evento) =>
                              manejarCambioRol(
                                usuario.id_usuario,
                                evento.target.value
                              )
                            }
                          >
                            <option value="">Seleccionar rol</option>

                            {rolesActivos.map((rol) => (
                              <option key={rol.id_rol} value={rol.id_rol}>
                                {rol.nombre_rol}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <div className="roles-page__acciones">
                            <button
                              type="button"
                              disabled={
                                !usuarioActivo ||
                                guardandoEsteUsuario ||
                                rolSinCambios
                              }
                              onClick={() => abrirModalCambioRol(usuario)}
                            >
                              {guardandoEsteUsuario
                                ? "Guardando..."
                                : "Guardar rol"}
                            </button>
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
        tipo="exito"
        titulo="Confirmar cambio de rol"
        descripcion={`Estás por cambiar el rol de "${
          usuarioDelModal
            ? `${usuarioDelModal.nombre} ${usuarioDelModal.apellido}`
            : "este usuario"
        }" al rol "${
          rolNuevoDelModal?.nombre_rol || "seleccionado"
        }". Este cambio modificará las funcionalidades que podrá ver y utilizar dentro del sistema.`}
        textoConfirmar="Cambiar rol"
        textoCancelar="Cancelar"
        cargando={Boolean(guardandoUsuario)}
        onCancelar={cerrarModalConfirmacion}
        onConfirmar={confirmarCambioRol}
      />
    </>
  );
}

export default UsuariosRolesPage;