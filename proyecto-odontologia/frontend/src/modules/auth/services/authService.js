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