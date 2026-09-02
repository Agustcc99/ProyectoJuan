import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  obtenerUsuarios,
  actualizarRolUsuario,
  aprobarUsuario, // FIX HT7 (AUD-09)
} from "../services/usuariosService";
import { obtenerRoles } from "../../roles/services/rolesService";
import ConfirmacionAccionModal from "../../roles/components/ConfirmacionAccionModal";
import "../../roles/styles/roles.css";

function esUsuarioActivo(usuario) {
  return Number(usuario.activo) === 1 || usuario.activo === true;
}

function UsuariosRolesPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesSeleccionados, setRolesSeleccionados] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardandoUsuario, setGuardandoUsuario] = useState(null);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  /*
    FIX HT7 (AUD-09): el modal ahora cubre dos acciones distintas.
    esAprobacion = true -> el usuario está pendiente (registro público, activo=0):
    se lo aprueba y se le asigna su primer rol en el mismo paso.
    esAprobacion = false -> reasignación de rol de un usuario que ya opera (HU9).
  */
  const [modalConfirmacion, setModalConfirmacion] = useState({
    abierto: false,
    usuario: null,
    idRolNuevo: null,
    rolNuevo: null,
    esAprobacion: false,
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

  /*
    FIX HT7 (AUD-09): reemplaza a abrirModalCambioRol.
    Para un usuario pendiente no hay "rol actual" real que comparar -id_rol en la
    base es sólo el placeholder que exige la tabla-, así que se exige elegir
    cualquier rol; para un usuario activo se mantiene la regla de HU9: el rol
    elegido debe ser distinto del actual.
  */
  function abrirModalAccion(usuario) {
    limpiarMensajes();

    const usuarioActivo = esUsuarioActivo(usuario);

    const idRolElegido =
      rolesSeleccionados[usuario.id_usuario] ||
      (usuarioActivo ? usuario.id_rol : "");

    if (!idRolElegido) {
      setMensajeError("Seleccioná un rol antes de continuar.");
      return;
    }

    if (usuarioActivo && Number(idRolElegido) === Number(usuario.id_rol)) {
      setMensajeError("Seleccioná un rol diferente antes de guardar.");
      return;
    }

    const rolNuevo = roles.find((rol) => {
      return Number(rol.id_rol) === Number(idRolElegido);
    });

    if (!rolNuevo) {
      setMensajeError("El rol seleccionado no es válido.");
      return;
    }

    setModalConfirmacion({
      abierto: true,
      usuario,
      idRolNuevo: idRolElegido,
      rolNuevo,
      esAprobacion: !usuarioActivo,
    });
  }

  function cerrarModalConfirmacion() {
    if (guardandoUsuario) return;

    setModalConfirmacion({
      abierto: false,
      usuario: null,
      idRolNuevo: null,
      rolNuevo: null,
      esAprobacion: false,
    });
  }

  async function confirmarAccion() {
    const { usuario, idRolNuevo, esAprobacion } = modalConfirmacion;

    if (!usuario || !idRolNuevo) return;

    try {
      setGuardandoUsuario(usuario.id_usuario);
      limpiarMensajes();

      if (esAprobacion) {
        // FIX HT7 (AUD-09): aprobación + asignación de rol en un único paso.
        await aprobarUsuario(usuario.id_usuario, Number(idRolNuevo));
        setMensajeExito("Usuario aprobado y rol asignado correctamente.");
      } else {
        await actualizarRolUsuario(usuario.id_usuario, Number(idRolNuevo));
        setMensajeExito("Rol del usuario actualizado correctamente.");
      }

      setModalConfirmacion({
        abierto: false,
        usuario: null,
        idRolNuevo: null,
        rolNuevo: null,
        esAprobacion: false,
      });

      await cargarDatosIniciales();
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(
        mensajeBackend ||
          (esAprobacion
            ? "No se pudo aprobar al usuario."
            : "No se pudo actualizar el rol del usuario.")
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
  const esAprobacionDelModal = modalConfirmacion.esAprobacion;

  return (
    <>
      <main className="roles-page">
        <section className="roles-page__encabezado">
          <div>
            <p className="roles-page__etiqueta"></p>
            <h1>Administración de usuarios</h1>
            <p className="roles-page__descripcion">
              Visualizá los usuarios del consultorio, aprobá a quienes se
              registraron por su cuenta y modificá el rol asignado a cada uno.
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
                    const usuarioActivo = esUsuarioActivo(usuario);

                    /*
                      FIX HT7 (AUD-09): un usuario pendiente no arranca con un rol
                      preseleccionado. Mostrar de entrada el rol placeholder de la
                      base (por ejemplo "empleado") daría a entender que el sistema
                      ya le asignó ese rol, cuando en realidad todavía nadie lo
                      revisó.
                    */
                    const rolSeleccionado =
                      rolesSeleccionados[usuario.id_usuario] ??
                      (usuarioActivo ? usuario.id_rol : "");

                    const guardandoEsteUsuario =
                      guardandoUsuario === usuario.id_usuario;

                    const rolSinCambios =
                      usuarioActivo &&
                      Number(rolSeleccionado) === Number(usuario.id_rol);

                    const botonDeshabilitado =
                      guardandoEsteUsuario || !rolSeleccionado || rolSinCambios;

                    return (
                      <tr key={usuario.id_usuario}>
                        <td>
                          <strong>
                            {usuario.nombre} {usuario.apellido}
                          </strong>
                        </td>

                        <td>{usuario.email}</td>

                        <td>
                          {usuarioActivo
                            ? usuario.nombre_rol || "Sin rol"
                            : "Pendiente de aprobación"}
                        </td>

                        <td>
                          <span
                            className={
                              usuarioActivo
                                ? "roles-page__badge roles-page__badge--activo"
                                : "roles-page__badge roles-page__badge--inactivo"
                            }
                          >
                            {usuarioActivo ? "Activo" : "Pendiente"}
                          </span>
                        </td>

                        <td>
                          <select
                            className="roles-page__select-tabla"
                            value={rolSeleccionado || ""}
                            disabled={guardandoEsteUsuario}
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
                              disabled={botonDeshabilitado}
                              onClick={() => abrirModalAccion(usuario)}
                            >
                              {guardandoEsteUsuario
                                ? usuarioActivo
                                  ? "Guardando..."
                                  : "Aprobando..."
                                : usuarioActivo
                                ? "Guardar rol"
                                : "Aprobar y asignar rol"}
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
        titulo={
          esAprobacionDelModal ? "Confirmar aprobación" : "Confirmar cambio de rol"
        }
        descripcion={
          esAprobacionDelModal
            ? `Estás por aprobar a "${
                usuarioDelModal
                  ? `${usuarioDelModal.nombre} ${usuarioDelModal.apellido}`
                  : "este usuario"
              }" con el rol "${
                rolNuevoDelModal?.nombre_rol || "seleccionado"
              }". A partir de este momento va a poder iniciar sesión y usar los permisos de ese rol.`
            : `Estás por cambiar el rol de "${
                usuarioDelModal
                  ? `${usuarioDelModal.nombre} ${usuarioDelModal.apellido}`
                  : "este usuario"
              }" al rol "${
                rolNuevoDelModal?.nombre_rol || "seleccionado"
              }". Este cambio modificará las funcionalidades que podrá ver y utilizar dentro del sistema.`
        }
        textoConfirmar={esAprobacionDelModal ? "Aprobar usuario" : "Cambiar rol"}
        textoCancelar="Cancelar"
        cargando={Boolean(guardandoUsuario)}
        onCancelar={cerrarModalConfirmacion}
        onConfirmar={confirmarAccion}
      />
    </>
  );
}

export default UsuariosRolesPage;
