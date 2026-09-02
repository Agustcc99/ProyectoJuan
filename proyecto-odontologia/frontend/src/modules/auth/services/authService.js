import api from "../../../services/api";

export async function iniciarSesionUsuario(datosLogin) {
  const respuesta = await api.post("/auth/login", datosLogin);
  return respuesta.data;
}

export async function registrarUsuario(datosRegistro) {
  const respuesta = await api.post("/auth/registro", datosRegistro);
  return respuesta.data;
}

export function guardarSesionUsuario(token, usuario) {
  localStorage.setItem("token", token);
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

export function obtenerUsuarioGuardado() {
  const usuarioGuardado = localStorage.getItem("usuario");

  if (!usuarioGuardado) {
    return null;
  }

  try {
    return JSON.parse(usuarioGuardado);
  } catch {
    return null;
  }
}

export function obtenerTokenGuardado() {
  return localStorage.getItem("token");
}

export async function obtenerPermisosUsuarioAutenticado() {
  const respuesta = await api.get("/auth/permisos");
  return respuesta.data;
}

export function guardarPermisosUsuario(permisos) {
  const permisosNormalizados = Array.isArray(permisos) ? permisos : [];
  localStorage.setItem("permisos", JSON.stringify(permisosNormalizados));
}

export function obtenerPermisosGuardados() {
  const permisosGuardados = localStorage.getItem("permisos");

  if (!permisosGuardados) {
    return [];
  }

  try {
    const permisos = JSON.parse(permisosGuardados);
    return Array.isArray(permisos) ? permisos : [];
  } catch {
    return [];
  }
}

export function usuarioTienePermiso(codigoPermiso) {
  const permisos = obtenerPermisosGuardados();
  return permisos.includes(codigoPermiso);
}

/*
  FIX HT1 (AUD-01): nombre del evento que avisa al resto de la app que los permisos
  y el rol vigentes cambiaron, para que las pantallas se actualicen sin recargar.
*/
export const EVENTO_SESION_ACTUALIZADA = "sesion:actualizada";

// FIX HT1: frecuencia de la revalidación periódica de permisos mientras se navega.
export const INTERVALO_REVALIDACION_SESION_MS = 60000;

export function guardarTokenSesion(token) {
  if (token) {
    localStorage.setItem("token", token);
  }
}

function guardarUsuarioSesion(usuario) {
  if (usuario) {
    localStorage.setItem("usuario", JSON.stringify(usuario));
  }
}

function notificarSesionActualizada(permisos, usuario) {
  window.dispatchEvent(
    new CustomEvent(EVENTO_SESION_ACTUALIZADA, {
      detail: { permisos, usuario },
    })
  );
}

async function ejecutarSincronizacionDeSesion() {
  const respuesta = await obtenerPermisosUsuarioAutenticado();

  const permisosRecibidos =
    respuesta?.permisos || respuesta?.data || respuesta || [];

  const permisos = Array.isArray(permisosRecibidos) ? permisosRecibidos : [];

  // FIX HT1: el backend devuelve el rol vigente y un token renovado alineado a ese rol.
  guardarTokenSesion(respuesta?.token);
  guardarUsuarioSesion(respuesta?.usuario);
  guardarPermisosUsuario(permisos);

  const usuario = respuesta?.usuario || obtenerUsuarioGuardado();

  notificarSesionActualizada(permisos, usuario);

  return { permisos, usuario };
}

let sincronizacionEnCurso = null;

/*
  FIX HT1 (AUD-01): revalida contra el backend los permisos y el rol del usuario.
  Reemplaza al cacheo de localStorage: ya no se confía en los permisos guardados.
  Si hay una revalidación en curso se reutiliza, para no duplicar peticiones cuando
  el layout y la ruta protegida se sincronizan al mismo tiempo.
*/
export function sincronizarSesionUsuario() {
  if (sincronizacionEnCurso) {
    return sincronizacionEnCurso;
  }

  sincronizacionEnCurso = ejecutarSincronizacionDeSesion().finally(() => {
    sincronizacionEnCurso = null;
  });

  return sincronizacionEnCurso;
}

export function usuarioTieneAlgunPermiso(codigosPermisos = []) {
  const permisos = obtenerPermisosGuardados();
  return codigosPermisos.some((codigoPermiso) =>
    permisos.includes(codigoPermiso)
  );
}

export function cerrarSesionUsuario() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("permisos");
}

export async function solicitarRecuperacionContrasena(email) {
  const respuesta = await api.post("/auth/solicitar-recuperacion", { email });
  return respuesta.data;
}

export async function restablecerContrasena(tokenRecuperacion, nuevaContrasena) {
  const respuesta = await api.post("/auth/restablecer-contrasena", {
    token: tokenRecuperacion,
    nuevaContrasena,
  });

  return respuesta.data;
}