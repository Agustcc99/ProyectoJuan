const { enviarError } = require("../../utils/response");

/*
  Módulo 06 — Reportes. Validación de FORMATO de los query params (no hay body:
  todo es GET). Cada middleware arma un arreglo `errores` y, si hay alguno, corta
  la cadena con el formato uniforme:
  enviarError(res, 400, "Los datos enviados no son válidos.", errores).

  Reglas de negocio (aislamiento por consultorio, exclusión de anulados, rango
  por defecto = mes actual) viven en reportes.service.js.
*/

const ANIO_MINIMO = 2000;
const ANIO_MAXIMO = 2100;

function esFechaValida(valor) {
  if (typeof valor !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00`);
  return !Number.isNaN(fecha.getTime()) && valor === fecha.toISOString().slice(0, 10);
}

/*
  Valida ?desde= y ?hasta= (ambos opcionales, YYYY-MM-DD). Si vienen los dos,
  `hasta` no puede ser anterior a `desde`.
*/
function validarRango(req, res, next) {
  const { desde, hasta } = req.query;
  const errores = [];

  const tieneDesde = desde !== undefined && desde !== "";
  const tieneHasta = hasta !== undefined && hasta !== "";

  if (tieneDesde && !esFechaValida(desde)) {
    errores.push("El parámetro «desde» no es una fecha válida (YYYY-MM-DD).");
  }

  if (tieneHasta && !esFechaValida(hasta)) {
    errores.push("El parámetro «hasta» no es una fecha válida (YYYY-MM-DD).");
  }

  if (
    tieneDesde && esFechaValida(desde) &&
    tieneHasta && esFechaValida(hasta) &&
    hasta < desde
  ) {
    errores.push("El parámetro «hasta» no puede ser anterior a «desde».");
  }

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida ?anio= (opcional, entero entre 2000 y 2100).
*/
function validarAnio(req, res, next) {
  const { anio } = req.query;

  if (anio === undefined || anio === "") {
    return next();
  }

  const numero = Number(anio);
  if (
    !Number.isInteger(numero) ||
    numero < ANIO_MINIMO ||
    numero > ANIO_MAXIMO
  ) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", [
      `El parámetro «anio» debe ser un año entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.`,
    ]);
  }

  next();
}

module.exports = {
  validarRango,
  validarAnio,
};
