import api from "../../../services/api";

export async function obtenerUsuarios() {
  const respuesta = await api.get("/usuarios");
  return respuesta.data;
}

export async function actualizarRolUsuario(idUsuario, idRol) {
  const respuesta = await api.put(`/usuarios/${idUsuario}/rol`, {
    id_rol: idRol,
  });

  return respuesta.data;
}

/*
  FIX HT7 (AUD-09): aprueba a un usuario pendiente (registrado públicamente) y le
  asigna su rol definitivo. Distinto de actualizarRolUsuario: ese endpoint exige
  que el usuario ya esté activo.
*/
export async function aprobarUsuario(idUsuario, idRol) {
  const respuesta = await api.patch(`/usuarios/${idUsuario}/aprobar`, {
    id_rol: idRol,
  });

  return respuesta.data;
}
