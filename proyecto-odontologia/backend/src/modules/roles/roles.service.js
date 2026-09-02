const { poolDeConexiones } = require("../../config/db");

/*
  FIX HT8 (AUD-10) - subtarea "Definir criterio de rol con permisos de
  administración": un rol cuenta como "administrador" cuando tiene asignados
  AMBOS permisos siguientes:
    - asignar_permisos: puede redefinir qué puede hacer cualquier rol.
    - asignar_roles_usuarios: puede decidir qué usuario tiene cada rol.
  Juntos son los dos permisos que controlan la autorización de todo el sistema:
  quien los tiene puede, en el peor caso, otorgarse a sí mismo o a cualquier otro
  usuario cualquier capacidad. Si un consultorio se queda sin ningún rol activo
  que tenga esta combinación, nadie podría volver a administrar permisos ni
  roles sin intervenir directamente la base de datos.
  No se usa id_rol === 1 en ningún punto de esta verificación.
*/
const CODIGOS_PERMISOS_DE_ADMINISTRACION = [
  "asignar_permisos",
  "asignar_roles_usuarios",
];

/*
  Determina si un rol tiene asignados todos los permisos que definen
  "administración" (ver constante de arriba).
*/
async function rolTienePermisosDeAdministracion(idRol) {
  const [filas] = await poolDeConexiones.query(
    `SELECT COUNT(DISTINCT p.codigo_permiso) AS cantidad
     FROM roles_permisos rp
     INNER JOIN permisos p
       ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = ?
       AND p.codigo_permiso IN (?)`,
    [idRol, CODIGOS_PERMISOS_DE_ADMINISTRACION]
  );

  return filas[0].cantidad === CODIGOS_PERMISOS_DE_ADMINISTRACION.length;
}

/*
  Cuenta cuántos OTROS roles activos del mismo consultorio (excluyendo idRol)
  también tienen permisos de administración. Si da 0, idRol es el último.
*/
async function contarOtrosRolesConPermisosDeAdministracion(idRol, idConsultorio) {
  const [filas] = await poolDeConexiones.query(
    `SELECT COUNT(*) AS cantidad
     FROM (
       SELECT r.id_rol
       FROM roles r
       INNER JOIN roles_permisos rp
         ON rp.id_rol = r.id_rol
       INNER JOIN permisos p
         ON p.id_permiso = rp.id_permiso
       WHERE r.id_consultorio = ?
         AND r.activo = 1
         AND r.id_rol <> ?
         AND p.codigo_permiso IN (?)
       GROUP BY r.id_rol
       HAVING COUNT(DISTINCT p.codigo_permiso) = ?
     ) AS roles_con_administracion`,
    [
      idConsultorio,
      idRol,
      CODIGOS_PERMISOS_DE_ADMINISTRACION,
      CODIGOS_PERMISOS_DE_ADMINISTRACION.length,
    ]
  );

  return filas[0].cantidad;
}

