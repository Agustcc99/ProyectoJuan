const express = require("express");
const router = express.Router();

const { enviarExito } = require("../../utils/response");

const {
  verificarToken,
  verificarPermiso,
} = require("../../middlewares/authMiddleware");

const { validarRango, validarAnio } = require("./reportes.validator");

const {
  obtenerResumen,
  obtenerIngresosPorTipo,
  obtenerIngresosPorMedio,
  obtenerEgresosPorTipo,
  obtenerPendientes,
  obtenerMensual,
} = require("./reportes.service");

/*
  Módulo 06 — Reportes (CONSUMO, no es un ABM). Base: /api/reportes.

  Todas las rutas son GET y de solo lectura, protegidas por
  verificarToken + verificarPermiso("ver_reportes") (permiso ya sembrado).
  El consultorio se resuelve siempre desde req.usuario, nunca desde la query.
  Sin try/catch: los errores que lanzan los services (con .statusCode) llegan al
  errorMiddleware central de app.js.
*/

/*
  Resumen del período: ingresos, egresos, resultado neto y cantidad de
  tratamientos por estado. ?desde=&hasta= opcionales (default: mes actual).
*/
router.get(
  "/resumen",
  verificarToken,
  verificarPermiso("ver_reportes"),
  validarRango,
  async (req, res) => {
    const resumen = await obtenerResumen(req.usuario.id_consultorio, {
      desde: req.query.desde,
      hasta: req.query.hasta,
    });

    enviarExito(res, 200, "Resumen del período obtenido correctamente.", resumen);
  }
);

/*
  Ingresos agrupados por tipo de práctica (qué práctica deja más).
*/
router.get(
  "/ingresos-por-tipo",
  verificarToken,
  verificarPermiso("ver_reportes"),
  validarRango,
  async (req, res) => {
    const datos = await obtenerIngresosPorTipo(req.usuario.id_consultorio, {
      desde: req.query.desde,
      hasta: req.query.hasta,
    });

    enviarExito(res, 200, "Ingresos por tipo de práctica obtenidos correctamente.", datos);
  }
);

/*
  Cobros agrupados por medio de pago (arqueo de caja).
*/
router.get(
  "/ingresos-por-medio",
  verificarToken,
  verificarPermiso("ver_reportes"),
  validarRango,
  async (req, res) => {
    const datos = await obtenerIngresosPorMedio(req.usuario.id_consultorio, {
      desde: req.query.desde,
      hasta: req.query.hasta,
    });

    enviarExito(res, 200, "Arqueo por medio de pago obtenido correctamente.", datos);
  }
);

/*
  Gastos agrupados por tipo de gasto.
*/
router.get(
  "/egresos-por-tipo",
  verificarToken,
  verificarPermiso("ver_reportes"),
  validarRango,
  async (req, res) => {
    const datos = await obtenerEgresosPorTipo(req.usuario.id_consultorio, {
      desde: req.query.desde,
      hasta: req.query.hasta,
    });

    enviarExito(res, 200, "Egresos por tipo de gasto obtenidos correctamente.", datos);
  }
);

/*
  Tratamientos con saldo pendiente (> 0). No depende del rango de fechas.
*/
router.get(
  "/pendientes",
  verificarToken,
  verificarPermiso("ver_reportes"),
  async (req, res) => {
    const datos = await obtenerPendientes(req.usuario.id_consultorio);

    enviarExito(res, 200, "Pendientes de cobro obtenidos correctamente.", datos);
  }
);

/*
  Serie mensual (12 meses) de un año: ingresos, egresos y neto. ?anio= opcional
  (default: año actual).
*/
router.get(
  "/mensual",
  verificarToken,
  verificarPermiso("ver_reportes"),
  validarAnio,
  async (req, res) => {
    const datos = await obtenerMensual(req.usuario.id_consultorio, {
      anio: req.query.anio,
    });

    enviarExito(res, 200, "Vista mensual obtenida correctamente.", datos);
  }
);

module.exports = router;
