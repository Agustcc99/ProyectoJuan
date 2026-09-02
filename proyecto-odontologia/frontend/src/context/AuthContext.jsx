import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  guardarSesionUsuario,
  cerrarSesionUsuario,
  obtenerTokenGuardado,
  obtenerUsuarioGuardado,
  obtenerPermisosGuardados,
  sincronizarSesionUsuario,
  EVENTO_SESION_ACTUALIZADA,
  INTERVALO_REVALIDACION_SESION_MS,
} from "../modules/auth/services/authService";
import { EVENTO_SESION_EXPIRADA } from "../services/api";

/*
  FIX HT4 (AUD-05): contexto de autenticación.

  Centraliza el estado de sesión (token, usuario autenticado y permisos) que antes
  se leía directamente desde localStorage en RutaPrivada, RutaPorPermiso y
  LayoutPrincipal. Los componentes ahora consumen este contexto con useAuth().

  authService sigue siendo la única capa que persiste la sesión en localStorage:
  el contexto la usa como adaptador de persistencia y expone el estado a React.
*/

const AuthContext = createContext(null);

const SESION_VACIA = {
  token: null,
  usuario: null,
  permisos: [],
};

function AuthProvider({ children }) {
  /*
    El estado arranca desde lo persistido para que un refresh de página no deje al
    usuario deslogueado mientras se revalida contra el backend.
  */
  const [sesion, setSesion] = useState(() => ({
    token: obtenerTokenGuardado(),
    usuario: obtenerUsuarioGuardado(),
    permisos: obtenerPermisosGuardados(),
  }));

  /*
    FIX HT4 (AUD-05): el aviso de sesión expirada (HT2) también es estado de sesión.
    Vivía en el state de la navegación hacia /login, pero al centralizar la sesión
    ese state se perdía: al vaciarse el contexto, RutaPrivada emite su propio
    <Navigate to="/login"> y pisa la navegación que traía el mensaje. Guardándolo
    acá, la pantalla de login lo lee del contexto y no hay carrera posible.
  */
  const [mensajeSesion, setMensajeSesion] = useState("");

  const limpiarMensajeSesion = useCallback(() => {
    setMensajeSesion("");
  }, []);

  const estaAutenticado = Boolean(sesion.token);

  const iniciarSesion = useCallback((token, usuario) => {
    guardarSesionUsuario(token, usuario);

    setMensajeSesion("");

    setSesion({
      token,
      usuario,
      permisos: [],
    });
  }, []);

  const cerrarSesion = useCallback(() => {
    cerrarSesionUsuario();
    setSesion(SESION_VACIA);
    setMensajeSesion("");
  }, []);

  /*
    FIX HT1 (AUD-01) + HT4: revalidación de permisos y rol contra el backend.
    Queda expuesta en el contexto para que cualquier pantalla pueda pedirla sin
    conocer los detalles del servicio.
  */
  const revalidarSesion = useCallback(() => {
    return sincronizarSesionUsuario();
  }, []);

  /*
    FIX HT4: el contexto es el único suscriptor de los eventos de sesión.
    - sesion:actualizada lo emite authService al revalidar contra el backend.
    - sesion:expirada lo emite el interceptor 401 de api.js (HT2), que ya limpió
      el localStorage; acá sólo hace falta vaciar el estado de React.
  */
  useEffect(() => {
    function manejarSesionActualizada(evento) {
      const permisos = evento.detail?.permisos;
      const usuario = evento.detail?.usuario;

      setSesion((sesionPrevia) => ({
        token: obtenerTokenGuardado() || sesionPrevia.token,
        usuario: usuario || sesionPrevia.usuario,
        permisos: Array.isArray(permisos) ? permisos : sesionPrevia.permisos,
      }));
    }

    function manejarSesionExpirada(evento) {
      setSesion(SESION_VACIA);
      setMensajeSesion(evento.detail?.mensaje || "");
    }

    window.addEventListener(EVENTO_SESION_ACTUALIZADA, manejarSesionActualizada);
    window.addEventListener(EVENTO_SESION_EXPIRADA, manejarSesionExpirada);

    return () => {
      window.removeEventListener(
        EVENTO_SESION_ACTUALIZADA,
        manejarSesionActualizada
      );
      window.removeEventListener(EVENTO_SESION_EXPIRADA, manejarSesionExpirada);
    };
  }, []);

  /*
    FIX HT4: la revalidación periódica de HT1 se traslada acá desde LayoutPrincipal.
    Este es su lugar natural: vive mientras dure la sesión, no mientras esté montada
    una pantalla en particular, y sólo corre si hay un usuario autenticado.
  */
  useEffect(() => {
    if (!estaAutenticado) {
      return undefined;
    }

    function revalidar() {
      sincronizarSesionUsuario().catch((error) => {
        console.error("No se pudo revalidar la sesión del usuario:", error);
      });
    }

    const idIntervalo = window.setInterval(
      revalidar,
      INTERVALO_REVALIDACION_SESION_MS
    );

    function revalidarAlVolverALaPestana() {
      if (document.visibilityState === "visible") {
        revalidar();
      }
    }

    document.addEventListener("visibilitychange", revalidarAlVolverALaPestana);

    return () => {
      window.clearInterval(idIntervalo);
      document.removeEventListener(
        "visibilitychange",
        revalidarAlVolverALaPestana
      );
    };
  }, [estaAutenticado]);

  const tienePermiso = useCallback(
    (codigoPermiso) => sesion.permisos.includes(codigoPermiso),
    [sesion.permisos]
  );

  const tieneAlgunPermiso = useCallback(
    (codigosPermisos = []) =>
      codigosPermisos.some((codigoPermiso) =>
        sesion.permisos.includes(codigoPermiso)
      ),
    [sesion.permisos]
  );

  const valorDelContexto = useMemo(
    () => ({
      token: sesion.token,
      usuario: sesion.usuario,
      permisos: sesion.permisos,
      estaAutenticado,
      mensajeSesion,
      iniciarSesion,
      cerrarSesion,
      revalidarSesion,
      limpiarMensajeSesion,
      tienePermiso,
      tieneAlgunPermiso,
    }),
    [
      sesion,
      estaAutenticado,
      mensajeSesion,
      iniciarSesion,
      cerrarSesion,
      revalidarSesion,
      limpiarMensajeSesion,
      tienePermiso,
      tieneAlgunPermiso,
    ]
  );

  return (
    <AuthContext.Provider value={valorDelContexto}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