/*
  Obtiene todos los roles pertenecientes al consultorio del usuario autenticado.
  El id_consultorio llega desde el token JWT, por eso no se recibe desde el frontend.
*/
async function listarRolesDelConsultorio(idConsultorio) {
  const [rolesEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_rol,
        nombre_rol,
        descripcion,
        activo,
        id_consultorio
     FROM roles
     WHERE id_consultorio = ?
     ORDER BY nombre_rol ASC`,
    [idConsultorio]
  );

  return rolesEncontrados;
}

/*
  Crea un nuevo rol dentro del consultorio del usuario autenticado.
  Valida que el nombre no esté vacío y que no exista otro rol activo
  con el mismo nombre dentro del mismo consultorio.
*/
async function crearRolDelConsultorio(datosRol, idConsultorio) {
  const { nombre_rol, descripcion } = datosRol;

  const nombreRolLimpio = nombre_rol ? nombre_rol.trim() : "";
  const descripcionLimpia = descripcion ? descripcion.trim() : null;

  if (!nombreRolLimpio) {
    const error = new Error("El nombre del rol es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesDuplicados] = await poolDeConexiones.query(
    `SELECT id_rol
     FROM roles
     WHERE LOWER(nombre_rol) = LOWER(?)
       AND id_consultorio = ?
       AND activo = 1
     LIMIT 1`,
    [nombreRolLimpio, idConsultorio]
  );

  if (rolesDuplicados.length > 0) {
    const error = new Error("Ya existe un rol activo con ese nombre en el consultorio.");
    error.statusCode = 409;
    throw error;
  }

  const [resultadoInsercion] = await poolDeConexiones.query(
    `INSERT INTO roles 
      (nombre_rol, descripcion, activo, id_consultorio)
     VALUES (?, ?, ?, ?)`,
    [nombreRolLimpio, descripcionLimpia, true, idConsultorio]
  );

  return {
    id_rol: resultadoInsercion.insertId,
    nombre_rol: nombreRolLimpio,
    descripcion: descripcionLimpia,
    activo: 1,
    id_consultorio: idConsultorio,
  };
}

/*
  Modifica el nombre y la descripción de un rol existente.
  Antes de actualizar, valida que el rol exista, que pertenezca al consultorio
  del usuario autenticado y que no se repita el nombre con otro rol activo.
*/
async function modificarRolDelConsultorio(idRol, datosRol, idConsultorio) {
  const { nombre_rol, descripcion } = datosRol;

  const nombreRolLimpio = nombre_rol ? nombre_rol.trim() : "";
  const descripcionLimpia = descripcion ? descripcion.trim() : null;

  if (!idRol || Number.isNaN(Number(idRol))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (!nombreRolLimpio) {
    const error = new Error("El nombre del rol es obligatorio.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_rol,
        nombre_rol,
        descripcion,
        activo,
        id_consultorio
     FROM roles
     WHERE id_rol = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idRol, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  const [rolesDuplicados] = await poolDeConexiones.query(
    `SELECT id_rol
     FROM roles
     WHERE LOWER(nombre_rol) = LOWER(?)
       AND id_consultorio = ?
       AND activo = 1
       AND id_rol <> ?
     LIMIT 1`,
    [nombreRolLimpio, idConsultorio, idRol]
  );

  if (rolesDuplicados.length > 0) {
    const error = new Error("Ya existe otro rol activo con ese nombre en el consultorio.");
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE roles
     SET nombre_rol = ?,
         descripcion = ?
     WHERE id_rol = ?
       AND id_consultorio = ?`,
    [nombreRolLimpio, descripcionLimpia, idRol, idConsultorio]
  );

  return {
    id_rol: Number(idRol),
    nombre_rol: nombreRolLimpio,
    descripcion: descripcionLimpia,
    activo: rolesEncontrados[0].activo,
    id_consultorio: idConsultorio,
  };
}

/*
  Realiza la baja lógica de un rol.
  No elimina el registro de la base de datos, solamente cambia su estado activo a 0.

  FIX HT8 (AUD-10) - subtarea "Reemplazar la validación por id fijo": ya no se
  compara id_rol contra 1. En su lugar se evita desactivar el ÚLTIMO rol activo
  del consultorio que tenga permisos de administración (asignar_permisos +
  asignar_roles_usuarios), sin importar qué id_rol tenga. Si el consultorio
  todavía conserva otro rol activo con esa combinación de permisos, la baja se
  permite con normalidad.
*/
async function desactivarRolDelConsultorio(idRol, idConsultorio) {
  if (!idRol || Number.isNaN(Number(idRol))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesEncontrados] = await poolDeConexiones.query(
    `SELECT
        id_rol,
        nombre_rol,
        descripcion,
        activo,
        id_consultorio
     FROM roles
     WHERE id_rol = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idRol, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  const rolEncontrado = rolesEncontrados[0];

  if (!rolEncontrado.activo) {
    const error = new Error("El rol ya se encuentra inactivo.");
    error.statusCode = 400;
    throw error;
  }

  const esRolDeAdministracion = await rolTienePermisosDeAdministracion(idRol);

  if (esRolDeAdministracion) {
    const cantidadOtrosRolesAdmin =
      await contarOtrosRolesConPermisosDeAdministracion(idRol, idConsultorio);

    if (cantidadOtrosRolesAdmin === 0) {
      const error = new Error(
        "No se puede desactivar: es el único rol con permisos de administración de este consultorio."
      );
      error.statusCode = 400;
      throw error;
    }
  }

  await poolDeConexiones.query(
    `UPDATE roles
     SET activo = 0
     WHERE id_rol = ?
       AND id_consultorio = ?`,
    [idRol, idConsultorio]
  );

  return {
    ...rolEncontrado,
    activo: 0,
  };
}

/*
  Reactiva un rol que fue dado de baja lógicamente.
  Antes de reactivarlo, valida que no exista otro rol activo con el mismo nombre
  dentro del mismo consultorio.
*/
async function reactivarRolDelConsultorio(idRol, idConsultorio) {
  if (!idRol || Number.isNaN(Number(idRol))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_rol,
        nombre_rol,
        descripcion,
        activo,
        id_consultorio
     FROM roles
     WHERE id_rol = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idRol, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  const rolEncontrado = rolesEncontrados[0];

  if (rolEncontrado.activo) {
    const error = new Error("El rol ya se encuentra activo.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesDuplicados] = await poolDeConexiones.query(
    `SELECT id_rol
     FROM roles
     WHERE LOWER(nombre_rol) = LOWER(?)
       AND id_consultorio = ?
       AND activo = 1
       AND id_rol <> ?
     LIMIT 1`,
    [rolEncontrado.nombre_rol, idConsultorio, idRol]
  );

  if (rolesDuplicados.length > 0) {
    const error = new Error(
      "No se puede reactivar el rol porque ya existe otro rol activo con el mismo nombre."
    );
    error.statusCode = 409;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE roles
     SET activo = 1
     WHERE id_rol = ?
       AND id_consultorio = ?`,
    [idRol, idConsultorio]
  );

  return {
    ...rolEncontrado,
    activo: 1,
  };
}

