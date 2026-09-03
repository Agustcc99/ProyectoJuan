const express = require("express");
const router = express.Router();

const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  validarIdGasto,
  validarFiltrosListado,
  validarDatosAlta,
  validarDatosEdicion,
  validarAnulacion,
} = require("./gastos.validator");

const {
  obtenerOpciones,
  listarGastos,
  obtenerGastoPorId,
  crearGasto,
  actualizarGasto,
  anularGasto,
} = require("./gastos.service");

/*
  ABM 05 — Gastos (transaccional). Base: /api/gastos.

  Sin try/catch: los errores que lanzan los services (con .statusCode) llegan al
  errorMiddleware central registrado en app.js. Todas las rutas resuelven el
  consultorio desde req.usuario (nunca desde el body).

  La baja lógica es la anulación (`PATCH /:id/anular` con motivo): no hay
  desactivar/reactivar. El monto no se edita (PUT sólo toca tipo/imputación/
  fecha/descripción).
*/

/*
  Opciones para poblar los selectores (tipos de gasto activos + tratamientos del
  consultorio). Va antes de "/:id" para que "opciones" no se interprete como id.
*/
router.get(
  "/opciones",
  verificarToken,
  verificarPermiso("ver_gastos"),
  async (req, res) => {
    const opciones = await obtenerOpciones(req.usuario.id_consultorio);
    enviarExito(res, 200, "Opciones obtenidas correctamente.", opciones);
  }
);

/*
  Listado paginado. Query opcional: ?id_tipo_gasto= ?id_tratamiento= ?desde=
  ?hasta= ?estado=vigentes|anulados|todos ?imputacion=todos|con_tratamiento|generales
  ?orden=fecha_desc|fecha_asc ?pagina= ?porPagina=. Devuelve
  { gastos, total, pagina, porPagina, totales:{vigente,anulado} }.
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_gastos"),
  validarFiltrosListado,
  async (req, res) => {
    const resultado = await listarGastos({
      idConsultorio: req.usuario.id_consultorio,
      idTipoGasto: req.query.id_tipo_gasto
        ? Number(req.query.id_tipo_gasto)
        : null,
      idTratamiento: req.query.id_tratamiento
        ? Number(req.query.id_tratamiento)
        : null,
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      estado: req.query.estado || "vigentes",
      imputacion: req.query.imputacion || "todos",
      orden: req.query.orden || "fecha_desc",
      pagina: req.query.pagina || 1,
      porPagina: req.query.porPagina || 20,
    });

    enviarExito(res, 200, "Gastos obtenidos correctamente.", resultado);
  }
);

/*
  Detalle de un gasto + historial de auditoría.
*/
router.get(
  "/:id",
  verificarToken,
  verificarPermiso("ver_gastos"),
  validarIdGasto,
  async (req, res) => {
    const gasto = await obtenerGastoPorId(
      Number(req.params.id),
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Gasto obtenido correctamente.", { gasto });
  }
);

/*
  Alta de gasto. Acepta id_tratamiento opcional en el body (la ficha del
  tratamiento lo prefija cuando se imputa un gasto desde ahí).
*/
router.post(
  "/",
  verificarToken,
  verificarPermiso("registrar_gastos"),
  validarDatosAlta,
  async (req, res) => {
    const gasto = await crearGasto(
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 201, "Gasto registrado correctamente.", { gasto });
  }
);

/*
  Modificación acotada: id_tipo_gasto, id_tratamiento (imputación), fecha_gasto y
  descripcion. El monto no se edita (409).
*/
router.put(
  "/:id",
  verificarToken,
  verificarPermiso("editar_gastos"),
  validarIdGasto,
  validarDatosEdicion,
  async (req, res) => {
    const gasto = await actualizarGasto(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Gasto modificado correctamente.", { gasto });
  }
);

/*
  Anulación (baja lógica) con motivo obligatorio.
*/
router.patch(
  "/:id/anular",
  verificarToken,
  verificarPermiso("anular_gastos"),
  validarIdGasto,
  validarAnulacion,
  async (req, res) => {
    const gasto = await anularGasto(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Gasto anulado correctamente.", { gasto });
  }
);

module.exports = router;
