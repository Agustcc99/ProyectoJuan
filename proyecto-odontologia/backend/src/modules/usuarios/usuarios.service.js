const { poolDeConexiones } = require("../../config/db");

/*
  Lista los usuarios pertenecientes al consultorio del usuario autenticado.
  El id_consultorio se obtiene desde el token JWT.
*/
async function listarUsuariosDelConsultorio(idConsultorio) {
  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.id_rol,
        r.nombre_rol,
        u.id_consultorio,
        u.activo,
        u.fecha_creacion
     FROM usuarios u
     INNER JOIN roles r
       ON u.id_rol = r.id_rol
     WHERE u.id_consultorio = ?
     ORDER BY u.nombre ASC, u.apellido ASC`,
    [idConsultorio]
  );

  return usuariosEncontrados;
}

/*
  Modifica el rol asignado a un usuario del consultorio.
  Valida que el usuario pertenezca al consultorio autenticado
  y que el nuevo rol exista, esté activo y pertenezca al mismo consultorio.
*/
async function actualizarRolDeUsuario(idUsuario, idRolNuevo, idConsultorio) {
  if (!idUsuario || Number.isNaN(Number(idUsuario))) {
    const error = new Error("El id del usuario no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (!idRolNuevo || Number.isNaN(Number(idRolNuevo))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT
        id_usuario,
        nombre,
        apellido,
        email,
        id_rol,
        id_consultorio,
        activo
     FROM usuarios
     WHERE id_usuario = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idUsuario, idConsultorio]
  );

  if (usuariosEncontrados.length === 0) {
    const error = new Error("El usuario no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  const usuarioEncontrado = usuariosEncontrados[0];

  if (!usuarioEncontrado.activo) {
    const error = new Error("No se puede modificar el rol de un usuario inactivo.");
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
       AND activo = 1
     LIMIT 1`,
    [idRolNuevo, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe, está inactivo o no pertenece a este consultorio.");
    error.statusCode = 400;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE usuarios
     SET id_rol = ?
     WHERE id_usuario = ?
       AND id_consultorio = ?`,
    [idRolNuevo, idUsuario, idConsultorio]
  );

  const rolNuevo = rolesEncontrados[0];

  return {
    id_usuario: Number(idUsuario),
    nombre: usuarioEncontrado.nombre,
    apellido: usuarioEncontrado.apellido,
    email: usuarioEncontrado.email,
    id_rol: rolNuevo.id_rol,
    nombre_rol: rolNuevo.nombre_rol,
    id_consultorio: idConsultorio,
    activo: usuarioEncontrado.activo,
  };
}

/*
  FIX HT7 (AUD-09): aprueba a un usuario registrado públicamente.

  Sólo actúa sobre usuarios INACTIVOS (pendientes) del consultorio del
  administrador autenticado: les asigna el rol definitivo elegido y los activa en
  un único paso. Es una acción distinta de actualizarRolDeUsuario() a propósito
  -esa sigue exigiendo un usuario activo- para no confundir "reasignar el rol de
  alguien que ya opera en el sistema" con "dar de alta a alguien que se registró
  por su cuenta". Cubre el Criterio 2 de aceptación de HT7.
*/
async function aprobarUsuarioPendiente(idUsuario, idRolNuevo, idConsultorio) {
  if (!idUsuario || Number.isNaN(Number(idUsuario))) {
    const error = new Error("El id del usuario no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (!idRolNuevo || Number.isNaN(Number(idRolNuevo))) {
    const error = new Error("El id del rol no es válido.");
    error.statusCode = 400;
    throw error;
  }

  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT
        id_usuario,
        nombre,
        apellido,
        email,
        id_rol,
        id_consultorio,
        activo
     FROM usuarios
     WHERE id_usuario = ?
       AND id_consultorio = ?
     LIMIT 1`,
    [idUsuario, idConsultorio]
  );

  if (usuariosEncontrados.length === 0) {
    const error = new Error("El usuario no existe o no pertenece a este consultorio.");
    error.statusCode = 404;
    throw error;
  }

  const usuarioEncontrado = usuariosEncontrados[0];

  if (usuarioEncontrado.activo) {
    const error = new Error("El usuario ya fue aprobado anteriormente.");
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
       AND activo = 1
     LIMIT 1`,
    [idRolNuevo, idConsultorio]
  );

  if (rolesEncontrados.length === 0) {
    const error = new Error("El rol no existe, está inactivo o no pertenece a este consultorio.");
    error.statusCode = 400;
    throw error;
  }

  await poolDeConexiones.query(
    `UPDATE usuarios
     SET id_rol = ?,
         activo = 1
     WHERE id_usuario = ?
       AND id_consultorio = ?`,
    [idRolNuevo, idUsuario, idConsultorio]
  );

  const rolNuevo = rolesEncontrados[0];

  return {
    id_usuario: Number(idUsuario),
    nombre: usuarioEncontrado.nombre,
    apellido: usuarioEncontrado.apellido,
    email: usuarioEncontrado.email,
    id_rol: rolNuevo.id_rol,
    nombre_rol: rolNuevo.nombre_rol,
    id_consultorio: idConsultorio,
    activo: true,
  };
}

module.exports = {
  listarUsuariosDelConsultorio,
  actualizarRolDeUsuario,
  aprobarUsuarioPendiente,
};