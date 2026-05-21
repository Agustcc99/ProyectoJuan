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