import api from "../../../services/api";

export async function obtenerRoles() {
  const respuesta = await api.get("/roles");
  return respuesta.data;
}

export async function crearRol(datosRol) {
  const respuesta = await api.post("/roles", datosRol);
  return respuesta.data;
}

export async function actualizarRol(idRol, datosRol) {
  const respuesta = await api.put(`/roles/${idRol}`, datosRol);
  return respuesta.data;
}

export async function desactivarRol(idRol) {
  const respuesta = await api.patch(`/roles/${idRol}/desactivar`);
  return respuesta.data;
}

export async function reactivarRol(idRol) {
  const respuesta = await api.patch(`/roles/${idRol}/reactivar`);
  return respuesta.data;
}

export async function obtenerPermisosDelRol(idRol) {
  const respuesta = await api.get(`/roles/${idRol}/permisos`);
  return respuesta.data;
}

export async function actualizarPermisosDelRol(idRol, permisosSeleccionados) {
  const respuesta = await api.put(`/roles/${idRol}/permisos`, {
    permisos: permisosSeleccionados,
  });

  return respuesta.data;
}