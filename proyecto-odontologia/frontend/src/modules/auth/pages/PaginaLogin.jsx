import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { iniciarSesionUsuario } from "../services/authService";

// FIX HT4 (AUD-05): el guardado de sesión pasa por el contexto.
import useAuth from "../../../hooks/useAuth";
import { ROLES_USUARIO } from "../../../utils/roles";

function PaginaLogin() {
  const navigate = useNavigate();

  /*
    FIX HT4 (AUD-05): la sesión se guarda, se revalida y se consulta a través del
    AuthContext. El aviso de sesión expirada (HT2) también llega desde el contexto.
  */
  const { iniciarSesion, revalidarSesion, mensajeSesion, limpiarMensajeSesion } =
    useAuth();

  const [datosLogin, setDatosLogin] = useState({
    email: "",
    contrasena: "",
  });

  const [mensajeError, setMensajeError] = useState("");
  const [cargandoLogin, setCargandoLogin] = useState(false);

  function manejarCambioInput(evento) {
    const { name, value } = evento.target;

    setDatosLogin({
      ...datosLogin,
      [name]: value,
    });
  }

  function redirigirUsuarioSegunRol(usuarioAutenticado) {
    if (!usuarioAutenticado.id_rol) {
      setMensajeError("El usuario no tiene un rol asignado.");
      return;
    }

    if (usuarioAutenticado.id_rol === ROLES_USUARIO.ADMINISTRADOR) {
      navigate("/panel");
      return;
    }

    navigate("/panel-empleado");
  }

  async function manejarEnvioLogin(evento) {
    evento.preventDefault();

    setMensajeError("");
    limpiarMensajeSesion(); // FIX HT2: se oculta el aviso al reintentar el ingreso.
    setCargandoLogin(true);

    try {
      const resultadoLogin = await iniciarSesionUsuario({
        email: datosLogin.email,
        contrasena: datosLogin.contrasena,
      });

      // FIX HT4: se publica la sesión en el estado global (y en la persistencia).
      iniciarSesion(resultadoLogin.token, resultadoLogin.usuario);

      // FIX HT1: se sincroniza la sesión contra el backend para arrancar siempre con
      // el rol y los permisos vigentes (no con los que viajan en el token del login).
      const sesionSincronizada = await revalidarSesion();

      redirigirUsuarioSegunRol(sesionSincronizada.usuario || resultadoLogin.usuario);
    } catch (error) {
      const mensajeRespuesta =
        error.response?.data?.mensaje ||
        "No se pudo iniciar sesión. Revisá tus datos e intentá nuevamente.";

      setMensajeError(mensajeRespuesta);
    } finally {
      setCargandoLogin(false);
    }
  }

  return (
    <AuthCard
      titulo="Iniciar sesión"
      subtitulo="Ingresá tus credenciales para acceder al sistema."
    >
      {/* FIX HT2 (AUD-02): aviso informativo cuando la sesión expiró. */}
      {mensajeSesion && (
        <div className="alert alert-warning auth-alert" role="alert">
          {mensajeSesion}
        </div>
      )}

      {mensajeError && (
        <div className="alert alert-danger auth-alert" role="alert">
          {mensajeError}
        </div>
      )}

      <form onSubmit={manejarEnvioLogin} className="auth-form">
        <div className="mb-3">
          <label htmlFor="email" className="form-label auth-label">
            Correo electrónico
          </label>

          <input
            type="email"
            id="email"
            name="email"
            className="form-control auth-input"
            placeholder="usuario@email.com"
            value={datosLogin.email}
            onChange={manejarCambioInput}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="contrasena" className="form-label auth-label">
            Contraseña
          </label>

          <input
            type="password"
            id="contrasena"
            name="contrasena"
            className="form-control auth-input"
            placeholder="Ingresá tu contraseña"
            value={datosLogin.contrasena}
            onChange={manejarCambioInput}
            required
          />
        </div>

        <div className="d-flex justify-content-end mb-4">
          <Link to="/recuperar-contrasena" className="auth-link">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          className="btn auth-button w-100"
          disabled={cargandoLogin}
        >
          {cargandoLogin ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <div className="auth-extra-links">
        <span>¿No tenés cuenta?</span>
        <Link to="/registro">Registrarse</Link>
      </div>
    </AuthCard>
  );
}

export default PaginaLogin;