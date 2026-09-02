const express = require("express");
const router = express.Router();

// FIX HT3 (AUD-04): formato de respuesta centralizado.
const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  listarPermisosActivos,
} = require("./permisos.service");

/*
  Ruta para listar los permisos activos del sistema.
  El usuario debe estar autenticado y tener el permiso asignar_permisos.

  FIX HT3 (AUD-04): se eliminó el try/catch manual. El error viaja al middleware
  centralizado registrado al final de la cadena en app.js.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("asignar_permisos"),
  async (req, res) => {
    const permisos = await listarPermisosActivos();

    enviarExito(res, 200, "Permisos obtenidos correctamente.", { permisos });
  }
);

module.exports = router;
