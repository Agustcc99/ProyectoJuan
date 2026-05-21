import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  obtenerPermisosGuardados,
  obtenerPermisosUsuarioAutenticado,
  guardarPermisosUsuario,
} from "../modules/auth/services/authService";

function normalizarPermisosRequeridos(permisoRequerido, permisosRequeridos) {
  if (Array.isArray(permisosRequeridos) && permisosRequeridos.length > 0) {
    return permisosRequeridos;
  }

  if (permisoRequerido) {
    return [permisoRequerido];
  }

  return [];
}

function RutaPorPermiso({
  permisoRequerido,
  permisosRequeridos = [],
  modo = "alguno",
  children,
}) {
  const location = useLocation();

  const [cargando, setCargando] = useState(true);
  const [tieneAcceso, setTieneAcceso] = useState(false);

  useEffect(() => {
    let componenteActivo = true;

    async function cargarYValidarPermisos() {
      try {
        const permisosNecesarios = normalizarPermisosRequeridos(
          permisoRequerido,
          permisosRequeridos
        );

        if (permisosNecesarios.length === 0) {
          if (componenteActivo) {
            setTieneAcceso(true);
            setCargando(false);
          }
          return;
        }

        let permisosUsuario = obtenerPermisosGuardados();

        if (permisosUsuario.length === 0) {
          const respuesta = await obtenerPermisosUsuarioAutenticado();

          permisosUsuario =
            respuesta.permisos || respuesta.data || respuesta || [];

          permisosUsuario = Array.isArray(permisosUsuario)
            ? permisosUsuario
            : [];

          guardarPermisosUsuario(permisosUsuario);
        }

        const accesoPermitido =
          modo === "todos"
            ? permisosNecesarios.every((permiso) =>
                permisosUsuario.includes(permiso)
              )
            : permisosNecesarios.some((permiso) =>
                permisosUsuario.includes(permiso)
              );

        if (componenteActivo) {
          setTieneAcceso(accesoPermitido);
          setCargando(false);
        }
      } catch (error) {
        console.error("Error al validar permisos:", error);

        if (componenteActivo) {
          setTieneAcceso(false);
          setCargando(false);
        }
      }
    }

    cargarYValidarPermisos();

    return () => {
      componenteActivo = false;
    };
  }, [permisoRequerido, permisosRequeridos, modo]);

  if (cargando) {
    return (
      <main className="container py-5">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-4">
            <p className="text-muted mb-0">Verificando permisos...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!tieneAcceso) {
    return (
      <Navigate
        to="/panel/acceso-denegado"
        replace
        state={{ desde: location.pathname }}
      />
    );
  }

  return children;
}

export default RutaPorPermiso;