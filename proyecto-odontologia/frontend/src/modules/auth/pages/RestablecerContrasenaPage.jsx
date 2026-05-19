import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { restablecerContrasena } from "../services/authService";

function RestablecerContrasenaPage() {
  const navigate = useNavigate();
  const [parametrosUrl] = useSearchParams();

  const tokenRecuperacion = parametrosUrl.get("token");

  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  function manejarCambioNuevaContrasena(evento) {
    setNuevaContrasena(evento.target.value);
  }

  function manejarCambioConfirmarContrasena(evento) {
    setConfirmarContrasena(evento.target.value);
  }

  async function manejarEnvioRestablecimiento(evento) {
    evento.preventDefault();

    setMensajeError("");
    setMensajeExito("");

    if (!tokenRecuperacion) {
      setMensajeError("El enlace de recuperación no contiene un token válido.");
      return;
    }

    if (!nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      setMensajeError("Completá ambos campos de contraseña.");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setMensajeError("Las contraseñas no coinciden.");
      return;
    }

    setEnviandoSolicitud(true);

    try {
      const resultadoRestablecimiento = await restablecerContrasena(
        tokenRecuperacion,
        nuevaContrasena
      );

      setMensajeExito(
        resultadoRestablecimiento.mensaje ||
          "La contraseña fue restablecida correctamente."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      const mensajeRespuesta =
        error.response?.data?.mensaje ||
        "No se pudo restablecer la contraseña. El enlace puede estar vencido o ser inválido.";

      setMensajeError(mensajeRespuesta);
    } finally {
      setEnviandoSolicitud(false);
    }
  }

  return (
    <AuthCard
      titulo="Restablecer contraseña"
      subtitulo="Ingresá tu nueva contraseña para recuperar el acceso a tu cuenta."
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

      <form onSubmit={manejarEnvioRestablecimiento} className="auth-form">
        <div className="mb-4">
          <label htmlFor="nuevaContrasena" className="form-label auth-label">
            Nueva contraseña
          </label>

          <input
            type="password"
            id="nuevaContrasena"
            name="nuevaContrasena"
            className="form-control auth-input"
            placeholder="Ingresá tu nueva contraseña"
            value={nuevaContrasena}
            onChange={manejarCambioNuevaContrasena}
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="confirmarContrasena"
            className="form-label auth-label"
          >
            Confirmar contraseña
          </label>

          <input
            type="password"
            id="confirmarContrasena"
            name="confirmarContrasena"
            className="form-control auth-input"
            placeholder="Repetí la nueva contraseña"
            value={confirmarContrasena}
            onChange={manejarCambioConfirmarContrasena}
            required
          />
        </div>

        <button
          type="submit"
          className="btn auth-button w-100"
          disabled={enviandoSolicitud}
        >
          {enviandoSolicitud
            ? "Actualizando contraseña..."
            : "Cambiar contraseña"}
        </button>
      </form>

      <div className="auth-extra-links">
        <Link to="/login">Volver al inicio de sesión</Link>
      </div>
    </AuthCard>
  );
}

export default RestablecerContrasenaPage;