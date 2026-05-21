import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearRol, actualizarPermisosDelRol } from "../services/rolesService";
import { obtenerPermisos } from "../../permisos/services/permisosService";
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
    descripcion: "Acciones para consultar, crear, modificar o cambiar el estado de roles.",
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
    descripcion: "Acciones sensibles relacionadas con usuarios, roles y permisos.",
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

function CrearRolPage() {
  const [nombreRol, setNombreRol] = useState("");
  const [descripcionRol, setDescripcionRol] = useState("");
  const [permisos, setPermisos] = useState([]);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const navegar = useNavigate();

  async function cargarPermisos() {
    try {
      setCargandoPermisos(true);
      setMensajeError("");

      const respuesta = await obtenerPermisos();

      const listaPermisos = respuesta.permisos || respuesta.data || respuesta || [];
      const permisosOrdenados = ordenarPermisosDeMenorAMayor(
        Array.isArray(listaPermisos) ? listaPermisos : []
      );

      setPermisos(permisosOrdenados);
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(
        mensajeBackend || "No se pudieron cargar los permisos disponibles."
      );
    } finally {
      setCargandoPermisos(false);
    }
  }

  useEffect(() => {
    cargarPermisos();
  }, []);

  function manejarSeleccionPermiso(idPermiso) {
    setPermisosSeleccionados((permisosActuales) => {
      const permisoYaSeleccionado = permisosActuales.includes(idPermiso);

      if (permisoYaSeleccionado) {
        return permisosActuales.filter((permiso) => permiso !== idPermiso);
      }

      return [...permisosActuales, idPermiso];
    });
  }

  function obtenerIdRolCreado(respuestaCreacion) {
    return (
      respuestaCreacion?.rol?.id_rol ||
      respuestaCreacion?.rol?.insertId ||
      respuestaCreacion?.id_rol ||
      respuestaCreacion?.idRol ||
      respuestaCreacion?.insertId ||
      respuestaCreacion?.resultado?.insertId ||
      null
    );
  }

  function obtenerPermisosPorGrupo(codigosDelGrupo) {
    return permisos.filter((permiso) =>
      codigosDelGrupo.includes(permiso.codigo_permiso)
    );
  }

  async function manejarSubmit(evento) {
    evento.preventDefault();

    setMensajeError("");
    setMensajeExito("");

    const nombreRolLimpio = nombreRol.trim();
    const descripcionRolLimpia = descripcionRol.trim();

    if (!nombreRolLimpio) {
      setMensajeError("El nombre del rol es obligatorio.");
      return;
    }

    try {
      setGuardando(true);

      const respuestaCreacion = await crearRol({
        nombre_rol: nombreRolLimpio,
        descripcion: descripcionRolLimpia || null,
      });

      const idRolCreado = obtenerIdRolCreado(respuestaCreacion);

      if (idRolCreado && permisosSeleccionados.length > 0) {
        await actualizarPermisosDelRol(idRolCreado, permisosSeleccionados);
      }

      if (!idRolCreado && permisosSeleccionados.length > 0) {
        setMensajeExito(
          "Rol creado correctamente. Los permisos se podrán asignar desde el botón Permisos del listado."
        );
      } else {
        setMensajeExito("Rol creado correctamente.");
      }

      setTimeout(() => {
        navegar("/panel/administrador");
      }, 900);
    } catch (error) {
      const mensajeBackend = error.response?.data?.mensaje;

      setMensajeError(mensajeBackend || "No se pudo crear el rol.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="roles-page">
      <section className="roles-page__encabezado">
        <div>
          <p className="roles-page__etiqueta"></p>
          <h1>Nuevo rol</h1>
          <p className="roles-page__descripcion">
            Registrá un nuevo rol para el consultorio y seleccioná los permisos
            que tendrá asignados, ordenados desde menor privilegio hasta permisos
            críticos.
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

        <form className="roles-page__formulario" onSubmit={manejarSubmit}>
          <div className="roles-page__campo">
            <label htmlFor="nombreRol">Nombre del rol</label>
            <input
              id="nombreRol"
              type="text"
              placeholder="Ejemplo: recepcionista"
              value={nombreRol}
              onChange={(evento) => setNombreRol(evento.target.value)}
            />
          </div>

          <div className="roles-page__campo">
            <label htmlFor="descripcionRol">Descripción</label>
            <textarea
              id="descripcionRol"
              placeholder="Describí brevemente qué función cumple este rol."
              value={descripcionRol}
              onChange={(evento) => setDescripcionRol(evento.target.value)}
              rows="4"
            />
          </div>

          <div className="roles-page__seccion-formulario">
            <div className="roles-page__titulo-seccion-permisos">
              <div>
                <h2>Permisos del rol</h2>
                <p>
                  Seleccioná las acciones que podrá realizar el usuario que tenga
                  este rol asignado.
                </p>
              </div>

              <span className="roles-page__contador-permisos">
                {permisosSeleccionados.length} seleccionados
              </span>
            </div>

            {cargandoPermisos ? (
              <p className="roles-page__estado">Cargando permisos...</p>
            ) : permisos.length === 0 ? (
              <p className="roles-page__estado">
                No hay permisos disponibles para asignar.
              </p>
            ) : (
              <div className="roles-page__grupos-permisos">
                {gruposDePermisos.map((grupo) => {
                  const permisosDelGrupo = obtenerPermisosPorGrupo(grupo.codigos);

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
            )}
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
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar rol"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CrearRolPage;