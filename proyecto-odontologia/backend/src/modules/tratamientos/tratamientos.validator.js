const { enviarError } = require("../../utils/response");
const { ORDENES_VALIDOS } = require("./tratamientos.service");

/*
  ABM 03 — Tratamientos. Validación de FORMATO (no de negocio).

  Cada middleware arma un array `errores` y, si hay alguno, corta la cadena con
  el formato uniforme: enviarError(res, 400, "Los datos enviados no son válidos.", errores).
  Las reglas de negocio (paciente activo, matriz de transiciones, precio vs.
  cobrado, etc.) viven en tratamientos.service.js.
*/

const LIMITES = {
  descripcion: { max: 2000 },
  observaciones: { max: 2000 },
  motivo: { min: 5, max: 255 },
  precio: { max: 99999999.99 },
};

const ESTADOS_VALIDOS = [1, 2, 3, 4];

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

/*
  Valida que :id sea un entero positivo.
*/
function validarIdTratamiento(req, res, next) {
  if (!esEnteroPositivo(req.params.id)) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", [
      "El identificador del tratamiento no es válido.",
    ]);
  }
  next();
}

/*
  Valida los query params del listado. Todos opcionales.
*/
function validarFiltrosListado(req, res, next) {
  const { id_paciente, id_estado, id_tipo, orden, desde, hasta, pagina, porPagina } =
    req.query;
  const errores = [];

  for (const [clave, valor] of [
    ["id_paciente", id_paciente],
    ["id_estado", id_estado],
    ["id_tipo", id_tipo],
  ]) {
    if (valor !== undefined && !esEnteroPositivo(valor)) {
      errores.push(`El filtro ${clave} debe ser un entero positivo.`);
    }
  }

  if (id_estado !== undefined && !ESTADOS_VALIDOS.includes(Number(id_estado))) {
    errores.push("El filtro id_estado debe ser 1, 2, 3 o 4.");
  }

  if (orden !== undefined && !ORDENES_VALIDOS.includes(orden)) {
    errores.push(
      `El orden debe ser uno de: ${ORDENES_VALIDOS.join(", ")}.`
    );
  }

  if (desde !== undefined && desde !== "" && !esFechaValida(desde)) {
    errores.push("El parámetro «desde» no es una fecha válida (YYYY-MM-DD).");
  }

  if (hasta !== undefined && hasta !== "" && !esFechaValida(hasta)) {
    errores.push("El parámetro «hasta» no es una fecha válida (YYYY-MM-DD).");
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

function validarPrecio(valor, errores, { obligatorio }) {
  if (valor === undefined || valor === null || valor === "") {
    if (obligatorio) errores.push("El precio es obligatorio.");
    return;
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero)) {
    errores.push("El precio debe ser un número.");
  } else if (numero <= 0) {
    errores.push("El precio debe ser mayor a cero.");
  } else if (numero > LIMITES.precio.max) {
    errores.push("El precio supera el máximo permitido.");
  }
}

function validarFechaOpcional(valor, etiqueta, errores) {
  if (valor === undefined || valor === null || valor === "") return;
  if (!esFechaValida(valor)) {
    errores.push(`${etiqueta} no es una fecha válida (YYYY-MM-DD).`);
  }
}

/*
  Valida el cuerpo del alta de tratamiento.
*/
function validarDatosAlta(req, res, next) {
  const {
    id_paciente,
    id_tipo_tratamiento,
    precio_paciente,
    descripcion,
    fecha_inicio,
    observaciones,
  } = req.body || {};

  const errores = [];

  if (!esEnteroPositivo(id_paciente)) {
    errores.push("El paciente es obligatorio.");
  }

  if (!esEnteroPositivo(id_tipo_tratamiento)) {
    errores.push("El tipo de tratamiento es obligatorio.");
  }

  validarPrecio(precio_paciente, errores, { obligatorio: true });
  validarTextoOpcional(descripcion, "La descripción", LIMITES.descripcion.max, errores);
  validarTextoOpcional(
    observaciones,
    "Las observaciones",
    LIMITES.observaciones.max,
    errores
  );
  validarFechaOpcional(fecha_inicio, "La fecha de inicio", errores);

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida el cuerpo de la modificación. Todos los campos son opcionales a nivel
  formato; el service decide cuáles se pueden tocar según el estado.
*/
function validarDatosEdicion(req, res, next) {
  const {
    id_paciente,
    id_tipo_tratamiento,
    precio_paciente,
    descripcion,
    fecha_inicio,
    fecha_fin,
    observaciones,
  } = req.body || {};

  const errores = [];

  if (id_paciente !== undefined && !esEnteroPositivo(id_paciente)) {
    errores.push("El paciente no es válido.");
  }

  if (id_tipo_tratamiento !== undefined && !esEnteroPositivo(id_tipo_tratamiento)) {
    errores.push("El tipo de tratamiento no es válido.");
  }

  if (precio_paciente !== undefined) {
    validarPrecio(precio_paciente, errores, { obligatorio: false });
  }

  validarTextoOpcional(descripcion, "La descripción", LIMITES.descripcion.max, errores);
  validarTextoOpcional(
    observaciones,
    "Las observaciones",
    LIMITES.observaciones.max,
    errores
  );
  validarFechaOpcional(fecha_inicio, "La fecha de inicio", errores);
  validarFechaOpcional(fecha_fin, "La fecha de fin", errores);

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida el cuerpo del cambio de estado: { id_estado, motivo? }.
  El motivo sólo es obligatorio cuando el destino es «cancelado» (id 4); esa
  regla la aplica el service, acá sólo se valida el formato si viene.
*/
function validarCambioEstado(req, res, next) {
  const { id_estado, motivo } = req.body || {};
  const errores = [];

  if (id_estado === undefined || !ESTADOS_VALIDOS.includes(Number(id_estado))) {
    errores.push("El estado destino debe ser 1, 2, 3 o 4.");
  }

  if (motivo !== undefined && motivo !== null && motivo !== "") {
    if (typeof motivo !== "string") {
      errores.push("El motivo debe ser un texto.");
    } else if (motivo.trim().length > LIMITES.motivo.max) {
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
  validarIdTratamiento,
  validarFiltrosListado,
  validarDatosAlta,
  validarDatosEdicion,
  validarCambioEstado,
};
