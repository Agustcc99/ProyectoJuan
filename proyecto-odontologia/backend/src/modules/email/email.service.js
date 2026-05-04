const nodemailer = require("nodemailer");

async function crearTransportadorEmailDePrueba() {
  const cuentaDePrueba = await nodemailer.createTestAccount();

  const transportadorEmail = nodemailer.createTransport({
    host: cuentaDePrueba.smtp.host,
    port: cuentaDePrueba.smtp.port,
    secure: cuentaDePrueba.smtp.secure,
    auth: {
      user: cuentaDePrueba.user,
      pass: cuentaDePrueba.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transportadorEmail;
}

async function enviarEmailRecuperacionContrasena(destinatario, enlaceRecuperacion) {
  const transportadorEmail = await crearTransportadorEmailDePrueba();

  const informacionEmail = await transportadorEmail.sendMail({
    from: '"Sistema Odontológico" <no-responder@sistemaodontologico.com>',
    to: destinatario,
    subject: "Recuperación de contraseña",
    html: `
      <h2>Recuperación de contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Para crear una nueva contraseña, ingresá al siguiente enlace:</p>
      <p>
        <a href="${enlaceRecuperacion}">
          Restablecer contraseña
        </a>
      </p>
      <p>Este enlace vence en 30 minutos.</p>
      <p>Si no solicitaste este cambio, podés ignorar este mensaje.</p>
    `,
  });

  const urlVistaPrevia = nodemailer.getTestMessageUrl(informacionEmail);

  return {
    messageId: informacionEmail.messageId,
    urlVistaPrevia,
  };
}

module.exports = {
  enviarEmailRecuperacionContrasena,
};