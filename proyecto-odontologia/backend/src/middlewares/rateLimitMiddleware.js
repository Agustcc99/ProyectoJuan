const { rateLimit } = require("express-rate-limit");

const { enviarError } = require("../utils/response");

/*
  FIX HT9 (AUD-11) - Criterio 1: límite de intentos en autenticación.

  La API no tenía ningún límite de tasa: alguien podía probar contraseñas o
  disparar recuperaciones de cuenta sin ninguna fricción. Se agrega rate limiting
  por IP sobre los dos endpoints que el hallazgo señala como sensibles a fuerza
  bruta / abuso: /auth/login y /auth/solicitar-recuperacion.

  El handler responde con el formato uniforme de utils/response.js (HT3), en
  lugar de dejar el mensaje por defecto de la librería.
*/
function manejarLimiteSuperado(req, res) {
  return enviarError(
    res,
    429,
    "Demasiados intentos. Esperá unos minutos antes de volver a intentarlo."
  );
}

const VENTANA_QUINCE_MINUTOS_MS = 15 * 60 * 1000;

/*
  Límite sobre /auth/login: 10 intentos FALLIDOS por IP cada 15 minutos.
  skipSuccessfulRequests: true hace que sólo cuenten los intentos fallidos
  (401/400), tal como pide el criterio de aceptación ("múltiples intentos
  fallidos de login") -un usuario que inicia sesión correctamente en el medio
  no consume ni resetea el contador de intentos fallidos de otro atacante.
*/
const limitadorLogin = rateLimit({
  windowMs: VENTANA_QUINCE_MINUTOS_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: manejarLimiteSuperado,
});

/*
  Límite sobre /auth/solicitar-recuperacion: 5 solicitudes por IP cada 15
  minutos. Este endpoint siempre responde 200 (para no filtrar qué emails
  existen), así que no tiene sentido distinguir éxito/fallo: se limita el
  volumen total de solicitudes para evitar spam de emails de recuperación.
*/
const limitadorRecuperacion = rateLimit({
  windowMs: VENTANA_QUINCE_MINUTOS_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: manejarLimiteSuperado,
});

module.exports = {
  limitadorLogin,
  limitadorRecuperacion,
};