/*
  Obtiene todos los permisos del sistema e indica cuáles están asignados
  al rol seleccionado.
  Sirve para mostrar checkboxes marcados o desmarcados en el frontend.
*/
async function obtenerPermisosDeRol(idRol, idConsultorio) {
  if (!idRol || Number.isNaN(Number(idRol))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_rol,
        nombre_rol,
        descripcion,
        activo,
        id_consultorio
     FROM roles
     WHERE id_rol = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idRol, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  const [permisosEncontrados] = await poolDeConexiones.query(
    `SELECT
        p.id_permiso,
        p.codigo_permiso,
        p.nombre_permiso,
        p.descripcion,
        p.activo,
        CASE 
          WHEN rp.id_permiso IS NULL THEN 0
          ELSE 1
        END AS asignado
     FROM permisos p
     LEFT JOIN roles_permisos rp
       ON p.id_permiso = rp.id_permiso
      AND rp.id_rol = ?
     WHERE p.activo = 1
     ORDER BY p.nombre_permiso ASC`,
    [idRol]
  );

  return {
    rol: rolesEncontrados[0],
    permisos: permisosEncontrados,
  };
}

/*
  Actualiza la lista completa de permisos asignados a un rol.
  Primero valida que el rol pertenezca al consultorio del usuario autenticado.
  Luego valida que todos los permisos enviados existan y estén activos.
  Finalmente borra la configuración anterior y guarda la nueva.
*/
async function actualizarPermisosDeRol(idRol, idsPermisos, idConsultorio) {
  if (!idRol || Number.isNaN(Number(idRol))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(idsPermisos)) {
    const error = new Error("Los permisos deben enviarse en un arreglo.");
    error.statusCode = 400;
    throw error;
  }

  const idsPermisosUnicos = [...new Set(idsPermisos.map(Number))];

  const idsPermisosInvalidos = idsPermisosUnicos.filter((idPermiso) => {
    return !Number.isInteger(idPermiso) || idPermiso <= 0;
  });

  if (idsPermisosInvalidos.length > 0) {
    const error = new Error("Uno o más permisos enviados no son válidos.");
    error.statusCode = 400;
    throw error;
  }

  const [rolesEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_rol,
        nombre_rol,
        descripcion,
        activo,
        id_consultorio
     FROM roles
     WHERE id_rol = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idRol, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  if (!rolesEncontrados[0].activo) {
    const error = new Error("No se pueden asignar permisos a un rol inactivo.");
    error.statusCode = 400;
    throw error;
  }

  if (idsPermisosUnicos.length > 0) {
    const [permisosEncontrados] = await poolDeConexiones.query(
      `SELECT id_permiso
       FROM permisos
       WHERE id_permiso IN (?)
         AND activo = 1`,
      [idsPermisosUnicos]
    );

    if (permisosEncontrados.length !== idsPermisosUnicos.length) {
      const error = new Error("Uno o más permisos no existen o están inactivos.");
      error.statusCode = 400;
      throw error;
    }
  }

  const conexion = await poolDeConexiones.getConnection();

  try {
    await conexion.beginTransaction();

    await conexion.query(
      `DELETE FROM roles_permisos
       WHERE id_rol = ?`,
      [idRol]
    );

    if (idsPermisosUnicos.length > 0) {
      const valoresInsercion = idsPermisosUnicos.map((idPermiso) => [
        idRol,
        idPermiso,
      ]);

      await conexion.query(
        `INSERT INTO roles_permisos
          (id_rol, id_permiso)
         VALUES ?`,
        [valoresInsercion]
      );
    }

    await conexion.commit();

    return await obtenerPermisosDeRol(idRol, idConsultorio);
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  listarRolesDelConsultorio,
  crearRolDelConsultorio,
  modificarRolDelConsultorio,
  desactivarRolDelConsultorio,
  reactivarRolDelConsultorio,
  obtenerPermisosDeRol,
  actualizarPermisosDeRol,
};