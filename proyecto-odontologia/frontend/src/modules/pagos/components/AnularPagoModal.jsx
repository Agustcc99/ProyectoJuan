import { useState } from "react";

/*
  Modal de anulación de un pago. El motivo es obligatorio (mín. 5 caracteres),
  igual que la regla del backend. La anulación no se puede revertir.
*/

const MOTIVO_MIN = 5;

function AnularPagoModal({ abierto, pago, cargando = false, onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  if (!abierto) return null;

  function confirmar() {
    if (motivo.trim().length < MOTIVO_MIN) {
      setError(`El motivo debe tener al menos ${MOTIVO_MIN} caracteres.`);
      return;
    }
    setError("");
    onConfirmar(motivo.trim());
  }

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion tratamientos-estado-modal">
        <div className="modal-confirmacion__contenido">
          <h2>Anular pago</h2>
          <p>
            Vas a anular un pago
            {pago?.monto != null
              ? ` de ${new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  minimumFractionDigits: 2,
                }).format(Number(pago.monto))}`
              : ""}
            . No cuenta más para el saldo del tratamiento ni para la caja, y no se
            puede revertir.
          </p>
        </div>

        <div className="pacientes-form__cuerpo">
          <div className="roles-page__campo">
            <label htmlFor="pago-motivo">Motivo de anulación *</label>
            <textarea
              id="pago-motivo"
              rows={3}
              maxLength={255}
              value={motivo}
              disabled={cargando}
              placeholder="Ej.: Pago cargado por error en el tratamiento equivocado"
              onChange={(e) => {
                setMotivo(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && (
            <div className="roles-page__mensaje roles-page__mensaje--error">
              {error}
            </div>
          )}
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
            type="button"
            className="modal-confirmacion__boton modal-confirmacion__boton--peligro"
            onClick={confirmar}
            disabled={cargando}
          >
            {cargando ? "Anulando..." : "Anular pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnularPagoModal;
