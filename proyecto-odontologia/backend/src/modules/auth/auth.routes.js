const express = require("express");
const router = express.Router();

const {
  validarDatosDeRegistro,
  validarDatosDeLogin,
  validarSolicitudRecuperacion,
  validarRestablecimientoContrasena,
} = require("./auth.validator");

const {
  registrarUsuario,
  iniciarSesionUsuario,
  solicitarRecuperacionContrasena,
  restablecerContrasena,
} = require("./auth.service");

const { verificarToken } = require("../../middlewares/authMiddleware");

// Registro de nuevo usuario
router.post("/registro", validarDatosDeRegistro, async (req, res) => {
  try {
    const usuarioRegistrado = await registrarUsuario(req.body);

    res.status(201).json({
      mensaje: "Usuario registrado correctamente.",
      usuario: usuarioRegistrado,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      mensaje: error.message || "Error interno del servidor.",
    });
  }
});

// Inicio de sesión de usuario
router.post("/login", validarDatosDeLogin, async (req, res) => {
  try {
    const resultadoLogin = await iniciarSesionUsuario(req.body);

    res.status(200).json({
      mensaje: "Inicio de sesión correcto.",
      token: resultadoLogin.token,
      usuario: resultadoLogin.usuario,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      mensaje: error.message || "Error interno del servidor.",
    });
  }
});

// Ruta protegida
router.get("/perfil", verificarToken, (req, res) => {
  res.status(200).json({
    mensaje: "Acceso autorizado a ruta protegida.",
    usuarioAutenticado: req.usuario,
  });
});

// Solicitud de recuperación de contraseña
router.post(
  "/solicitar-recuperacion",
  validarSolicitudRecuperacion,
  async (req, res) => {
    try {
      const { email } = req.body;

      const resultadoSolicitud = await solicitarRecuperacionContrasena(email);

      res.status(200).json(resultadoSolicitud);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
  }
);

// Restablecimiento de contraseña
router.post(
  "/restablecer-contrasena",
  validarRestablecimientoContrasena,
  async (req, res) => {
    try {
      const resultadoRestablecimiento = await restablecerContrasena(req.body);

      res.status(200).json(resultadoRestablecimiento);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
  }
);

module.exports = router;