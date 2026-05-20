const express = require("express");
const router = express.Router();

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
  Ruta para listar los roles del consultorio.
  El usuario debe estar autenticado y tener el permiso ver_roles.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_roles"),
  async (req, res) => {
    try {
      const idConsultorio = req.usuario.id_consultorio;

      const roles = await listarRolesDelConsultorio(idConsultorio);

      res.status(200).json({
        mensaje: "Roles obtenidos correctamente.",
        roles,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
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
    try {
      const idConsultorio = req.usuario.id_consultorio;

      const rolCreado = await crearRolDelConsultorio(req.body, idConsultorio);

      res.status(201).json({
        mensaje: "Rol creado correctamente.",
        rol: rolCreado,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
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
    try {
      const idConsultorio = req.usuario.id_consultorio;
      const idRol = req.params.id;

      const resultado = await obtenerPermisosDeRol(idRol, idConsultorio);

      res.status(200).json({
        mensaje: "Permisos del rol obtenidos correctamente.",
        rol: resultado.rol,
        permisos: resultado.permisos,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
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
    try {
      const idConsultorio = req.usuario.id_consultorio;
      const idRol = req.params.id;
      const { permisos } = req.body;

      const resultado = await actualizarPermisosDeRol(
        idRol,
        permisos,
        idConsultorio
      );

      res.status(200).json({
        mensaje: "Permisos del rol actualizados correctamente.",
        rol: resultado.rol,
        permisos: resultado.permisos,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
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
    try {
      const idConsultorio = req.usuario.id_consultorio;
      const idRol = req.params.id;

      const rolModificado = await modificarRolDelConsultorio(
        idRol,
        req.body,
        idConsultorio
      );

      res.status(200).json({
        mensaje: "Rol modificado correctamente.",
        rol: rolModificado,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
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
    try {
      const idConsultorio = req.usuario.id_consultorio;
      const idRol = req.params.id;

      const rolDesactivado = await desactivarRolDelConsultorio(
        idRol,
        idConsultorio
      );

      res.status(200).json({
        mensaje: "Rol desactivado correctamente.",
        rol: rolDesactivado,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
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
    try {
      const idConsultorio = req.usuario.id_consultorio;
      const idRol = req.params.id;

      const rolReactivado = await reactivarRolDelConsultorio(
        idRol,
        idConsultorio
      );

      res.status(200).json({
        mensaje: "Rol reactivado correctamente.",
        rol: rolReactivado,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        mensaje: error.message || "Error interno del servidor.",
      });
    }
  }
);

module.exports = router;