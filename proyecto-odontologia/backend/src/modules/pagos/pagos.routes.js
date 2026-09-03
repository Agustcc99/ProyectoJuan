const express = require("express");
const router = express.Router();

const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const {
  validarIdPago,
  validarFiltrosListado,
  validarDatosAlta,
  validarDatosEdicion,
  validarAnulacion,
} = require("./pagos.validator");

const {
  obtenerOpciones,
  listarPagos,
  obtenerPagoPorId,
  crearPago,
  actualizarPago,
  anularPago,
} = require("./pagos.service");

/*
  ABM 04 — Pagos (transaccional). Base: /api/pagos.

  Sin try/catch: los errores que lanzan los services (con .statusCode) llegan al
  errorMiddleware central registrado en app.js. Todas las rutas resuelven el
  consultorio desde req.usuario (nunca desde el body).

  La baja lógica es la anulación (`PATCH /:id/anular` con motivo): no hay
  desactivar/reactivar. El monto no se edita (PUT sólo toca medio/fecha/notas).
*/

/*
  Opciones para poblar los selectores (medios de pago activos). Va antes de
  "/:id" para que "opciones" no se interprete como un id.
*/
router.get(
  "/opciones",
  verificarToken,
  verificarPermiso("ver_pagos"),
  async (req, res) => {
    const opciones = await obtenerOpciones();
    enviarExito(res, 200, "Opciones obtenidas correctamente.", opciones);
  }
);

/*
  Listado paginado (vista «caja»). Query opcional: ?id_tratamiento= ?id_medio_pago=
  ?desde= ?hasta= ?estado=vigentes|anulados|todos ?orden=fecha_desc|fecha_asc
  ?pagina= ?porPagina=. Cuando se filtra por ?id_tratamiento= agrega `resumen`
  (precio, total pagado, saldo).
*/
router.get(
  "/",
  verificarToken,
  verificarPermiso("ver_pagos"),
  validarFiltrosListado,
  async (req, res) => {
    const resultado = await listarPagos({
      idConsultorio: req.usuario.id_consultorio,
      idTratamiento: req.query.id_tratamiento
        ? Number(req.query.id_tratamiento)
        : null,
      idMedioPago: req.query.id_medio_pago
        ? Number(req.query.id_medio_pago)
        : null,
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      estado: req.query.estado || "vigentes",
      orden: req.query.orden || "fecha_desc",
      pagina: req.query.pagina || 1,
      porPagina: req.query.porPagina || 20,
    });

    enviarExito(res, 200, "Pagos obtenidos correctamente.", resultado);
  }
);

/*
  Detalle de un pago + historial de auditoría.
*/
router.get(
  "/:id",
  verificarToken,
  verificarPermiso("ver_pagos"),
  validarIdPago,
  async (req, res) => {
    const pago = await obtenerPagoPorId(
      Number(req.params.id),
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Pago obtenido correctamente.", { pago });
  }
);

/*
  Alta de pago contra un tratamiento. Acepta id_tratamiento en el body (la ficha
  del tratamiento lo prefija). Devuelve { pago, advertencia? } (sobrepago).
*/
router.post(
  "/",
  verificarToken,
  verificarPermiso("registrar_pagos"),
  validarDatosAlta,
  async (req, res) => {
    const { pago, advertencia } = await crearPago(
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    const datos = advertencia ? { pago, advertencia } : { pago };
    enviarExito(res, 201, "Pago registrado correctamente.", datos);
  }
);

/*
  Modificación acotada: sólo id_medio_pago, fecha_pago y notas. El monto no se
  edita (409).
*/
router.put(
  "/:id",
  verificarToken,
  verificarPermiso("editar_pagos"),
  validarIdPago,
  validarDatosEdicion,
  async (req, res) => {
    const pago = await actualizarPago(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Pago modificado correctamente.", { pago });
  }
);

/*
  Anulación (baja lógica) con motivo obligatorio.
*/
router.patch(
  "/:id/anular",
  verificarToken,
  verificarPermiso("anular_pagos"),
  validarIdPago,
  validarAnulacion,
  async (req, res) => {
    const pago = await anularPago(
      Number(req.params.id),
      req.body,
      req.usuario.id_usuario,
      req.usuario.id_consultorio
    );

    enviarExito(res, 200, "Pago anulado correctamente.", { pago });
  }
);

module.exports = router;
