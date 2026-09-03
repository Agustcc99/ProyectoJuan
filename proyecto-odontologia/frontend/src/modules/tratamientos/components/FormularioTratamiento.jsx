import { useMemo, useState } from "react";

/*
  Formulario de alta y edición de un tratamiento.

  - modo: "crear" | "editar".
  - tratamiento: datos a precargar (en "editar", y opcionalmente en "crear" para
    fijar el paciente desde la ficha).
  - opciones: { tipos, estados, pacientes } que llegan de GET /api/tratamientos/opciones.
  - pacienteFijo: id de paciente cuando el alta se abre desde la ficha del
    paciente (el selector queda bloqueado).

  Los campos habilitados dependen del estado del tratamiento, replicando la regla
  del backend (tratamientos.service.js → camposEditablesPorEstado):
    pendiente   → todos
    en proceso  → descripción, precio, fecha de fin, observaciones
    finalizado / cancelado → sólo observaciones
*/

const CAMPOS_POR_ESTADO = {
  1: ["id_paciente", "id_tipo_tratamiento", "descripcion", "precio_paciente", "fecha_inicio", "fecha_fin", "observaciones"],
  2: ["descripcion", "precio_paciente", "fecha_fin", "observaciones"],
  3: ["observaciones"],
  4: ["observaciones"],
};

const NOMBRE_ESTADO = {
  1: "pendiente",
  2: "en proceso",
  3: "finalizado",
  4: "cancelado",
};

function valorFecha(valor) {
  return valor ? String(valor).slice(0, 10) : "";
}

