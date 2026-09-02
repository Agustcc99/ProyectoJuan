import axios from "axios";
import {
  cerrarSesionUsuario,
  obtenerTokenGuardado,
} from "../modules/auth/services/authService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/*
  FIX HT2 (AUD-02): evento que avisa a la aplicación que la sesión expiró.
  api.js no puede usar el router de React, por lo que notifica y el AppRouter
  se encarga de la redirección a /login.
*/
export const EVENTO_SESION_EXPIRADA = "sesion:expirada";

export const MENSAJE_SESION_EXPIRADA =
  "Tu sesión expiró. Iniciá sesión nuevamente para continuar.";

/*
  FIX HT2: rutas públicas de autenticación. Un 401 en estas rutas significa
  "credenciales incorrectas", no "sesión expirada", así que no deben limpiar la
  sesión ni redirigir: cada pantalla sigue mostrando su propio mensaje de error.
*/
const RUTAS_PUBLICAS_AUTENTICACION = [
  "/auth/login",
  "/auth/registro",
  "/auth/solicitar-recuperacion",
  "/auth/restablecer-contrasena",
];

function esRutaPublicaDeAutenticacion(urlPeticion = "") {
  return RUTAS_PUBLICAS_AUTENTICACION.some((rutaPublica) =>
    urlPeticion.includes(rutaPublica)
  );
}

/*
  FIX HT2: evita que una ráfaga de peticiones fallidas en paralelo dispare varias
  redirecciones seguidas. Sólo se notifica una vez por ventana de tiempo.
*/
let sesionExpiradaNotificada = false;

function notificarSesionExpirada() {
  if (sesionExpiradaNotificada) {
    return;
  }

  sesionExpiradaNotificada = true;

  window.setTimeout(() => {
    sesionExpiradaNotificada = false;
  }, 1000);

  // FIX HT2: se limpian token, usuario y permisos del localStorage.
  cerrarSesionUsuario();

  window.dispatchEvent(
    new CustomEvent(EVENTO_SESION_EXPIRADA, {
      detail: { mensaje: MENSAJE_SESION_EXPIRADA },
    })
  );
}

api.interceptors.request.use((configuracionPeticion) => {
  /*
    FIX HT4 (AUD-05): el token se pide a authService en lugar de leer localStorage
    directamente. Este interceptor vive fuera del árbol de React, así que no puede
    usar useAuth(); authService es la capa de persistencia que el contexto comparte.
  */
  const tokenAutenticacion = obtenerTokenGuardado();

  if (tokenAutenticacion) {
    configuracionPeticion.headers.Authorization = `Bearer ${tokenAutenticacion}`;
  }

  return configuracionPeticion;
});

/*
  FIX HT2 (AUD-02): interceptor de response.
  Detecta el código 401 devuelto por cualquier pantalla que consuma la API, limpia
  los datos de sesión y avisa para que el usuario sea redirigido al login con un
  mensaje claro, en lugar de quedar con pantallas en blanco o errores sin explicación.
*/
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const codigoEstado = error.response?.status;
    const urlPeticion = error.config?.url || "";

    if (codigoEstado === 401 && !esRutaPublicaDeAutenticacion(urlPeticion)) {
      notificarSesionExpirada();
    }

    return Promise.reject(error);
  }
);

export default api;
