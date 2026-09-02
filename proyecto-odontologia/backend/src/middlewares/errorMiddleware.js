const { enviarError, MENSAJE_ERROR_GENERICO } = require("../utils/response");

/*
  FIX HT3 (AUD-04): manejo centralizado de errores.

  Este archivo existía desde el Sprint 1 pero estaba vacío y nunca se importó en
  app.js, por lo que cada ruta repetía el mismo bloque try/catch. Ahora las rutas
  delegan acá: al ser handlers async, Express 5 reenvía automáticamente cualquier
  promesa rechazada a este middleware.
*/

/*
  Responde con el formato uniforme cuando la URL solicitada no existe.
  Se registra antes del manejador de errores en app.js.
*/
function manejarRutaNoEncontrada(req, res) {
  return enviarError(
    res,
    404,
    `La ruta solicitada no existe: ${req.method} ${req.originalUrl}`
  );
}

/*
  Middleware final de la cadena de Express.

  Los errores de negocio (los que los services lanzan con statusCode) conservan su
  mensaje, porque son esperados y el usuario necesita leerlos. Los errores no
  controlados (500) devuelven un mensaje genérico: el detalle se registra en el
  servidor pero no se envía al cliente, para no filtrar información interna como
  los mensajes crudos del driver de MySQL.
*/
function manejarErrores(error, req, res, next) {
  // Si la respuesta ya empezó a enviarse, se delega en el manejador de Express.
  if (res.headersSent) {
    return next(error);
  }

  const codigoEstado = error.statusCode || 500;

  if (codigoEstado >= 500) {
    console.error(
      `Error no controlado en ${req.method} ${req.originalUrl}:`,
      error
    );

    return enviarError(res, 500, MENSAJE_ERROR_GENERICO);
  }

  return enviarError(
    res,
    codigoEstado,
    error.message || MENSAJE_ERROR_GENERICO,
    error.errores
  );
}

module.exports = {
  manejarRutaNoEncontrada,
  manejarErrores,
};
