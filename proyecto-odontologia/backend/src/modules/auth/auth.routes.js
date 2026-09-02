const express = require("express");
const router = express.Router();

// FIX HT3 (AUD-04): formato de respuesta centralizado.
const { enviarExito } = require("../../utils/response");

const {
  validarDatosDeRegistro,
  validarDatosDeLogin,
  validarSolicitudRecuperacion,
  validarRestablecimientoContrasena,
} = require("./auth.validator");

const {
  registrarUsuario,
  iniciarSesionUsuario,
  obtenerSesionUsuarioAutenticado,
  solicitarRecuperacionContrasena,
  restablecerContrasena,
} = require("./auth.service");

const { verificarToken } = require("../../middlewares/authMiddleware");

// FIX HT9 (AUD-11): rate limiting sobre los endpoints sensibles a fuerza bruta.
const {
  limitadorLogin,
  limitadorRecuperacion,
} = require("../../middlewares/rateLimitMiddleware");

/*
  FIX HT3 (AUD-04): se eliminaron los bloques try/catch repetidos en cada ruta.
  Al ser handlers async, Express 5 reenvía automáticamente cualquier promesa
  rechazada al middleware de errores centralizado registrado en app.js.
*/

// Registro de nuevo usuario
router.post("/registro", validarDatosDeRegistro, async (req, res) => {
  const usuarioRegistrado = await registrarUsuario(req.body);

  /*
    FIX HT7 (AUD-09): el mensaje deja en claro que la cuenta no tiene acceso
    todavía. Antes decía "registrado correctamente", que sugería acceso inmediato.
  */
  enviarExito(
    res,
    201,
    "Registro recibido. Tu cuenta quedará pendiente hasta que un administrador la apruebe.",
    { usuario: usuarioRegistrado }
  );
});

/*
  Inicio de sesión de usuario.
  FIX HT9 (AUD-11) - Criterio 1: limitadorLogin corta la fuerza bruta contra
  contraseñas antes de que la petición llegue a validar o consultar la base.
*/
router.post("/login", limitadorLogin, validarDatosDeLogin, async (req, res) => {
  const resultadoLogin = await iniciarSesionUsuario(req.body);

  enviarExito(res, 200, "Inicio de sesión correcto.", {
    token: resultadoLogin.token,
    usuario: resultadoLogin.usuario,
  });
});

// Ruta protegida para probar el JWT
router.get("/perfil", verificarToken, (req, res) => {
  enviarExito(res, 200, "Acceso autorizado a ruta protegida.", {
    usuarioAutenticado: req.usuario,
  });
});

/*
  Obtener permisos del usuario autenticado.

  FIX HT1 (AUD-01): además de los permisos vigentes devuelve el usuario con su rol
  actual y un token renovado. Es el endpoint que el frontend consulta al navegar y
  de forma periódica para invalidar permisos/rol sin cerrar sesión.
  Se mantiene la clave "permisos" para no romper a los consumidores existentes.
*/
router.get("/permisos", verificarToken, async (req, res) => {
  const sesion = await obtenerSesionUsuarioAutenticado(req.usuario);

  enviarExito(res, 200, "Permisos del usuario obtenidos correctamente.", {
    permisos: sesion.permisos,
    usuario: sesion.usuario,
    token: sesion.token,
  });
});

/*
  Solicitud de recuperación de contraseña.
  FIX HT9 (AUD-11) - Criterio 1: limitadorRecuperacion evita que se pueda usar
  este endpoint para enumerar emails registrados o para spamear la casilla de
  un usuario con correos de recuperación.
*/
router.post(
  "/solicitar-recuperacion",
  limitadorRecuperacion,
  validarSolicitudRecuperacion,
  async (req, res) => {
    const { email } = req.body;

    const resultadoSolicitud = await solicitarRecuperacionContrasena(email);

    enviarExito(res, 200, resultadoSolicitud.mensaje, {
      urlVistaPreviaEmail: resultadoSolicitud.urlVistaPreviaEmail,
    });
  }
);

// Restablecimiento de contraseña
router.post(
  "/restablecer-contrasena",
  validarRestablecimientoContrasena,
  async (req, res) => {
    const resultadoRestablecimiento = await restablecerContrasena(req.body);

    enviarExito(res, 200, resultadoRestablecimiento.mensaje);
  }
);

module.exports = router;
