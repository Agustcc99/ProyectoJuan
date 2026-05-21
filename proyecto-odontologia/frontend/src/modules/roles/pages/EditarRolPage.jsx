import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obtenerRoles,
  actualizarRol,
  obtenerPermisosDelRol,
  actualizarPermisosDelRol,
  desactivarRol,
  reactivarRol,
} from "../services/rolesService";
import ConfirmacionAccionModal from "../components/ConfirmacionAccionModal";
import "../styles/roles.css";

const ordenPermisosDeMenorAMayor = [
  "ver_pacientes",
  "crear_pacientes",
  "editar_pacientes",

  "ver_tratamientos",
  "crear_tratamientos",
  "editar_tratamientos",

  "registrar_pagos",
  "registrar_gastos",
  "ver_reportes",

  "ver_roles",
  "crear_roles",
  "editar_roles",
  "desactivar_roles",
  "reactivar_roles",

  "ver_usuarios",
  "asignar_roles_usuarios",
  "asignar_permisos",
];

const gruposDePermisos = [
  {
    titulo: "Permisos operativos",
    descripcion: "Acciones relacionadas con pacientes y tratamientos.",
    codigos: [
      "ver_pacientes",
      "crear_pacientes",
      "editar_pacientes",
      "ver_tratamientos",
      "crear_tratamientos",
      "editar_tratamientos",
    ],
  },
  {
    titulo: "Permisos financieros y reportes",
    descripcion: "Acciones vinculadas a pagos, gastos e información económica.",
    codigos: ["registrar_pagos", "registrar_gastos", "ver_reportes"],
  },
  {
    titulo: "Gestión de roles",
    descripcion:
      "Acciones para consultar, crear, modificar o cambiar el estado de roles.",
    codigos: [
      "ver_roles",
      "crear_roles",
      "editar_roles",
      "desactivar_roles",
      "reactivar_roles",
    ],
  },
  {
    titulo: "Permisos críticos",
    descripcion:
      "Acciones sensibles relacionadas con usuarios, roles y permisos.",
    codigos: ["ver_usuarios", "asignar_roles_usuarios", "asignar_permisos"],
  },
];

function obtenerPrioridadPermiso(codigoPermiso) {
  const posicion = ordenPermisosDeMenorAMayor.indexOf(codigoPermiso);

  if (posicion === -1) {
    return 999;
  }

  return posicion;
}

function ordenarPermisosDeMenorAMayor(permisos) {
  return [...permisos].sort((permisoA, permisoB) => {
    const prioridadA = obtenerPrioridadPermiso(permisoA.codigo_permiso);
    const prioridadB = obtenerPrioridadPermiso(permisoB.codigo_permiso);

    return prioridadA - prioridadB;
  });
}

