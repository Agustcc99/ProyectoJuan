const jwt = require("jsonwebtoken");

const { poolDeConexiones } = require("../config/db");

// FIX HT3 (AUD-04): respuestas de autenticación/autorización con formato uniforme.
const { enviarError } = require("../utils/response");

/*
  FIX HT1 (AUD-01): obtiene el estado vigente del usuario desde la base de datos.
  El token JWT conserva el id_rol que tenía el usuario al momento del login, por lo
  que no puede usarse como fuente de verdad del rol durante la sesión activa.
*/
async function obtenerEstadoVigenteDelUsuario(idUsuario) {
  const [usuariosEncontrados] = await poolDeConexiones.query(
    `SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.id_rol,
        u.id_consultorio,
        u.activo,
        r.nombre_rol
     FROM usuarios u
     LEFT JOIN roles r
       ON u.id_rol = r.id_rol
      AND r.id_consultorio = u.id_consultorio
     WHERE u.id_usuario = ?
     LIMIT 1`,
    [idUsuario]
  );

  if (usuariosEncontrados.length === 0) {
    return null;
  }

  return usuariosEncontrados[0];
}

/*
  Verifica que la petición tenga un token JWT válido.
  Si el token es correcto, guarda los datos del usuario autenticado en req.usuario.

  FIX HT1 (AUD-01): el rol y el consultorio ya no se toman del token, sino que se
  releen de la base de datos en cada petición autenticada. Este es el único punto
  de invalidación necesario: cubre de una sola vez las rutas de roles, permisos y
  usuarios, porque todas pasan por este middleware.
*/
async function verificarToken(req, res, next) {
  const encabezadoAutorizacion = req.headers.authorization;

  if (!encabezadoAutorizacion) {
    return enviarError(res, 401, "No se envió token de autenticación.");
  }

  const partesEncabezado = encabezadoAutorizacion.split(" ");

  if (partesEncabezado.length !== 2 || partesEncabezado[0] !== "Bearer") {
    return enviarError(
      res,
      401,
      "Formato de token inválido. Debe enviarse como Bearer token."
    );
  }

  const token = partesEncabezado[1];

  let datosDecodificados;

  try {
    datosDecodificados = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Error verificando JWT token:", error);
    return enviarError(res, 401, "Token inválido o expirado.");
  }

  try {
    // FIX HT1: se descartan id_rol e id_consultorio del token y se usan los vigentes.
    const usuarioVigente = await obtenerEstadoVigenteDelUsuario(
      datosDecodificados.id_usuario
    );

    if (!usuarioVigente) {
      return enviarError(
        res,
        401,
        "La sesión ya no es válida. Iniciá sesión nuevamente."
      );
    }

    if (!usuarioVigente.activo) {
      return enviarError(res, 401, "El usuario se encuentra inactivo.");
    }

    req.usuario = {
      id_usuario: usuarioVigente.id_usuario,
      nombre: usuarioVigente.nombre,
      apellido: usuarioVigente.apellido,
      email: usuarioVigente.email,
      id_rol: usuarioVigente.id_rol,
      id_consultorio: usuarioVigente.id_consultorio,
      nombre_rol: usuarioVigente.nombre_rol,
      activo: usuarioVigente.activo,
    };

    next();
  } catch (error) {
    // FIX HT3: los fallos inesperados se delegan al middleware central de errores.
    return next(error);
  }
}

/*
  Verifica que el rol del usuario autenticado tenga asignado un permiso específico.
  Este middleware consulta la tabla roles_permisos y valida el permiso usando su código.

  FIX HT1: al recibir req.usuario con el rol vigente (y no el del token), un cambio
  de rol o de permisos impacta en la siguiente petición del usuario.
*/
function verificarPermiso(codigoPermisoRequerido) {
  return async function (req, res, next) {
    try {
      if (!req.usuario) {
        return enviarError(res, 401, "Usuario no autenticado.");
      }

      const { id_rol, id_consultorio } = req.usuario;

      const [permisosEncontrados] = await poolDeConexiones.query(
        `SELECT
            p.id_permiso,
            p.codigo_permiso
         FROM roles r
         INNER JOIN roles_permisos rp
           ON r.id_rol = rp.id_rol
         INNER JOIN permisos p
           ON rp.id_permiso = p.id_permiso
         WHERE r.id_rol = ?
           AND r.id_consultorio = ?
           AND r.activo = 1
           AND p.codigo_permiso = ?
           AND p.activo = 1
         LIMIT 1`,
        [id_rol, id_consultorio, codigoPermisoRequerido]
      );

      if (permisosEncontrados.length === 0) {
        return enviarError(
          res,
          403,
          "No tenés permisos para realizar esta acción."
        );
      }

      next();
    } catch (error) {
      // FIX HT3: se delega en el middleware central en lugar de exponer error.message.
      return next(error);
    }
  };
}

module.exports = {
  verificarToken,
  verificarPermiso,
  obtenerEstadoVigenteDelUsuario,
};
