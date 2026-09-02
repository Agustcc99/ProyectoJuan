const express = require("express");
const router = express.Router();

// FIX HT3 (AUD-04): formato de respuesta centralizado.
const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  listarUsuariosDelConsultorio,
  actualizarRolDeUsuario,
  aprobarUsuarioPendiente,
} = require("./usuarios.service");

/*
  FIX HT3 (AUD-04): se eliminaron los bloques try/catch repetidos en cada ruta.
  Los errores lanzados por los services llegan al middleware centralizado de
  errores registrado al final de la cadena en app.js.
*/

/*
  Ruta para listar los usuarios del consultorio autenticado.
  El usuario debe tener el permiso ver_usuarios.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_usuarios"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;

    const usuarios = await listarUsuariosDelConsultorio(idConsultorio);

    enviarExito(res, 200, "Usuarios obtenidos correctamente.", { usuarios });
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
    const idConsultorio = req.usuario.id_consultorio;
    const idUsuario = req.params.id;
    const { id_rol } = req.body;

    const usuarioActualizado = await actualizarRolDeUsuario(
      idUsuario,
      id_rol,
      idConsultorio
    );

    enviarExito(res, 200, "Rol del usuario actualizado correctamente.", {
      usuario: usuarioActualizado,
    });
  }
);

/*
  Ruta para aprobar a un usuario pendiente (registrado públicamente) y asignarle
  su rol definitivo dentro del consultorio del administrador autenticado.

  FIX HT7 (AUD-09): reutiliza el permiso asignar_roles_usuarios en lugar de crear
  uno nuevo -aprobar es, en la práctica, la primera asignación de rol de ese
  usuario- y activa la cuenta en el mismo paso.
*/
router.patch(
  "/:id/aprobar",
  verificarToken,
  verificarPermiso("asignar_roles_usuarios"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;
    const idUsuario = req.params.id;
    const { id_rol } = req.body;

    const usuarioAprobado = await aprobarUsuarioPendiente(
      idUsuario,
      id_rol,
      idConsultorio
    );

    enviarExito(res, 200, "Usuario aprobado y rol asignado correctamente.", {
      usuario: usuarioAprobado,
    });
  }
);

module.exports = router;
