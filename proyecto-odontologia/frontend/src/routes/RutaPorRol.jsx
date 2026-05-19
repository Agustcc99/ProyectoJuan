import { Navigate } from "react-router-dom";
import { ROLES_USUARIO } from "../utils/roles";

/**
 * RutaPorRol — protege rutas según el rol del usuario autenticado.
 *
 * Props:
 *  - rolesPermitidos: array de ids de rol que pueden acceder (e.g. [ROLES_USUARIO.ADMINISTRADOR])
 *  - children: componente a renderizar si el rol es válido
 *
 * Si no hay usuario en localStorage → redirige a /login
 * Si el rol no está permitido → redirige a /sin-acceso (o al panel correspondiente)
 */
function RutaPorRol({ rolesPermitidos = [], children }) {
  const usuarioGuardado = localStorage.getItem("usuario");

  if (!usuarioGuardado) {
    return <Navigate to="/login" replace />;
  }

  let usuario;
  try {
    usuario = JSON.parse(usuarioGuardado);
  } catch {
    return <Navigate to="/login" replace />;
  }

  const rolUsuario = usuario?.id_rol;

  if (!rolesPermitidos.includes(rolUsuario)) {
    // Redirigir al panel que le corresponde según su rol
    if (rolUsuario === ROLES_USUARIO.ADMINISTRADOR) {
      return <Navigate to="/panel-admin" replace />;
    }
    if (rolUsuario === ROLES_USUARIO.EMPLEADO) {
      return <Navigate to="/panel-empleado" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RutaPorRol;
