/*
  FIX HT3 (AUD-04): helpers de respuesta HTTP.

  Este archivo existía desde el Sprint 1 pero estaba vacío, por lo que cada ruta
  armaba su propio objeto de respuesta. Acá se define el formato uniforme que usan
  todos los módulos del backend.

  Formato de éxito:
    { ok: true, mensaje: "...", ...datos }

  Formato de error:
    { ok: false, mensaje: "...", errores: [...] }   // "errores" es opcional

  Los datos se agregan al nivel superior de la respuesta (y no dentro de una clave
  contenedora) para no romper a los consumidores existentes del frontend, que ya
  leen respuesta.data.roles, respuesta.data.usuarios, respuesta.data.token, etc.
*/

const MENSAJE_ERROR_GENERICO = "Error interno del servidor.";

function enviarExito(
  res,
  codigoEstado = 200,
  mensaje = "Operación realizada correctamente.",
  datos = {}
) {
  return res.status(codigoEstado).json({
    ok: true,
    mensaje,
    ...datos,
  });
}

function enviarError(
  res,
  codigoEstado = 500,
  mensaje = MENSAJE_ERROR_GENERICO,
  errores = null
) {
  const cuerpoRespuesta = {
    ok: false,
    mensaje,
  };

  // Sólo se incluye el detalle cuando la validación aportó errores concretos.
  if (Array.isArray(errores) && errores.length > 0) {
    cuerpoRespuesta.errores = errores;
  }

  return res.status(codigoEstado).json(cuerpoRespuesta);
}

module.exports = {
  enviarExito,
  enviarError,
  MENSAJE_ERROR_GENERICO,
};
