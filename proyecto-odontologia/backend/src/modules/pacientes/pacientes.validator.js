const { enviarError } = require("../../utils/response");

/*
  ABM 02 — Pacientes. Validación de FORMATO (no de negocio).

  Cada middleware arma un array `errores` y, si hay alguno, corta la cadena con
  el formato uniforme: enviarError(res, 400, "Los datos enviados no son válidos.", errores).
  Las reglas de negocio (DNI duplicado, pertenencia al consultorio, etc.) viven
  en pacientes.service.js.
*/

const ESTADOS_FILTRO = ["activos", "inactivos", "todos"];

// Misma expresión que auth.validator.js.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOLO_DIGITOS = /^\d+$/;

const LIMITES = {
  nombre: { min: 2, max: 50 },
  apellido: { min: 2, max: 50 },
  dni: { min: 7, max: 20 },
  telefono: { max: 20 },
  email: { max: 100 },
  obra_social: { max: 50 },
  observaciones: { max: 2000 },
};

function esTextoNoVacio(valor) {
  return typeof valor === "string" && valor.trim() !== "";
}

/*
  Valida el cuerpo de alta y de modificación de un paciente.
*/
function validarDatosPaciente(req, res, next) {
  const {
    nombre,
    apellido,
    dni,
    telefono,
    email,
    obra_social,
    fecha_nacimiento,
    observaciones,
  } = req.body || {};

  const errores = [];

  // nombre
  if (!esTextoNoVacio(nombre)) {
    errores.push("El nombre es obligatorio.");
  } else if (
    nombre.trim().length < LIMITES.nombre.min ||
    nombre.trim().length > LIMITES.nombre.max
  ) {
    errores.push(
      `El nombre debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres.`
    );
  }

  // apellido
  if (!esTextoNoVacio(apellido)) {
    errores.push("El apellido es obligatorio.");
  } else if (
    apellido.trim().length < LIMITES.apellido.min ||
    apellido.trim().length > LIMITES.apellido.max
  ) {
    errores.push(
      `El apellido debe tener entre ${LIMITES.apellido.min} y ${LIMITES.apellido.max} caracteres.`
    );
  }

  // dni
  if (!esTextoNoVacio(dni)) {
    errores.push("El DNI es obligatorio.");
  } else {
    const dniLimpio = dni.trim();

    if (!SOLO_DIGITOS.test(dniLimpio)) {
      errores.push("El DNI debe contener solo números.");
    } else if (
      dniLimpio.length < LIMITES.dni.min ||
      dniLimpio.length > LIMITES.dni.max
    ) {
      errores.push(
        `El DNI debe tener entre ${LIMITES.dni.min} y ${LIMITES.dni.max} dígitos.`
      );
    }
  }

  // telefono (opcional)
  if (telefono !== undefined && telefono !== null && telefono !== "") {
    if (typeof telefono !== "string") {
      errores.push("El teléfono debe ser un texto.");
    } else if (telefono.trim().length > LIMITES.telefono.max) {
      errores.push(
        `El teléfono no puede superar los ${LIMITES.telefono.max} caracteres.`
      );
    }
  }

  // email (opcional)
  if (email !== undefined && email !== null && email !== "") {
    if (typeof email !== "string" || !FORMATO_EMAIL.test(email.trim())) {
      errores.push("El formato del email no es válido.");
    } else if (email.trim().length > LIMITES.email.max) {
      errores.push(
        `El email no puede superar los ${LIMITES.email.max} caracteres.`
      );
    }
  }

  // obra_social (opcional)
  if (obra_social !== undefined && obra_social !== null && obra_social !== "") {
    if (typeof obra_social !== "string") {
      errores.push("La obra social debe ser un texto.");
    } else if (obra_social.trim().length > LIMITES.obra_social.max) {
      errores.push(
        `La obra social no puede superar los ${LIMITES.obra_social.max} caracteres.`
      );
    }
  }

  // fecha_nacimiento (opcional): fecha válida y no futura
  if (
    fecha_nacimiento !== undefined &&
    fecha_nacimiento !== null &&
    fecha_nacimiento !== ""
  ) {
    const fecha = new Date(fecha_nacimiento);

    if (Number.isNaN(fecha.getTime())) {
      errores.push("La fecha de nacimiento no es una fecha válida.");
    } else {
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);

      if (fecha.getTime() > hoy.getTime()) {
        errores.push("La fecha de nacimiento no puede ser futura.");
      }
    }
  }

  // observaciones (opcional)
  if (
    observaciones !== undefined &&
    observaciones !== null &&
    observaciones !== ""
  ) {
    if (typeof observaciones !== "string") {
      errores.push("Las observaciones deben ser un texto.");
    } else if (observaciones.trim().length > LIMITES.observaciones.max) {
      errores.push(
        `Las observaciones no pueden superar los ${LIMITES.observaciones.max} caracteres.`
      );
    }
  }

  if (errores.length > 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", errores);
  }

  next();
}

/*
  Valida que :id sea un entero positivo.
*/
function validarIdPaciente(req, res, next) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return enviarError(res, 400, "Los datos enviados no son válidos.", [
      "El identificador del paciente no es válido.",
    ]);
  }

  next();
}

/*
  Valida los query params del listado. Todos opcionales.
*/
function validarFiltrosListado(req, res, next) {
  const { estado, pagina, porPagina } = req.query;
  const errores = [];

  if (estado !== undefined && !ESTADOS_FILTRO.includes(estado)) {
    errores.push(
      `El filtro de estado debe ser uno de: ${ESTADOS_FILTRO.join(", ")}.`
    );
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

module.exports = {
  ESTADOS_FILTRO,
  validarDatosPaciente,
  validarIdPaciente,
  validarFiltrosListado,
};
