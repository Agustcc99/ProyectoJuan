import api from "../../../services/api";

/*
  ABM 02 — Pacientes. Cada función devuelve respuesta.data
  ({ ok, mensaje, ...datos }). El JWT y el manejo del 401 los pone api.js.
*/

export async function obtenerPacientes({
  busqueda = "",
  estado = "todos",
  pagina = 1,
  porPagina = 20,
} = {}) {
  const respuesta = await api.get("/pacientes", {
    params: { busqueda: busqueda || undefined, estado, pagina, porPagina },
  });
  return respuesta.data;
}

export async function obtenerPaciente(idPaciente) {
  const respuesta = await api.get(`/pacientes/${idPaciente}`);
  return respuesta.data;
}

export async function crearPaciente(datosPaciente) {
  const respuesta = await api.post("/pacientes", datosPaciente);
  return respuesta.data;
}

export async function actualizarPaciente(idPaciente, datosPaciente) {
  const respuesta = await api.put(`/pacientes/${idPaciente}`, datosPaciente);
  return respuesta.data;
}

export async function desactivarPaciente(idPaciente) {
  const respuesta = await api.patch(`/pacientes/${idPaciente}/desactivar`);
  return respuesta.data;
}

export async function reactivarPaciente(idPaciente) {
  const respuesta = await api.patch(`/pacientes/${idPaciente}/reactivar`);
  return respuesta.data;
}
