const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
  const encabezadoAutorizacion = req.headers.authorization;

  if (!encabezadoAutorizacion) {
    return res.status(401).json({
      mensaje: "No se envió token de autenticación.",
    });
  }

  //header authorization: Bearer token
  const partesEncabezado = encabezadoAutorizacion.split(" ");

  //"Bearer" + "espacio" + "token" (2)
  if (partesEncabezado.length !== 2 || partesEncabezado[0] !== "Bearer") {
    return res.status(401).json({
      mensaje: "Formato de token inválido. Debe enviarse como Bearer token.",
    });
  }

  //extraer token
  const token = partesEncabezado[1];

  try {
    const datosDecodificados = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = datosDecodificados;

    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: "Token inválido o expirado.",
    });
  }
}

module.exports = {
  verificarToken,
};