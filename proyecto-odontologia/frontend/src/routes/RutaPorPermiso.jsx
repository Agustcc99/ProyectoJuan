import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

// FIX HT4 (AUD-05): los permisos llegan del contexto, no de localStorage.
import useAuth from "../hooks/useAuth";

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

  const { permisos, revalidarSesion } = useAuth();

  const permisosNecesarios = normalizarPermisosRequeridos(
    permisoRequerido,
    permisosRequeridos
  );

  /*
    FIX HT1 (AUD-01): los permisos requeridos se serializan para obtener una
    dependencia estable. El valor por defecto [] generaba un arreglo nuevo en cada
    render y volvía a disparar la validación innecesariamente.

    FIX HT1: la clave identifica la validación vigente (ruta + permisos exigidos).
    Mientras no se haya revalidado contra el backend para esta clave, la pantalla
    muestra el estado "verificando permisos".
  */
  const claveValidacion = `${location.pathname}|${JSON.stringify(
    permisosNecesarios
  )}`;

  const [claveRevalidada, setClaveRevalidada] = useState(null);

  /*
    FIX HT1 (AUD-01): se eliminó la condición que sólo consultaba al backend cuando
    el arreglo de permisos de localStorage estaba vacío. Ahora se revalida en cada
    navegación hacia un módulo protegido, de modo que un cambio de permisos o de rol
    se refleja sin cerrar sesión manualmente.
  */
  useEffect(() => {
    let componenteActivo = true;

    async function revalidarPermisos() {
      try {
        if (permisosNecesarios.length > 0) {
          await revalidarSesion();
        }

        if (componenteActivo) {
          setClaveRevalidada(claveValidacion);
        }
      } catch (error) {
        console.error("Error al validar permisos:", error);

        /*
          FIX HT2 (AUD-02): un 401 significa sesión expirada, no falta de permisos.
          El interceptor de api.js ya disparó la redirección al login, así que no se
          marca la validación como completa para no competir con esa navegación.
        */
        if (error.response?.status === 401) {
          return;
        }

        if (componenteActivo) {
          setClaveRevalidada(claveValidacion);
        }
      }
    }

    revalidarPermisos();

    return () => {
      componenteActivo = false;
    };
    // permisosNecesarios queda representado dentro de claveValidacion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveValidacion, revalidarSesion]);

  if (claveRevalidada !== claveValidacion) {
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

  /*
    FIX HT4 (AUD-05): el acceso se evalúa directamente contra los permisos del
    contexto. Como el contexto se actualiza en cada revalidación (incluida la
    periódica de HT1), el usuario que permanece parado en una pantalla pierde el
    acceso apenas se le revocan los permisos, sin necesidad de suscribirse a eventos.
  */
  const tieneAcceso =
    permisosNecesarios.length === 0
      ? true
      : modo === "todos"
      ? permisosNecesarios.every((permiso) => permisos.includes(permiso))
      : permisosNecesarios.some((permiso) => permisos.includes(permiso));

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
