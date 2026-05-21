import api from "../../../services/api";

export async function obtenerPermisos() {
  const respuesta = await api.get("/permisos");
  return respuesta.data;
}