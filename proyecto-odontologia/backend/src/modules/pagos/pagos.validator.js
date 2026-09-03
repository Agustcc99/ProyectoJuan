const { enviarError } = require("../../utils/response");
const {
  ORDENES_VALIDOS,
  ESTADOS_FILTRO,
  MOTIVO_ANULACION_MIN,
} = require("./pagos.service");

/*
  ABM 04 — Pagos. Validación de FORMATO (no de negocio).

  Cada middleware arma un array `errores` y, si hay alguno, corta la cadena con
  el formato uniforme: enviarError(res, 400, "Los datos enviados no son válidos.", errores).
  Las reglas de negocio (tratamiento no cancelado, medio activo, sobrepago,
  monto inmutable, etc.) viven en pagos.service.js.
*/

const LIMITES = {
  monto: { max: 99999999.99 },
  notas: { max: 2000 },
  motivo: { min: MOTIVO_ANULACION_MIN, max: 255 },
};

function esEnteroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
}

function esFechaValida(valor) {
  if (typeof valor !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(valor)) return false;
  const fecha = new Date(valor);
  return !Number.isNaN(fecha.getTime());
}

function validarTextoOpcional(valor, etiqueta, maximo, errores) {
  if (valor === undefined || valor === null || valor === "") return;
  if (typeof valor !== "string") {
    errores.push(`${etiqueta} debe ser un texto.`);
  } else if (valor.trim().length > maximo) {
    errores.push(`${etiqueta} no puede superar los ${maximo} caracteres.`);
  }
}

function validarMonto(valor, errores, { obligatorio }) {
  if (valor === undefined || valor === null || valor === "") {
    if (obligatorio) errores.push("El monto es obligatorio.");
    return;
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    errores.push("El monto debe ser un número.");
  } else if (numero <= 0) {
    errores.push("El monto debe ser mayor a cero.");
  } else if (numero > LIMITES.monto.max) {
    errores.push("El monto supera el máximo permitido.");
  }
}

/*
  Valida que :id sea un entero positivo.
*/
function validarIdPago(req, res, next) {
  if (!esEnteroPositivo(req.params.id)) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", [
      "El identificador del pago no es válido.",
    ]);
  }
  next();
}

/*
  Valida los query params del listado. Todos opcionales.
*/
function validarFiltrosListado(req, res, next) {
  const { id_tratamiento, id_medio_pago, estado, orden, desde, hasta, pagina, porPagina } =
    req.query;
  const errores = [];

  for (const [clave, valor] of [
    ["id_tratamiento", id_tratamiento],
    ["id_medio_pago", id_medio_pago],
  ]) {
    if (valor !== undefined && valor !== "" && !esEnteroPositivo(valor)) {
      errores.push(`El filtro ${clave} debe ser un entero positivo.`);
    }
  }

  if (estado !== undefined && estado !== "" && !ESTADOS_FILTRO.includes(estado)) {
    errores.push(`El filtro estado debe ser uno de: ${ESTADOS_FILTRO.join(", ")}.`);
  }

  if (orden !== undefined && orden !== "" && !ORDENES_VALIDOS.includes(orden)) {
    errores.push(`El orden debe ser uno de: ${ORDENES_VALIDOS.join(", ")}.`);
  }

  if (desde !== undefined && desde !== "" && !esFechaValida(desde)) {
    errores.push("El parámetro «desde» no es una fecha válida (YYYY-MM-DD).");
  }

  if (hasta !== undefined && hasta !== "" && !esFechaValida(hasta)) {
    errores.push("El parámetro «hasta» no es una fecha válida (YYYY-MM-DD).");
  }

  if (
    desde !== undefined && desde !== "" && esFechaValida(desde) &&
    hasta !== undefined && hasta !== "" && esFechaValida(hasta) &&
    hasta < desde
  ) {
    errores.push("El parámetro «hasta» no puede ser anterior a «desde».");
  }

  if (pagina !== undefined) {
    const numeroPagina = Number(pagina);
    if (!Number.isInteger(numeroPagina) || numeroPagina <= 0) {
      errores.push("El número de página debe ser un entero positivo.");
    }
  }

  if (porPagina !== undefined) {
    const numeroPorPagina = Number(porPagina);
    if (
      !Number.isInteger(numeroPorPagina) ||
      numeroPorPagina <= 0 ||
      numeroPorPagina > 100
    ) {
      errores.push("La cantidad por página debe ser un entero entre 1 y 100.");
    }
  }

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida el cuerpo del alta de pago.
*/
function validarDatosAlta(req, res, next) {
  const { id_tratamiento, id_medio_pago, monto, fecha_pago, notas } = req.body || {};

  const errores = [];

  if (!esEnteroPositivo(id_tratamiento)) {
    errores.push("El tratamiento es obligatorio.");
  }

  if (!esEnteroPositivo(id_medio_pago)) {
    errores.push("El medio de pago es obligatorio.");
  }

  validarMonto(monto, errores, { obligatorio: true });

  if (fecha_pago !== undefined && fecha_pago !== null && fecha_pago !== "") {
    if (!esFechaValida(fecha_pago)) {
      errores.push("La fecha del pago no es válida (YYYY-MM-DD).");
    }
  }

  validarTextoOpcional(notas, "Las notas", LIMITES.notas.max, errores);

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida el cuerpo de la modificación acotada. Todos los campos son opcionales a
  nivel formato; el service aplica las reglas (monto inmutable, pago no anulado).
*/
function validarDatosEdicion(req, res, next) {
  const { id_medio_pago, fecha_pago, notas } = req.body || {};

  const errores = [];

  if (
    id_medio_pago !== undefined &&
    id_medio_pago !== null &&
    id_medio_pago !== "" &&
    !esEnteroPositivo(id_medio_pago)
  ) {
    errores.push("El medio de pago no es válido.");
  }

  if (fecha_pago !== undefined && fecha_pago !== null && fecha_pago !== "") {
    if (!esFechaValida(fecha_pago)) {
      errores.push("La fecha del pago no es válida (YYYY-MM-DD).");
    }
  }

  validarTextoOpcional(notas, "Las notas", LIMITES.notas.max, errores);

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida el cuerpo de la anulación: { motivo } obligatorio.
*/
function validarAnulacion(req, res, next) {
  const { motivo } = req.body || {};
  const errores = [];

  if (motivo === undefined || motivo === null || String(motivo).trim() === "") {
    errores.push("El motivo de anulación es obligatorio.");
  } else if (typeof motivo !== "string") {
    errores.push("El motivo debe ser un texto.");
  } else {
    const longitud = motivo.trim().length;
    if (longitud < LIMITES.motivo.min) {
      errores.push(
        `El motivo de anulación debe tener al menos ${LIMITES.motivo.min} caracteres.`
      );
    } else if (longitud > LIMITES.motivo.max) {
      errores.push(
        `El motivo no puede superar los ${LIMITES.motivo.max} caracteres.`
      );
    }
  }

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

module.exports = {
  validarIdPago,
  validarFiltrosListado,
  validarDatosAlta,
  validarDatosEdicion,
  validarAnulacion,
};
