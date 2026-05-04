import { useState } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { solicitarRecuperacionContrasena } from "../services/authService";

function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [urlVistaPreviaEmail, setUrlVistaPreviaEmail] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  function manejarCambioEmail(evento) {
    setEmail(evento.target.value);
  }

  async function manejarEnvioRecuperacion(evento) {
    evento.preventDefault();

    setMensajeError("");
    setMensajeExito("");
    setUrlVistaPreviaEmail("");

    if (!email.trim()) {
      setMensajeError("Ingresá tu correo electrónico.");
      return;
    }

    setEnviandoSolicitud(true);

    try {
      const resultadoSolicitud = await solicitarRecuperacionContrasena(email);

      setMensajeExito(
        resultadoSolicitud.mensaje ||
          "Si el email existe en el sistema, se enviaron instrucciones de recuperación."
      );

      if (resultadoSolicitud.urlVistaPreviaEmail) {
        setUrlVistaPreviaEmail(resultadoSolicitud.urlVistaPreviaEmail);
      }
    } catch (error) {
      const mensajeRespuesta =
        error.response?.data?.mensaje ||
        "No se pudo procesar la solicitud. Intentá nuevamente.";

      setMensajeError(mensajeRespuesta);
    } finally {
      setEnviandoSolicitud(false);
    }
  }

  return (
    <AuthCard
      titulo="Recuperar contraseña"
      subtitulo="Ingresá tu correo electrónico registrado para recibir un enlace de recuperación."
    >
      {mensajeError && (
        <div className="alert alert-danger auth-alert" role="alert">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="alert alert-success auth-alert" role="alert">
          {mensajeExito}
        </div>
      )}

      {urlVistaPreviaEmail && (
        <div className="alert alert-info auth-alert" role="alert">
          <p className="mb-2">
            Correo generado correctamente en Ethereal Email.
          </p>

          <a
            href={urlVistaPreviaEmail}
            target="_blank"
            rel="noreferrer"
            className="auth-link"
          >
            Abrir vista previa del correo
          </a>
        </div>
      )}

      <form onSubmit={manejarEnvioRecuperacion} className="auth-form">
        <div className="mb-4">
          <label htmlFor="email" className="form-label auth-label">
            Correo electrónico
          </label>

          <input
            type="email"
            id="email"
            name="email"
            className="form-control auth-input"
            placeholder="usuario@email.com"
            value={email}
            onChange={manejarCambioEmail}
            required
          />
        </div>

        <button
          type="submit"
          className="btn auth-button w-100"
          disabled={enviandoSolicitud}
        >
          {enviandoSolicitud
            ? "Enviando solicitud..."
            : "Enviar enlace de recuperación"}
        </button>
      </form>

      <div className="auth-extra-links">
        <Link to="/login">Volver al inicio de sesión</Link>
      </div>
    </AuthCard>
  );
}

export default RecuperarContrasenaPage;