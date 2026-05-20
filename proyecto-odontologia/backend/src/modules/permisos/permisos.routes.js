const express = require("express");
const router = express.Router();

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
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("asignar_permisos"),
  async (req, res) => {
    try {
      const permisos = await listarPermisosActivos();

      res.status(200).json({
        mensaje: "Permisos obtenidos correctamente.",
        permisos,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
  }
);

module.exports = router;