import api from "../../../services/api";

/*
  ABM 03 — Tratamientos. Cada función devuelve respuesta.data
  ({ ok, mensaje, ...datos }). El JWT y el manejo del 401 los pone api.js.
*/

export async function obtenerTratamientos({
  idPaciente,
  idEstado,
  idTipo,
  busqueda = "",
  desde,
  hasta,
  orden = "fecha_desc",
  pagina = 1,
  porPagina = 20,
} = {}) {
  const respuesta = await api.get("/tratamientos", {
    params: {
      id_paciente: idPaciente || undefined,
      id_estado: idEstado || undefined,
      id_tipo: idTipo || undefined,
      busqueda: busqueda || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      orden,
      pagina,
      porPagina,
    },
  });
  return respuesta.data;
}

export async function obtenerOpcionesTratamiento() {
  const respuesta = await api.get("/tratamientos/opciones");
  return respuesta.data;
}

export async function obtenerTratamiento(idTratamiento) {
  const respuesta = await api.get(`/tratamientos/${idTratamiento}`);
  return respuesta.data;
}

export async function crearTratamiento(datos) {
  const respuesta = await api.post("/tratamientos", datos);
  return respuesta.data;
}

export async function actualizarTratamiento(idTratamiento, datos) {
  const respuesta = await api.put(`/tratamientos/${idTratamiento}`, datos);
  return respuesta.data;
}

export async function cambiarEstadoTratamiento(idTratamiento, datos) {
  const respuesta = await api.patch(
    `/tratamientos/${idTratamiento}/estado`,
    datos
  );
  return respuesta.data;
}
