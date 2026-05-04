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

  return JSON.parse(usuarioGuardado);
}

export function obtenerTokenGuardado() {
  return localStorage.getItem("token");
}

export function cerrarSesionUsuario() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}
export async function solicitarRecuperacionContrasena(email) {
  const respuesta = await api.post("/auth/solicitar-recuperacion", { email });
  return respuesta.data;
}