const express = require("express");
const router = express.Router();

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  listarUsuariosDelConsultorio,
  actualizarRolDeUsuario,
} = require("./usuarios.service");

/*
  Ruta para listar los usuarios del consultorio autenticado.
  El usuario debe tener el permiso ver_usuarios.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_usuarios"),
  async (req, res) => {
    try {
      const idConsultorio = req.usuario.id_consultorio;

      const usuarios = await listarUsuariosDelConsultorio(idConsultorio);

      res.status(200).json({
        mensaje: "Usuarios obtenidos correctamente.",
        usuarios,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
  }
);

/*
  Ruta para modificar el rol asignado a un usuario.
  El usuario debe tener el permiso asignar_roles_usuarios.
*/
router.put(
  "/:id/rol",
  verificarToken,
  verificarPermiso("asignar_roles_usuarios"),
  async (req, res) => {
    try {
      const idConsultorio = req.usuario.id_consultorio;
      const idUsuario = req.params.id;
      const { id_rol } = req.body;

      const usuarioActualizado = await actualizarRolDeUsuario(
        idUsuario,
        id_rol,
        idConsultorio
      );

      res.status(200).json({
        mensaje: "Rol del usuario actualizado correctamente.",
        usuario: usuarioActualizado,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
  }
);

module.exports = router;