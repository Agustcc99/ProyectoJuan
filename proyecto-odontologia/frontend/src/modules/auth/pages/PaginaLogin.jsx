import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import {
  iniciarSesionUsuario,
  guardarSesionUsuario,
} from "../services/authService";
import { ROLES_USUARIO } from "../../../utils/roles";

function PaginaLogin() {
  const navigate = useNavigate();

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
    if (usuarioAutenticado.id_rol === ROLES_USUARIO.ADMINISTRADOR) {
      navigate("/panel-admin");
      return;
    }

    if (usuarioAutenticado.id_rol === ROLES_USUARIO.EMPLEADO) {
      navigate("/panel-empleado");
      return;
    }

    setMensajeError("El usuario no tiene un rol válido asignado.");
  }

  async function manejarEnvioLogin(evento) {
    evento.preventDefault();

    setMensajeError("");
    setCargandoLogin(true);

    try {
      const resultadoLogin = await iniciarSesionUsuario({
        email: datosLogin.email,
        contrasena: datosLogin.contrasena,
      });

      guardarSesionUsuario(resultadoLogin.token, resultadoLogin.usuario);

      redirigirUsuarioSegunRol(resultadoLogin.usuario);
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