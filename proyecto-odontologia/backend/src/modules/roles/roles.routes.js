const express = require("express");
const router = express.Router();

// FIX HT3 (AUD-04): formato de respuesta centralizado.
const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  listarRolesDelConsultorio,
  crearRolDelConsultorio,
  modificarRolDelConsultorio,
  desactivarRolDelConsultorio,
  reactivarRolDelConsultorio,
  obtenerPermisosDeRol,
  actualizarPermisosDeRol,
} = require("./roles.service");

/*
  FIX HT3 (AUD-04): se eliminaron los bloques try/catch repetidos en cada ruta.
  Los errores lanzados por los services llegan al middleware centralizado de
  errores registrado al final de la cadena en app.js.
*/

/*
  Ruta para listar los roles del consultorio.
  El usuario debe estar autenticado y tener el permiso ver_roles.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_roles"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;

    const roles = await listarRolesDelConsultorio(idConsultorio);

    enviarExito(res, 200, "Roles obtenidos correctamente.", { roles });
  }
);

/*
  Ruta para crear un rol.
  El usuario debe tener el permiso crear_roles.
*/
router.post(
  "/",
  verificarToken,
  verificarPermiso("crear_roles"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;

    const rolCreado = await crearRolDelConsultorio(req.body, idConsultorio);

    enviarExito(res, 201, "Rol creado correctamente.", { rol: rolCreado });
  }
);

/*
  Ruta para consultar los permisos asignados a un rol.
  Devuelve todos los permisos activos e indica cuáles están asignados.
  El usuario debe tener el permiso asignar_permisos.
*/
router.get(
  "/:id/permisos",
  verificarToken,
  verificarPermiso("asignar_permisos"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;
    const idRol = req.params.id;

    const resultado = await obtenerPermisosDeRol(idRol, idConsultorio);

    enviarExito(res, 200, "Permisos del rol obtenidos correctamente.", {
      rol: resultado.rol,
      permisos: resultado.permisos,
    });
  }
);

/*
  Ruta para actualizar los permisos asignados a un rol.
  Recibe un arreglo con los id_permiso que deben quedar asociados al rol.
  El usuario debe tener el permiso asignar_permisos.
*/
router.put(
  "/:id/permisos",
  verificarToken,
  verificarPermiso("asignar_permisos"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;
    const idRol = req.params.id;
    const { permisos } = req.body;

    const resultado = await actualizarPermisosDeRol(
      idRol,
      permisos,
      idConsultorio
    );

    enviarExito(res, 200, "Permisos del rol actualizados correctamente.", {
      rol: resultado.rol,
      permisos: resultado.permisos,
    });
  }
);

/*
  Ruta para modificar un rol existente.
  El usuario debe tener el permiso editar_roles.
*/
router.put(
  "/:id",
  verificarToken,
  verificarPermiso("editar_roles"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;
    const idRol = req.params.id;

    const rolModificado = await modificarRolDelConsultorio(
      idRol,
      req.body,
      idConsultorio
    );

    enviarExito(res, 200, "Rol modificado correctamente.", {
      rol: rolModificado,
    });
  }
);

/*
  Ruta para desactivar un rol.
  Realiza una baja lógica, no elimina el registro de la base de datos.
  El usuario debe tener el permiso desactivar_roles.
*/
router.patch(
  "/:id/desactivar",
  verificarToken,
  verificarPermiso("desactivar_roles"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;
    const idRol = req.params.id;

    const rolDesactivado = await desactivarRolDelConsultorio(
      idRol,
      idConsultorio
    );

    enviarExito(res, 200, "Rol desactivado correctamente.", {
      rol: rolDesactivado,
    });
  }
);

/*
  Ruta para reactivar un rol.
  Permite volver a activar un rol dado de baja lógicamente.
  El usuario debe tener el permiso reactivar_roles.
*/
router.patch(
  "/:id/reactivar",
  verificarToken,
  verificarPermiso("reactivar_roles"),
  async (req, res) => {
    const idConsultorio = req.usuario.id_consultorio;
    const idRol = req.params.id;

    const rolReactivado = await reactivarRolDelConsultorio(
      idRol,
      idConsultorio
    );

    enviarExito(res, 200, "Rol reactivado correctamente.", {
      rol: rolReactivado,
    });
  }
);

module.exports = router;
