import { useState } from "react";

/*
  Formulario de alta y edición acotada de un gasto.

  - modo: "crear" | "editar".
  - gasto: datos a precargar en "editar".
  - opciones: { tipos, tratamientos } que llegan de GET /api/gastos/opciones.
  - idTratamientoFijo: cuando el formulario se abre desde la ficha de un
    tratamiento ("Imputar gasto"), la imputación queda fijada a ese tratamiento.
  - tratamientoTexto: descripción legible del tratamiento fijo (sólo lectura).

  Toggle «Gasto general / De un tratamiento»: en "general" no se envía
  id_tratamiento (o se envía null en edición); en "de un tratamiento" se exige
  elegir uno.

  En "editar" el monto se muestra deshabilitado: para corregirlo hay que anular
  el gasto y registrar uno nuevo (regla del backend). Sólo se envían
  id_tipo_gasto, id_tratamiento, fecha_gasto y descripcion.
*/

const MAX_DESCRIPCION = 2000;

function valorFecha(valor) {
  return valor ? String(valor).slice(0, 10) : "";
}

function hoyISO() {
  const ahora = new Date();
  const desfase = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - desfase).toISOString().slice(0, 10);
}

function FormularioGasto({
  modo = "crear",
  gasto = null,
  opciones = { tipos: [], tratamientos: [] },
  idTratamientoFijo = null,
  tratamientoTexto = "",
  cargando = false,
  erroresBackend = [],
  onGuardar,
  onCancelar,
}) {
  const esEdicion = modo === "editar";
  const imputacionBloqueada = idTratamientoFijo != null;

  const [valores, setValores] = useState(() => {
    const idTratamientoInicial = imputacionBloqueada
      ? String(idTratamientoFijo)
      : gasto?.id_tratamiento != null
      ? String(gasto.id_tratamiento)
      : "";
    return {
      id_tipo_gasto: String(gasto?.id_tipo_gasto || ""),
      monto: gasto?.monto != null ? String(gasto.monto) : "",
      fecha_gasto: valorFecha(gasto?.fecha_gasto),
      descripcion: gasto?.descripcion || "",
      imputa: imputacionBloqueada || idTratamientoInicial !== "",
      id_tratamiento: idTratamientoInicial,
    };
  });

  const [erroresCliente, setErroresCliente] = useState([]);

  function cambiar(campo, valor) {
    setValores((previo) => ({ ...previo, [campo]: valor }));
  }

  function validarEnCliente() {
    const errores = [];

    if (!valores.id_tipo_gasto) {
      errores.push("El tipo de gasto es obligatorio.");
    }

    if (!esEdicion) {
      const monto = Number(valores.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        errores.push("El monto debe ser mayor a cero.");
      }
    }

    if (valores.imputa && !valores.id_tratamiento) {
      errores.push("Elegí el tratamiento al que se imputa el gasto.");
    }

    if (valores.fecha_gasto && valores.fecha_gasto > hoyISO()) {
      errores.push("La fecha del gasto no puede ser futura.");
    }

    if (valores.descripcion.trim().length > MAX_DESCRIPCION) {
      errores.push(
        `La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.`
      );
    }

    return errores;
  }

  function manejarEnvio(evento) {
    evento.preventDefault();

    const errores = validarEnCliente();
    setErroresCliente(errores);
    if (errores.length > 0) return;

    const idTratamiento = valores.imputa
      ? Number(valores.id_tratamiento)
      : null;

    if (esEdicion) {
      onGuardar({
        id_tipo_gasto: Number(valores.id_tipo_gasto),
        id_tratamiento: idTratamiento,
        fecha_gasto: valores.fecha_gasto || undefined,
        descripcion: valores.descripcion.trim(),
      });
      return;
    }

    onGuardar({
      id_tipo_gasto: Number(valores.id_tipo_gasto),
      monto: Number(valores.monto),
      id_tratamiento: idTratamiento ?? undefined,
      fecha_gasto: valores.fecha_gasto || undefined,
      descripcion: valores.descripcion.trim() || undefined,
    });
  }

  const errores = [...erroresCliente, ...erroresBackend];

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion pacientes-form gastos-form">
        <div className="modal-confirmacion__contenido">
          <h2>{esEdicion ? "Editar gasto" : "Registrar gasto"}</h2>
          <p>
            {esEdicion
              ? "El monto no se edita: para corregirlo, anulá el gasto y registrá uno nuevo."
              : "El tipo de gasto y el monto son obligatorios. Si no indicás fecha, se usa la de hoy."}
          </p>
          {imputacionBloqueada && tratamientoTexto && (
            <p className="gastos-form__tratamiento">
              Se imputa al tratamiento: <strong>{tratamientoTexto}</strong>
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
          {!imputacionBloqueada && (
            <div className="roles-page__campo">
              <span className="gastos-form__label">Imputación</span>
              <div className="gastos-form__toggle">
                <label>
                  <input
                    type="radio"
                    name="gasto-imputa"
                    checked={!valores.imputa}
                    disabled={cargando}
                    onChange={() => cambiar("imputa", false)}
                  />
                  Gasto general
                </label>
                <label>
                  <input
                    type="radio"
                    name="gasto-imputa"
                    checked={valores.imputa}
                    disabled={cargando}
                    onChange={() => cambiar("imputa", true)}
                  />
                  De un tratamiento
                </label>
              </div>
            </div>
          )}

          <div className="pacientes-form__grilla">
            <div className="roles-page__campo">
              <label htmlFor="gasto-tipo">Tipo de gasto *</label>
              <select
                id="gasto-tipo"
                value={valores.id_tipo_gasto}
                disabled={cargando}
                onChange={(e) => cambiar("id_tipo_gasto", e.target.value)}
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
              <label htmlFor="gasto-monto">Monto *</label>
              <input
                id="gasto-monto"
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
              <label htmlFor="gasto-fecha">Fecha del gasto</label>
              <input
                id="gasto-fecha"
                type="date"
                max={hoyISO()}
                value={valores.fecha_gasto}
                disabled={cargando}
                onChange={(e) => cambiar("fecha_gasto", e.target.value)}
              />
            </div>
          </div>

          {valores.imputa && !imputacionBloqueada && (
            <div className="roles-page__campo">
              <label htmlFor="gasto-tratamiento">Tratamiento *</label>
              <select
                id="gasto-tratamiento"
                value={valores.id_tratamiento}
                disabled={cargando}
                onChange={(e) => cambiar("id_tratamiento", e.target.value)}
              >
                <option value="">Seleccioná un tratamiento…</option>
                {(opciones.tratamientos || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="roles-page__campo">
            <label htmlFor="gasto-descripcion">Descripción</label>
            <textarea
              id="gasto-descripcion"
              rows={3}
              maxLength={MAX_DESCRIPCION}
              value={valores.descripcion}
              disabled={cargando}
              onChange={(e) => cambiar("descripcion", e.target.value)}
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
              {cargando
                ? "Guardando..."
                : esEdicion
                ? "Guardar cambios"
                : "Registrar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FormularioGasto;
