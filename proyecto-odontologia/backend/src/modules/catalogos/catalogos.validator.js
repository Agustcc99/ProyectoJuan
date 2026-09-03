const { enviarError } = require("../../utils/response");
const {
  CATALOGOS,
  ESTADOS_FILTRO,
  MAX_DESCRIPCION,
  MIN_NOMBRE,
} = require("./catalogos.service");

/*
  Valida que el slug de :catalogo sea uno de los cuatro catálogos soportados.
  Va después de verificarPermiso: un slug inexistente responde 404, no 400.
*/
function validarCatalogo(req, res, next) {
  if (!CATALOGOS[req.params.catalogo]) {
    return enviarError(res, 404, "Catálogo inexistente.");
  }

  next();
}

/*
  Valida el query param ?estado. Opcional; si viene, debe ser uno de los
  valores conocidos.
*/
function validarFiltroEstado(req, res, next) {
  const { estado } = req.query;

  if (estado !== undefined && !ESTADOS_FILTRO.includes(estado)) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", [
      `El filtro de estado debe ser uno de: ${ESTADOS_FILTRO.join(", ")}.`,
    ]);
  }

  next();
}

/*
  Valida que :id sea un entero positivo.
*/
function validarIdItem(req, res, next) {
  const idItem = Number(req.params.id);

  if (!Number.isInteger(idItem) || idItem <= 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", [
      "El identificador del ítem no es válido.",
    ]);
  }

  next();
}

/*
  Valida el cuerpo de alta / modificación de un ítem: nombre obligatorio con la
  longitud del catálogo correspondiente y descripción opcional acotada. Arma el
  array `errores` y responde con el formato uniforme.
*/
function validarDatosItem(req, res, next) {
  const configuracion = CATALOGOS[req.params.catalogo];
  const { nombre, descripcion } = req.body;

  const errores = [];

  if (nombre === undefined || nombre === null || String(nombre).trim() === "") {
    errores.push("El nombre es obligatorio.");
  } else if (typeof nombre !== "string") {
    errores.push("El nombre debe ser un texto.");
  } else {
    const longitud = nombre.trim().length;

    if (longitud < MIN_NOMBRE || longitud > configuracion.maxNombre) {
      errores.push(
        `El nombre debe tener entre ${MIN_NOMBRE} y ${configuracion.maxNombre} caracteres.`
      );
    }
  }

  if (descripcion !== undefined && descripcion !== null && descripcion !== "") {
    if (typeof descripcion !== "string") {
      errores.push("La descripción debe ser un texto.");
    } else if (descripcion.trim().length > MAX_DESCRIPCION) {
      errores.push(
        `La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.`
      );
    }
  }

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

module.exports = {
  validarCatalogo,
  validarFiltroEstado,
  validarIdItem,
  validarDatosItem,
};
