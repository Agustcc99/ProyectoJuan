import { useMemo, useState } from "react";

/*
  Modal para cambiar el estado de un tratamiento.

  Sólo ofrece las transiciones que el backend declara como alcanzables
  (tratamiento.transiciones_posibles). Si el destino es «cancelado» exige un
  motivo de al menos 5 caracteres, igual que la regla del service.

  - puedeCancelar: si el usuario no tiene el permiso cancelar_tratamientos, la
    opción «cancelado» no se muestra.
*/

const MOTIVO_MIN = 5;

function CambiarEstadoModal({
  abierto,
  tratamiento,
  puedeCancelar = false,
  cargando = false,
  onConfirmar,
  onCancelar,
}) {
  const transiciones = useMemo(() => {
    const posibles = tratamiento?.transiciones_posibles || [];
    return posibles.filter((t) => t.id_estado !== 4 || puedeCancelar);
  }, [tratamiento, puedeCancelar]);

  const [idEstado, setIdEstado] = useState(
    transiciones.length > 0 ? String(transiciones[0].id_estado) : ""
  );
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  if (!abierto) return null;

  const destino = transiciones.find(
    (t) => String(t.id_estado) === String(idEstado)
  );
  const requiereMotivo = Boolean(destino?.requiere_motivo);

  function confirmar() {
    if (!idEstado) {
      setError("Elegí un estado destino.");
      return;
    }
    if (requiereMotivo && motivo.trim().length < MOTIVO_MIN) {
      setError(`El motivo de cancelación debe tener al menos ${MOTIVO_MIN} caracteres.`);
      return;
    }
    setError("");
    onConfirmar({
      id_estado: Number(idEstado),
      motivo: requiereMotivo ? motivo.trim() : undefined,
    });
  }

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion tratamientos-estado-modal">
        <div className="modal-confirmacion__contenido">
          <h2>Cambiar estado del tratamiento</h2>
          <p>
            Estado actual:{" "}
            <strong>{tratamiento?.estado_nombre}</strong>.
          </p>
        </div>

        {transiciones.length === 0 ? (
          <div className="roles-page__mensaje roles-page__mensaje--advertencia">
            No hay transiciones disponibles desde este estado.
          </div>
        ) : (
          <div className="pacientes-form__cuerpo">
            <div className="roles-page__campo">
              <label htmlFor="estado-destino">Nuevo estado</label>
              <select
                id="estado-destino"
                value={idEstado}
                disabled={cargando}
                onChange={(e) => {
                  setIdEstado(e.target.value);
                  setError("");
                }}
              >
                {transiciones.map((t) => (
                  <option key={t.id_estado} value={t.id_estado}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {requiereMotivo && (
              <div className="roles-page__campo">
                <label htmlFor="estado-motivo">Motivo de cancelación *</label>
                <textarea
                  id="estado-motivo"
                  rows={3}
                  maxLength={255}
                  value={motivo}
                  disabled={cargando}
                  placeholder="Ej.: El paciente no continuó el tratamiento"
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    setError("");
                  }}
                />
              </div>
            )}

            {error && (
              <div className="roles-page__mensaje roles-page__mensaje--error">
                {error}
              </div>
            )}
          </div>
        )}

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
            type="button"
            className={
              requiereMotivo
                ? "modal-confirmacion__boton modal-confirmacion__boton--peligro"
                : "modal-confirmacion__boton modal-confirmacion__boton--exito"
            }
            onClick={confirmar}
            disabled={cargando || transiciones.length === 0}
          >
            {cargando ? "Procesando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CambiarEstadoModal;