function EditarRolPage() {
  const { idRol } = useParams();
  const navegar = useNavigate();

  const [nombreRol, setNombreRol] = useState("");
  const [descripcionRol, setDescripcionRol] = useState("");
  const [estadoRol, setEstadoRol] = useState(null);

  const [permisos, setPermisos] = useState([]);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [modalConfirmacion, setModalConfirmacion] = useState({
    abierto: false,
    tipoAccion: null,
  });

  const rolActivo = Number(estadoRol) === 1 || estadoRol === true;

  async function cargarDatosDelRol() {
    try {
      setCargando(true);
      setMensajeError("");
      setMensajeExito("");

      const respuestaRoles = await obtenerRoles();
      const respuestaPermisos = await obtenerPermisosDelRol(idRol);

      const listaRoles =
        respuestaRoles.roles || respuestaRoles.data || respuestaRoles || [];

      const rolEncontrado = Array.isArray(listaRoles)
        ? listaRoles.find((rol) => Number(rol.id_rol) === Number(idRol))
        : null;

      const rolDesdePermisos = respuestaPermisos.rol || null;
      const datosRol = rolEncontrado || rolDesdePermisos;

      if (!datosRol) {
        setMensajeError("No se encontró el rol seleccionado.");
        return;
      }

      const listaPermisos =
        respuestaPermisos.permisos ||
        respuestaPermisos.data ||
        respuestaPermisos ||
        [];

      const permisosOrdenados = ordenarPermisosDeMenorAMayor(
        Array.isArray(listaPermisos) ? listaPermisos : []
      );

      const permisosAsignados = permisosOrdenados
        .filter((permiso) => {
          return Number(permiso.asignado) === 1 || permiso.asignado === true;
        })
        .map((permiso) => permiso.id_permiso);

      setNombreRol(datosRol.nombre_rol || "");
      setDescripcionRol(datosRol.descripcion || "");
      setEstadoRol(datosRol.activo);
      setPermisos(permisosOrdenados);
      setPermisosSeleccionados(permisosAsignados);
    } catch (error) {
      const codigoEstado = error.response?.status;
      const mensajeBackend = error.response?.data?.mensaje;

      if (codigoEstado === 403) {
        setMensajeError(
          "No tenés permisos suficientes para consultar o modificar este rol."
        );
      } else {
        setMensajeError(
          mensajeBackend || "No se pudieron cargar los datos del rol."
        );
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatosDelRol();
  }, [idRol]);

  function limpiarMensajes() {
    setMensajeError("");
    setMensajeExito("");
  }

  function manejarSeleccionPermiso(idPermiso) {
    if (!rolActivo) return;

    setPermisosSeleccionados((permisosActuales) => {
      const permisoYaSeleccionado = permisosActuales.includes(idPermiso);

      if (permisoYaSeleccionado) {
        return permisosActuales.filter((permiso) => permiso !== idPermiso);
      }

      return [...permisosActuales, idPermiso];
    });
  }

  function obtenerPermisosPorGrupo(codigosDelGrupo) {
    return permisos.filter((permiso) =>
      codigosDelGrupo.includes(permiso.codigo_permiso)
    );
  }

  function abrirModalDesactivarRol() {
    limpiarMensajes();

    setModalConfirmacion({
      abierto: true,
      tipoAccion: "desactivar",
    });
  }

  function abrirModalReactivarRol() {
    limpiarMensajes();

    setModalConfirmacion({
      abierto: true,
      tipoAccion: "reactivar",
    });
  }

  function cerrarModalConfirmacion() {
    if (guardando) return;

    setModalConfirmacion({
      abierto: false,
      tipoAccion: null,
    });
  }

  async function confirmarAccionEstadoRol() {
    const { tipoAccion } = modalConfirmacion;

    if (!tipoAccion) return;

    try {
      setGuardando(true);
      limpiarMensajes();

      if (tipoAccion === "desactivar") {
        await desactivarRol(idRol);
        setEstadoRol(0);
        setMensajeExito("Rol desactivado correctamente.");
      }

      if (tipoAccion === "reactivar") {
        await reactivarRol(idRol);
        setEstadoRol(1);
        setMensajeExito("Rol reactivado correctamente.");
      }

      setModalConfirmacion({
        abierto: false,
        tipoAccion: null,
      });
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(
        mensajeBackend || "No se pudo completar la acción sobre el rol."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function manejarSubmit(evento) {
    evento.preventDefault();

    limpiarMensajes();

    if (!rolActivo) {
      setMensajeError(
        "No se puede modificar un rol inactivo. Primero tenés que reactivarlo."
      );
      return;
    }

    const nombreRolLimpio = nombreRol.trim();
    const descripcionRolLimpia = descripcionRol.trim();

    if (!nombreRolLimpio) {
      setMensajeError("El nombre del rol es obligatorio.");
      return;
    }

    try {
      setGuardando(true);

      await actualizarRol(idRol, {
        nombre_rol: nombreRolLimpio,
        descripcion: descripcionRolLimpia || null,
      });

      await actualizarPermisosDelRol(idRol, permisosSeleccionados);

      setMensajeExito("Rol actualizado correctamente.");
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(mensajeBackend || "No se pudo actualizar el rol.");
    } finally {
      setGuardando(false);
    }
  }

  const esModalDesactivar = modalConfirmacion.tipoAccion === "desactivar";

  return (
    <>
      <main className="roles-page">
        <section className="roles-page__encabezado">
          <div>
            <h1>Detalle del rol</h1>
            <p className="roles-page__descripcion">
              Consultá el estado del rol, modificá sus datos principales y
              administrá los permisos asignados.
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
            <p className="roles-page__estado">Cargando datos del rol...</p>
          ) : (
            <form className="roles-page__formulario" onSubmit={manejarSubmit}>
              <div className="roles-page__resumen-rol">
                <div>
                  <span className="roles-page__resumen-label">
                    Estado actual
                  </span>
                  <span
                    className={
                      rolActivo
                        ? "roles-page__badge roles-page__badge--activo"
                        : "roles-page__badge roles-page__badge--inactivo"
                    }
                  >
                    {rolActivo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div>
                  <span className="roles-page__resumen-label">
                    Permisos seleccionados
                  </span>
                  <strong>{permisosSeleccionados.length}</strong>
                </div>

                <div className="roles-page__acciones-estado">
                  {rolActivo ? (
                    <button
                      className="roles-page__boton-peligro"
                      type="button"
                      onClick={abrirModalDesactivarRol}
                      disabled={guardando}
                    >
                      Desactivar rol
                    </button>
                  ) : (
                    <button
                      className="roles-page__boton-exito"
                      type="button"
                      onClick={abrirModalReactivarRol}
                      disabled={guardando}
                    >
                      Reactivar rol
                    </button>
                  )}
                </div>
              </div>

              {!rolActivo && (
                <div className="roles-page__mensaje roles-page__mensaje--advertencia">
                  Este rol está inactivo. Podés consultar su información, pero
                  para modificar datos o permisos primero tenés que reactivarlo.
                </div>
              )}

              <div className="roles-page__campo">
                <label htmlFor="nombreRol">Nombre del rol</label>
                <input
                  id="nombreRol"
                  type="text"
                  value={nombreRol}
                  onChange={(evento) => setNombreRol(evento.target.value)}
                  disabled={!rolActivo || guardando}
                />
              </div>

              <div className="roles-page__campo">
                <label htmlFor="descripcionRol">Descripción</label>
                <textarea
                  id="descripcionRol"
                  value={descripcionRol}
                  onChange={(evento) => setDescripcionRol(evento.target.value)}
                  rows="4"
                  disabled={!rolActivo || guardando}
                />
              </div>

              <div className="roles-page__seccion-formulario">
                <div className="roles-page__titulo-seccion-permisos">
                  <div>
                    <h2>Permisos del rol</h2>
                    <p>
                      Los permisos aparecen ordenados desde acciones operativas
                      hasta permisos críticos de administración.
                    </p>
                  </div>

                  <span className="roles-page__contador-permisos">
                    {permisosSeleccionados.length} seleccionados
                  </span>
                </div>

                <div className="roles-page__grupos-permisos">
                  {gruposDePermisos.map((grupo) => {
                    const permisosDelGrupo = obtenerPermisosPorGrupo(
                      grupo.codigos
                    );

                    if (permisosDelGrupo.length === 0) return null;

                    return (
                      <section
                        className="roles-page__grupo-permisos"
                        key={grupo.titulo}
                      >
                        <div className="roles-page__grupo-permisos-encabezado">
                          <h3>{grupo.titulo}</h3>
                          <p>{grupo.descripcion}</p>
                        </div>

                        <div className="roles-page__permisos-grid">
                          {permisosDelGrupo.map((permiso) => {
                            const idPermiso = permiso.id_permiso;
                            const permisoSeleccionado =
                              permisosSeleccionados.includes(idPermiso);

                            return (
                              <label
                                className={
                                  permisoSeleccionado
                                    ? "roles-page__permiso-card roles-page__permiso-card--seleccionado"
                                    : "roles-page__permiso-card"
                                }
                                key={idPermiso}
                              >
                                <input
                                  type="checkbox"
                                  checked={permisoSeleccionado}
                                  onChange={() =>
                                    manejarSeleccionPermiso(idPermiso)
                                  }
                                  disabled={!rolActivo || guardando}
                                />

                                <span className="roles-page__permiso-check">
                                  {permisoSeleccionado ? "✓" : ""}
                                </span>

                                <span className="roles-page__permiso-info">
                                  <strong>{permiso.nombre_permiso}</strong>
                                  <small>{permiso.codigo_permiso}</small>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>

              <div className="roles-page__acciones-formulario">
                <button
                  className="roles-page__boton-secundario"
                  type="button"
                  onClick={() => navegar("/panel/administrador")}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  className="roles-page__boton-principal"
                  type="submit"
                  disabled={guardando || !rolActivo}
                >
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      <ConfirmacionAccionModal
        abierto={modalConfirmacion.abierto}
        tipo={esModalDesactivar ? "peligro" : "exito"}
        titulo={
          esModalDesactivar ? "Confirmar baja lógica" : "Confirmar reactivación"
        }
        descripcion={
          esModalDesactivar
            ? `Estás por desactivar el rol "${nombreRol}". No se eliminará de la base de datos, pero dejará de estar disponible para nuevas asignaciones.`
            : `Estás por reactivar el rol "${nombreRol}". El rol volverá a estar disponible para asignarlo a usuarios.`
        }
        textoConfirmar={esModalDesactivar ? "Desactivar rol" : "Reactivar rol"}
        textoCancelar="Cancelar"
        cargando={guardando}
        onCancelar={cerrarModalConfirmacion}
        onConfirmar={confirmarAccionEstadoRol}
      />
    </>
  );
}

export default EditarRolPage;