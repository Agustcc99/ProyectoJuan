function validarDatosDeRegistro(req, res, next) {
  const { nombre, apellido, email, contrasena } = req.body;

  const errores = [];

  if (!nombre || nombre.trim() === "") {
    errores.push("El nombre es obligatorio.");
  }

  if (!apellido || apellido.trim() === "") {
    errores.push("El apellido es obligatorio.");
  }

  if (!email || email.trim() === "") {
    errores.push("El email es obligatorio.");
  } else {
    const formatoEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoEmailValido.test(email)) {
      errores.push("El formato del email no es válido.");
    }
  }

  if (!contrasena || contrasena.trim() === "") {
    errores.push("La contraseña es obligatoria.");
  } else {
    validarSeguridadContrasena(contrasena, errores);
  }

  if (errores.length > 0) {
    return res.status(400).json({
      mensaje: "Los datos enviados no son válidos.",
      errores,
    });
  }

  next();
}

function validarDatosDeLogin(req, res, next) {
  const { email, contrasena } = req.body;

  const errores = [];

  if (!email || email.trim() === "") {
    errores.push("El email es obligatorio.");
  } else {
    const formatoEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoEmailValido.test(email)) {
      errores.push("El formato del email no es válido.");
    }
  }

  if (!contrasena || contrasena.trim() === "") {
    errores.push("La contraseña es obligatoria.");
  }

  if (errores.length > 0) {
    return res.status(400).json({
      mensaje: "Los datos enviados no son válidos.",
      errores,
    });
  }

  next();
}

function validarSolicitudRecuperacion(req, res, next) {
  const { email } = req.body;

  const errores = [];

  if (!email || email.trim() === "") {
    errores.push("El email es obligatorio.");
  } else {
    const formatoEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoEmailValido.test(email)) {
      errores.push("El formato del email no es válido.");
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({
      mensaje: "Los datos enviados no son válidos.",
      errores,
    });
  }

  next();
}

function validarRestablecimientoContrasena(req, res, next) {
  const { token, nuevaContrasena } = req.body;

  const errores = [];

  if (!token || token.trim() === "") {
    errores.push("El token de recuperación es obligatorio.");
  }

  if (!nuevaContrasena || nuevaContrasena.trim() === "") {
    errores.push("La nueva contraseña es obligatoria.");
  } else {
    validarSeguridadContrasena(nuevaContrasena, errores);
  }

  if (errores.length > 0) {
    return res.status(400).json({
      mensaje: "Los datos enviados no son válidos.",
      errores,
    });
  }

  next();
}

function validarSeguridadContrasena(contrasena, errores) {
  if (contrasena.length < 8) {
    errores.push("La contraseña debe tener al menos 8 caracteres.");
  }

  const contieneNumero = /\d/.test(contrasena);
  const contieneLetraMayuscula = /[A-Z]/.test(contrasena);
  const contieneLetraMinuscula = /[a-z]/.test(contrasena);

  if (!contieneNumero || !contieneLetraMayuscula || !contieneLetraMinuscula) {
    errores.push(
      "La contraseña debe incluir al menos una mayúscula, una minúscula y un número."
    );
  }
}

module.exports = {
  validarDatosDeRegistro,
  validarDatosDeLogin,
  validarSolicitudRecuperacion,
  validarRestablecimientoContrasena,
};