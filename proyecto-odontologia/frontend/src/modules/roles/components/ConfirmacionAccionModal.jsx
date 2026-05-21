function ConfirmacionAccionModal({
    abierto,
    titulo,
    descripcion,
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    tipo = "peligro",
    cargando = false,
    onConfirmar,
    onCancelar,
  }) {
    if (!abierto) return null;
  
    return (
      <div className="modal-confirmacion__overlay">
        <div className="modal-confirmacion">
          <div
            className={
              tipo === "exito"
                ? "modal-confirmacion__icono modal-confirmacion__icono--exito"
                : "modal-confirmacion__icono modal-confirmacion__icono--peligro"
            }
          >
            {tipo === "exito" ? "↻" : "!"}
          </div>
  
          <div className="modal-confirmacion__contenido">
            <h2>{titulo}</h2>
            <p>{descripcion}</p>
          </div>
  
          <div className="modal-confirmacion__acciones">
            <button
              type="button"
              className="modal-confirmacion__boton modal-confirmacion__boton--secundario"
              onClick={onCancelar}
              disabled={cargando}
            >
              {textoCancelar}
            </button>
  
            <button
              type="button"
              className={
                tipo === "exito"
                  ? "modal-confirmacion__boton modal-confirmacion__boton--exito"
                  : "modal-confirmacion__boton modal-confirmacion__boton--peligro"
              }
              onClick={onConfirmar}
              disabled={cargando}
            >
              {cargando ? "Procesando..." : textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  export default ConfirmacionAccionModal;