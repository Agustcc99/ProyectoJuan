const jwt = require("jsonwebtoken");

const { poolDeConexiones } = require("../config/db");

/*
  Verifica que la petición tenga un token JWT válido.
  Si el token es correcto, guarda los datos del usuario autenticado en req.usuario.
*/
function verificarToken(req, res, next) {
  const encabezadoAutorizacion = req.headers.authorization;

  if (!encabezadoAutorizacion) {
    return res.status(401).json({
      mensaje: "No se envió token de autenticación.",
    });
  }

  const partesEncabezado = encabezadoAutorizacion.split(" ");

  if (partesEncabezado.length !== 2 || partesEncabezado[0] !== "Bearer") {
    return res.status(401).json({
      mensaje: "Formato de token inválido. Debe enviarse como Bearer token.",
    });
  }

  const token = partesEncabezado[1];

  try {
    const datosDecodificados = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = datosDecodificados;

    next();
  } catch (error) {
    console.error("Error verificando JWT token:", error);
    return res.status(401).json({
      mensaje: "Token inválido o expirado.",
      error: error.message,
    });
  }
}

/*
  Verifica que el rol del usuario autenticado tenga asignado un permiso específico.
  Este middleware consulta la tabla roles_permisos y valida el permiso usando su código.
*/
function verificarPermiso(codigoPermisoRequerido) {
  return async function (req, res, next) {
    try {
      if (!req.usuario) {
        return res.status(401).json({
          mensaje: "Usuario no autenticado.",
        });
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
        return res.status(403).json({
          mensaje: "No tenés permisos para realizar esta acción.",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        mensaje: "Error al verificar permisos del usuario.",
        error: error.message,
      });
    }
  };
}

module.exports = {
  verificarToken,
  verificarPermiso,
};