function FormularioTratamiento({
  modo = "crear",
  tratamiento = null,
  opciones = { tipos: [], estados: [], pacientes: [] },
  pacienteFijo = null,
  cargando = false,
  erroresBackend = [],
  onGuardar,
  onCancelar,
}) {
  const esEdicion = modo === "editar";
  const idEstado = esEdicion ? Number(tratamiento?.id_estado) : 1;

  const camposEditables = useMemo(
    () => (esEdicion ? CAMPOS_POR_ESTADO[idEstado] || ["observaciones"] : CAMPOS_POR_ESTADO[1]),
    [esEdicion, idEstado]
  );

  const [valores, setValores] = useState(() => ({
    id_paciente: String(
      pacienteFijo || tratamiento?.id_paciente || ""
    ),
    id_tipo_tratamiento: String(tratamiento?.id_tipo_tratamiento || ""),
    descripcion: tratamiento?.descripcion || "",
    precio_paciente: tratamiento?.precio_paciente != null ? String(tratamiento.precio_paciente) : "",
    fecha_inicio: valorFecha(tratamiento?.fecha_inicio),
    fecha_fin: valorFecha(tratamiento?.fecha_fin),
    observaciones: tratamiento?.observaciones || "",
  }));

  const [erroresCliente, setErroresCliente] = useState([]);

  const pacienteBloqueado = Boolean(pacienteFijo);

  function habilitado(campo) {
    if (cargando) return false;
    if (campo === "id_paciente" && pacienteBloqueado) return false;
    return camposEditables.includes(campo);
  }

  function cambiar(campo, valor) {
    setValores((previo) => ({ ...previo, [campo]: valor }));
  }

  function validarEnCliente() {
    const errores = [];

    if (!esEdicion || camposEditables.includes("id_paciente")) {
      if (!valores.id_paciente) errores.push("El paciente es obligatorio.");
    }
    if (!esEdicion || camposEditables.includes("id_tipo_tratamiento")) {
      if (!valores.id_tipo_tratamiento)
        errores.push("El tipo de tratamiento es obligatorio.");
    }
    if (!esEdicion || camposEditables.includes("precio_paciente")) {
      const precio = Number(valores.precio_paciente);
      if (!Number.isFinite(precio) || precio <= 0)
        errores.push("El precio debe ser mayor a cero.");
    }
    if (
      valores.fecha_inicio &&
      valores.fecha_fin &&
      valores.fecha_fin < valores.fecha_inicio
    ) {
      errores.push("La fecha de fin no puede ser anterior a la de inicio.");
    }

    return errores;
  }

  function manejarEnvio(evento) {
    evento.preventDefault();

    const errores = validarEnCliente();
    setErroresCliente(errores);
    if (errores.length > 0) return;

    if (esEdicion) {
      // Sólo se mandan los campos que el estado permite tocar.
      const payload = {};
      for (const campo of camposEditables) {
        if (campo === "id_paciente" || campo === "id_tipo_tratamiento") {
          payload[campo] = Number(valores[campo]);
        } else if (campo === "precio_paciente") {
          payload[campo] = Number(valores.precio_paciente);
        } else {
          payload[campo] = valores[campo].trim ? valores[campo].trim() : valores[campo];
        }
      }
      onGuardar(payload);
      return;
    }

    onGuardar({
      id_paciente: Number(valores.id_paciente),
      id_tipo_tratamiento: Number(valores.id_tipo_tratamiento),
      precio_paciente: Number(valores.precio_paciente),
      descripcion: valores.descripcion.trim() || undefined,
      fecha_inicio: valores.fecha_inicio || undefined,
      observaciones: valores.observaciones.trim() || undefined,
    });
  }

  const errores = [...erroresCliente, ...erroresBackend];

  const pacienteFijoNombre = (() => {
    const p = (opciones.pacientes || []).find(
      (item) => String(item.id) === String(valores.id_paciente)
    );
    if (p) return `${p.apellido}, ${p.nombre}`;
    if (tratamiento?.paciente_apellido)
      return `${tratamiento.paciente_apellido}, ${tratamiento.paciente_nombre}`;
    return "Paciente seleccionado";
  })();

  const soloObservaciones =
    esEdicion && (idEstado === 3 || idEstado === 4);

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion pacientes-form tratamientos-form">
        <div className="modal-confirmacion__contenido">
          <h2>
            {esEdicion ? "Editar tratamiento" : "Nuevo tratamiento"}
          </h2>
          <p>
            {esEdicion
              ? soloObservaciones
                ? `Tratamiento ${NOMBRE_ESTADO[idEstado]}: sólo se pueden editar las observaciones.`
                : idEstado === 2
                ? "Tratamiento en proceso: no se puede cambiar el paciente ni el tipo."
                : "Modificá los datos del tratamiento."
              : "El paciente, el tipo y el precio son obligatorios. El estado inicial es «pendiente»."}
          </p>
        </div>

        {errores.length > 0 && (
          <div className="roles-page__mensaje roles-page__mensaje--error">
            <ul className="pacientes-form__errores">
              {errores.map((error, indice) => (
                <li key={indice}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form className="pacientes-form__cuerpo" onSubmit={manejarEnvio}>
          <div className="pacientes-form__grilla">
            <div className="roles-page__campo">
              <label htmlFor="trat-paciente">Paciente *</label>
              {pacienteBloqueado ? (
                <input
                  id="trat-paciente"
                  type="text"
                  value={pacienteFijoNombre}
                  disabled
                />
              ) : (
                <select
                  id="trat-paciente"
                  value={valores.id_paciente}
                  disabled={!habilitado("id_paciente")}
                  onChange={(e) => cambiar("id_paciente", e.target.value)}
                >
                  <option value="">Seleccioná un paciente…</option>
                  {(opciones.pacientes || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.apellido}, {p.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="roles-page__campo">
              <label htmlFor="trat-tipo">Tipo de tratamiento *</label>
              <select
                id="trat-tipo"
                value={valores.id_tipo_tratamiento}
                disabled={!habilitado("id_tipo_tratamiento")}
                onChange={(e) => cambiar("id_tipo_tratamiento", e.target.value)}
              >
                <option value="">Seleccioná un tipo…</option>
                {(opciones.tipos || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="roles-page__campo">
              <label htmlFor="trat-precio">Precio del paciente *</label>
              <input
                id="trat-precio"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={valores.precio_paciente}
                disabled={!habilitado("precio_paciente")}
                onChange={(e) => cambiar("precio_paciente", e.target.value)}
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="trat-fecha-inicio">Fecha de inicio</label>
              <input
                id="trat-fecha-inicio"
                type="date"
                value={valores.fecha_inicio}
                disabled={!habilitado("fecha_inicio")}
                onChange={(e) => cambiar("fecha_inicio", e.target.value)}
              />
            </div>

            {esEdicion && (
              <div className="roles-page__campo">
                <label htmlFor="trat-fecha-fin">Fecha de fin</label>
                <input
                  id="trat-fecha-fin"
                  type="date"
                  value={valores.fecha_fin}
                  disabled={!habilitado("fecha_fin")}
                  onChange={(e) => cambiar("fecha_fin", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="roles-page__campo">
            <label htmlFor="trat-descripcion">Descripción</label>
            <textarea
              id="trat-descripcion"
              rows={2}
              maxLength={2000}
              value={valores.descripcion}
              disabled={!habilitado("descripcion")}
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
          </div>

          <div className="roles-page__campo">
            <label htmlFor="trat-observaciones">Observaciones</label>
            <textarea
              id="trat-observaciones"
              rows={3}
              maxLength={2000}
              value={valores.observaciones}
              disabled={!habilitado("observaciones")}
              onChange={(e) => cambiar("observaciones", e.target.value)}
            />
          </div>

          <div className="modal-confirmacion__acciones">
            <button
              type="button"
              className="modal-confirmacion__boton modal-confirmacion__boton--secundario"
              onClick={onCancelar}
              disabled={cargando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="modal-confirmacion__boton modal-confirmacion__boton--exito"
              disabled={cargando}
            >
              {cargando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioTratamiento;
