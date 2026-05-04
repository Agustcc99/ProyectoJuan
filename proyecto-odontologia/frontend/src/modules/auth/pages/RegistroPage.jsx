import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import { registrarUsuario } from "../services/authService";

function RegistroPage() {
  const navigate = useNavigate();

  const [datosRegistro, setDatosRegistro] = useState({
    nombre: "",
    apellido: "",
    email: "",
    contrasena: "",
    confirmarContrasena: "",
  });

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [registrandoUsuario, setRegistrandoUsuario] = useState(false);

  function manejarCambioInput(evento) {
    const { name, value } = evento.target;

    setDatosRegistro({
      ...datosRegistro,
      [name]: value,
    });
  }

  function validarFormularioRegistro() {
    if (
      !datosRegistro.nombre.trim() ||
      !datosRegistro.apellido.trim() ||
      !datosRegistro.email.trim() ||
      !datosRegistro.contrasena.trim() ||
      !datosRegistro.confirmarContrasena.trim()
    ) {
      return "Todos los campos son obligatorios.";
    }

    if (datosRegistro.contrasena !== datosRegistro.confirmarContrasena) {
      return "Las contraseñas no coinciden.";
    }

    if (datosRegistro.contrasena.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    return "";
  }

  async function manejarEnvioRegistro(evento) {
    evento.preventDefault();

    setMensajeError("");
    setMensajeExito("");

    const errorValidacion = validarFormularioRegistro();

    if (errorValidacion) {
      setMensajeError(errorValidacion);
      return;
    }

    setRegistrandoUsuario(true);

    try {
      await registrarUsuario({
        nombre: datosRegistro.nombre,
        apellido: datosRegistro.apellido,
        email: datosRegistro.email,
        contrasena: datosRegistro.contrasena,
      });

      setMensajeExito("Usuario registrado correctamente. Redirigiendo al login...");

      setTimeout(() => {
        navigate("/login");
      }, 1400);
    } catch (error) {
      const mensajeRespuesta =
        error.response?.data?.mensaje ||
        "No se pudo registrar el usuario. Revisá los datos e intentá nuevamente.";

      setMensajeError(mensajeRespuesta);
    } finally {
      setRegistrandoUsuario(false);
    }
  }

  return (
    <AuthCard
      titulo="Registro de usuario"
      subtitulo="Creá una cuenta para acceder al sistema odontológico."
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

      <form onSubmit={manejarEnvioRegistro} className="auth-form">
        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="nombre" className="form-label auth-label">
              Nombre
            </label>

            <input
              type="text"
              id="nombre"
              name="nombre"
              className="form-control auth-input"
              placeholder="Ej: Agustín"
              value={datosRegistro.nombre}
              onChange={manejarCambioInput}
              required
            />
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="apellido" className="form-label auth-label">
              Apellido
            </label>

            <input
              type="text"
              id="apellido"
              name="apellido"
              className="form-control auth-input"
              placeholder="Ej: Tacconi"
              value={datosRegistro.apellido}
              onChange={manejarCambioInput}
              required
            />
          </div>
        </div>

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
            value={datosRegistro.email}
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
            placeholder="Mínimo 8 caracteres"
            value={datosRegistro.contrasena}
            onChange={manejarCambioInput}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="confirmarContrasena" className="form-label auth-label">
            Confirmar contraseña
          </label>

          <input
            type="password"
            id="confirmarContrasena"
            name="confirmarContrasena"
            className="form-control auth-input"
            placeholder="Repetí la contraseña"
            value={datosRegistro.confirmarContrasena}
            onChange={manejarCambioInput}
            required
          />
        </div>

        <button
          type="submit"
          className="btn auth-button w-100"
          disabled={registrandoUsuario}
        >
          {registrandoUsuario ? "Registrando..." : "Registrarse"}
        </button>
      </form>

      <div className="auth-extra-links">
        <span>¿Ya tenés cuenta?</span>
        <Link to="/login">Iniciar sesión</Link>
      </div>
    </AuthCard>
  );
}

export default RegistroPage;