const express = require("express");
const router = express.Router();

const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  validarDatosPaciente,
  validarIdPaciente,
  validarFiltrosListado,
} = require("./pacientes.validator");

const {
  listarPacientes,
  obtenerPacientePorId,
  crearPaciente,
  actualizarPaciente,
  desactivarPaciente,
  reactivarPaciente,
} = require("./pacientes.service");

/*
  ABM 02 — Pacientes. Base: /api/pacientes.

  Sin try/catch: los errores que lanzan los services (con .statusCode) llegan al
  errorMiddleware central registrado en app.js. Todas las rutas resuelven el
  consultorio desde req.usuario (nunca desde el body).
*/

/*
  Listado paginado. Query opcional: ?busqueda= ?estado=activos|inactivos|todos
  ?pagina= ?porPagina=.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_pacientes"),
  validarFiltrosListado,
  async (req, res) => {
    const resultado = await listarPacientes({
      idConsultorio: req.usuario.id_consultorio,
      busqueda: req.query.busqueda || "",
      estado: req.query.estado || "todos",
      pagina: req.query.pagina || 1,
      porPagina: req.query.porPagina || 20,
    });

    enviarExito(res, 200, "Pacientes obtenidos correctamente.", resultado);
  }
);

/*
  Detalle de un paciente + contador de tratamientos.
*/
router.get(
  "/:id",
  verificarToken,
  verificarPermiso("ver_pacientes"),
  validarIdPaciente,
  async (req, res) => {
    const paciente = await obtenerPacientePorId(
      Number(req.params.id),
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Paciente obtenido correctamente.", { paciente });
  }
);

/*
  Alta de paciente.
*/
router.post(
  "/",
  verificarToken,
  verificarPermiso("crear_pacientes"),
  validarDatosPaciente,
  async (req, res) => {
    const paciente = await crearPaciente(
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 201, "Paciente creado correctamente.", { paciente });
  }
);

/*
  Modificación de la ficha del paciente.
*/
router.put(
  "/:id",
  verificarToken,
  verificarPermiso("editar_pacientes"),
  validarIdPaciente,
  validarDatosPaciente,
  async (req, res) => {
    const paciente = await actualizarPaciente(
      Number(req.params.id),
      req.body,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Paciente modificado correctamente.", { paciente });
  }
);

/*
  Baja lógica de la ficha del paciente.
*/
router.patch(
  "/:id/desactivar",
  verificarToken,
  verificarPermiso("desactivar_pacientes"),
  validarIdPaciente,
  async (req, res) => {
    const resultado = await desactivarPaciente(
      Number(req.params.id),
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Paciente desactivado correctamente.", resultado);
  }
);

/*
  Reactivación de una ficha dada de baja.
*/
router.patch(
  "/:id/reactivar",
  verificarToken,
  verificarPermiso("reactivar_pacientes"),
  validarIdPaciente,
  async (req, res) => {
    const resultado = await reactivarPaciente(
      Number(req.params.id),
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Paciente reactivado correctamente.", resultado);
  }
);

module.exports = router;
