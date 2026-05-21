const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { enviarEmailRecuperacionContrasena } = require("../email/email.service");
const { poolDeConexiones } = require("../../config/db");

// Función para registrar un nuevo usuario
async function registrarUsuario(datosUsuario) {
  const { nombre, apellido, email, contrasena } = datosUsuario;

  const [usuariosExistentes] = await poolDeConexiones.query(
    "SELECT id_usuario FROM usuarios WHERE email = ? LIMIT 1",
    [email]
  );

  if (usuariosExistentes.length > 0) {
    const error = new Error("El email ingresado ya se encuentra registrado.");
    error.statusCode = 409;
    throw error;
  }

  const cantidadSaltosEncriptacion = 10;
  const contrasenaHash = await bcrypt.hash(contrasena, cantidadSaltosEncriptacion);

  const idRolUsuarioComun = 2;
  const idConsultorioPorDefecto = 1;

  const [resultadoInsercion] = await poolDeConexiones.query(
    `INSERT INTO usuarios 
      (nombre, apellido, email, contrasena_hash, id_rol, id_consultorio, activo, fecha_creacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      nombre,
      apellido,
      email,
      contrasenaHash,
      idRolUsuarioComun,
      idConsultorioPorDefecto,
      true,
    ]
  );

  return {
    id_usuario: resultadoInsercion.insertId,
    nombre,
    apellido,
    email,
    id_rol: idRolUsuarioComun,
    id_consultorio: idConsultorioPorDefecto,
    activo: true,
  };
}

// Función para iniciar sesión de un usuario
async function iniciarSesionUsuario(credencialesUsuario) {
  const { email, contrasena } = credencialesUsuario;

  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_usuario,
        nombre,
        apellido,
        email,
        contrasena_hash,
        id_rol,
        id_consultorio,
        activo
     FROM usuarios
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  if (usuariosEncontrados.length === 0) {
    const error = new Error("Email o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  const usuarioEncontrado = usuariosEncontrados[0];

  if (!usuarioEncontrado.activo) {
    const error = new Error("El usuario se encuentra inactivo.");
    error.statusCode = 403;
    throw error;
  }

  const contrasenaEsValida = await bcrypt.compare(
    contrasena,
    usuarioEncontrado.contrasena_hash
  );

  if (!contrasenaEsValida) {
    const error = new Error("Email o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  const datosParaToken = {
    id_usuario: usuarioEncontrado.id_usuario,
    email: usuarioEncontrado.email,
    id_rol: usuarioEncontrado.id_rol,
    id_consultorio: usuarioEncontrado.id_consultorio,
  };

  const token = jwt.sign(datosParaToken, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  return {
    token,
    usuario: {
      id_usuario: usuarioEncontrado.id_usuario,
      nombre: usuarioEncontrado.nombre,
      apellido: usuarioEncontrado.apellido,
      email: usuarioEncontrado.email,
      id_rol: usuarioEncontrado.id_rol,
      id_consultorio: usuarioEncontrado.id_consultorio,
      activo: usuarioEncontrado.activo,
    },
  };
}

// Función para solicitar recuperación de contraseña
async function solicitarRecuperacionContrasena(email) {
  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_usuario,
        email,
        activo
     FROM usuarios
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  if (usuariosEncontrados.length === 0) {
    return {
      mensaje:
        "Si el email existe en el sistema, se enviaron instrucciones de recuperación.",
      urlVistaPreviaEmail: null,
    };
  }

  const usuarioEncontrado = usuariosEncontrados[0];

  if (!usuarioEncontrado.activo) {
    const error = new Error("El usuario se encuentra inactivo.");
    error.statusCode = 403;
    throw error;
  }

  const tokenRecuperacion = crypto.randomBytes(32).toString("hex");

  const tokenRecuperacionHash = crypto
    .createHash("sha256")
    .update(tokenRecuperacion)
    .digest("hex");

  await poolDeConexiones.query(
    `UPDATE usuarios
     SET token_recuperacion_hash = ?,
         token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL 30 MINUTE)
     WHERE id_usuario = ?`,
    [tokenRecuperacionHash, usuarioEncontrado.id_usuario]
  );

  const enlaceRecuperacion = `http://localhost:5173/restablecer-contrasena?token=${tokenRecuperacion}`;

  const resultadoEmail = await enviarEmailRecuperacionContrasena(
    usuarioEncontrado.email,
    enlaceRecuperacion
  );

  return {
    mensaje:
      "Si el email existe en el sistema, se enviaron instrucciones de recuperación.",
    urlVistaPreviaEmail: resultadoEmail.urlVistaPrevia,
  };
}

// Función para restablecer la contraseña utilizando el token de recuperación
async function restablecerContrasena(datosRestablecimiento) {
  const { token, nuevaContrasena } = datosRestablecimiento;

  const tokenRecuperacionHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT 
        id_usuario,
        email,
        token_recuperacion_expira
     FROM usuarios
     WHERE token_recuperacion_hash = ?
       AND token_recuperacion_expira > NOW()
     LIMIT 1`,
    [tokenRecuperacionHash]
  );

  if (usuariosEncontrados.length === 0) {
    const error = new Error("El token de recuperación es inválido o expiró.");
    error.statusCode = 400;
    throw error;
  }

  const usuarioEncontrado = usuariosEncontrados[0];

  const cantidadSaltosEncriptacion = 10;

  const nuevaContrasenaHash = await bcrypt.hash(
    nuevaContrasena,
    cantidadSaltosEncriptacion
  );

  await poolDeConexiones.query(
    `UPDATE usuarios
     SET contrasena_hash = ?,
         token_recuperacion_hash = NULL,
         token_recuperacion_expira = NULL
     WHERE id_usuario = ?`,
    [nuevaContrasenaHash, usuarioEncontrado.id_usuario]
  );

  return {
    mensaje: "La contraseña fue restablecida correctamente.",
  };
}
// Función para obtener los permisos del usuario autenticado
async function obtenerPermisosUsuarioAutenticado(usuarioAutenticado) {
  const { id_rol, id_consultorio } = usuarioAutenticado;

  if (!id_rol || !id_consultorio) {
    const error = new Error(
      "No se pudo identificar el rol o consultorio del usuario."
    );
    error.statusCode = 401;
    throw error;
  }

  const [permisosEncontrados] = await poolDeConexiones.query(
    `SELECT 
        p.codigo_permiso
     FROM roles r
     INNER JOIN roles_permisos rp
       ON r.id_rol = rp.id_rol
     INNER JOIN permisos p
       ON rp.id_permiso = p.id_permiso
     WHERE r.id_rol = ?
       AND r.id_consultorio = ?
       AND r.activo = 1
       AND p.activo = 1
     ORDER BY p.id_permiso ASC`,
    [id_rol, id_consultorio]
  );

  return permisosEncontrados.map((permiso) => permiso.codigo_permiso);
}

module.exports = {
  registrarUsuario,
  iniciarSesionUsuario,
  solicitarRecuperacionContrasena,
  restablecerContrasena,
  obtenerPermisosUsuarioAutenticado,
};