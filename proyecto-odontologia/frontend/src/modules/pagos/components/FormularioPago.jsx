import { useState } from "react";

/*
  Formulario de alta y edición acotada de un pago.

  - modo: "crear" | "editar".
  - idTratamiento: tratamiento contra el que se registra el pago (alta).
  - tratamientoTexto: descripción legible del tratamiento (alta, sólo lectura).
  - pago: datos a precargar en "editar".
  - opciones: { medios } que llegan de GET /api/pagos/opciones.

  En "editar" el monto se muestra deshabilitado: para corregirlo hay que anular
  el pago y registrar uno nuevo (regla del backend). Sólo se envían
  id_medio_pago, fecha_pago y notas.
*/

const MAX_NOTAS = 2000;

function valorFecha(valor) {
  return valor ? String(valor).slice(0, 10) : "";
}

function hoyISO() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
}

function FormularioPago({
  modo = "crear",
  idTratamiento = null,
  tratamientoTexto = "",
  pago = null,
  opciones = { medios: [] },
  cargando = false,
  erroresBackend = [],
  onGuardar,
  onCancelar,
}) {
  const esEdicion = modo === "editar";

  const [valores, setValores] = useState(() => ({
    monto: pago?.monto != null ? String(pago.monto) : "",
    id_medio_pago: String(pago?.id_medio_pago || ""),
    fecha_pago: valorFecha(pago?.fecha_pago),
    notas: pago?.notas || "",
  }));

  const [erroresCliente, setErroresCliente] = useState([]);

  function cambiar(campo, valor) {
    setValores((previo) => ({ ...previo, [campo]: valor }));
  }

  function validarEnCliente() {
    const errores = [];

    if (!esEdicion) {
      const monto = Number(valores.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        errores.push("El monto debe ser mayor a cero.");
      }
    }

    if (!valores.id_medio_pago) {
      errores.push("El medio de pago es obligatorio.");
    }

    if (valores.fecha_pago && valores.fecha_pago > hoyISO()) {
      errores.push("La fecha del pago no puede ser futura.");
    }

    return errores;
  }

  function manejarEnvio(evento) {
    evento.preventDefault();

    const errores = validarEnCliente();
    setErroresCliente(errores);
    if (errores.length > 0) return;

    if (esEdicion) {
      onGuardar({
        id_medio_pago: Number(valores.id_medio_pago),
        fecha_pago: valores.fecha_pago || undefined,
        notas: valores.notas.trim(),
      });
      return;
    }

    onGuardar({
      id_tratamiento: Number(idTratamiento),
      monto: Number(valores.monto),
      id_medio_pago: Number(valores.id_medio_pago),
      fecha_pago: valores.fecha_pago || undefined,
      notas: valores.notas.trim() || undefined,
    });
  }

  const errores = [...erroresCliente, ...erroresBackend];

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion pacientes-form pagos-form">
        <div className="modal-confirmacion__contenido">
          <h2>{esEdicion ? "Editar pago" : "Registrar pago"}</h2>
          <p>
            {esEdicion
              ? "El monto no se edita: para corregirlo, anulá el pago y registrá uno nuevo."
              : "El monto y el medio de pago son obligatorios. Si no indicás fecha, se usa la de hoy."}
          </p>
          {tratamientoTexto && (
            <p className="pagos-form__tratamiento">
              Tratamiento: <strong>{tratamientoTexto}</strong>
            </p>
          )}
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
              <label htmlFor="pago-monto">Monto *</label>
              <input
                id="pago-monto"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={valores.monto}
                disabled={esEdicion || cargando}
                onChange={(e) => cambiar("monto", e.target.value)}
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="pago-medio">Medio de pago *</label>
              <select
                id="pago-medio"
                value={valores.id_medio_pago}
                disabled={cargando}
                onChange={(e) => cambiar("id_medio_pago", e.target.value)}
              >
                <option value="">Seleccioná un medio…</option>
                {(opciones.medios || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="roles-page__campo">
              <label htmlFor="pago-fecha">Fecha del pago</label>
              <input
                id="pago-fecha"
                type="date"
                max={hoyISO()}
                value={valores.fecha_pago}
                disabled={cargando}
                onChange={(e) => cambiar("fecha_pago", e.target.value)}
              />
            </div>
          </div>

          <div className="roles-page__campo">
            <label htmlFor="pago-notas">Notas</label>
            <textarea
              id="pago-notas"
              rows={3}
              maxLength={MAX_NOTAS}
              value={valores.notas}
              disabled={cargando}
              onChange={(e) => cambiar("notas", e.target.value)}
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
              {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioPago;
