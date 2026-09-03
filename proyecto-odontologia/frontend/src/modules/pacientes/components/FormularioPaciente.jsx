import { useState } from "react";

/*
  Formulario de alta y edición de la ficha de un paciente.
  - modo: "crear" | "editar".
  - paciente: datos a precargar (sólo en modo "editar").
  - erroresBackend: array de strings devuelto por el validador del backend.

  La página lo monta con una `key` distinta por apertura, así que el estado
  arranca de los props sin necesidad de efectos. La validación de cliente replica
  la del backend (pacientes.validator.js) para no depender del ida y vuelta.
*/

const LIMITES = {
  nombre: { min: 2, max: 50 },
  apellido: { min: 2, max: 50 },
  dni: { min: 7, max: 20 },
  telefono: { max: 20 },
  email: { max: 100 },
  obra_social: { max: 50 },
  observaciones: { max: 2000 },
};

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOLO_DIGITOS = /^\d+$/;

function validarEnCliente(valores) {
  const errores = [];
  const nombre = valores.nombre.trim();
  const apellido = valores.apellido.trim();
  const dni = valores.dni.trim();

  if (nombre.length < LIMITES.nombre.min || nombre.length > LIMITES.nombre.max) {
    errores.push(
      `El nombre debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres.`
    );
  }

  if (
    apellido.length < LIMITES.apellido.min ||
    apellido.length > LIMITES.apellido.max
  ) {
    errores.push(
      `El apellido debe tener entre ${LIMITES.apellido.min} y ${LIMITES.apellido.max} caracteres.`
    );
  }

  if (!SOLO_DIGITOS.test(dni)) {
    errores.push("El DNI debe contener solo números.");
  } else if (dni.length < LIMITES.dni.min || dni.length > LIMITES.dni.max) {
    errores.push(
      `El DNI debe tener entre ${LIMITES.dni.min} y ${LIMITES.dni.max} dígitos.`
    );
  }

  if (valores.email.trim() !== "" && !FORMATO_EMAIL.test(valores.email.trim())) {
    errores.push("El formato del email no es válido.");
  }

  if (valores.fecha_nacimiento !== "") {
    const fecha = new Date(valores.fecha_nacimiento);
    if (Number.isNaN(fecha.getTime())) {
      errores.push("La fecha de nacimiento no es una fecha válida.");
    } else if (fecha.getTime() > Date.now()) {
      errores.push("La fecha de nacimiento no puede ser futura.");
    }
  }

  return errores;
}

function FormularioPaciente({
  modo = "crear",
  paciente = null,
  cargando = false,
  erroresBackend = [],
  onGuardar,
  onCancelar,
}) {
  const [valores, setValores] = useState(() => ({
    nombre: paciente?.nombre || "",
    apellido: paciente?.apellido || "",
    dni: paciente?.dni || "",
    telefono: paciente?.telefono || "",
    email: paciente?.email || "",
    obra_social: paciente?.obra_social || "",
    fecha_nacimiento: paciente?.fecha_nacimiento
      ? String(paciente.fecha_nacimiento).slice(0, 10)
      : "",
    observaciones: paciente?.observaciones || "",
  }));

  const [erroresCliente, setErroresCliente] = useState([]);

  const esEdicion = modo === "editar";

  function cambiar(campo, valor) {
    setValores((previo) => ({ ...previo, [campo]: valor }));
  }

  function manejarEnvio(evento) {
    evento.preventDefault();

    const errores = validarEnCliente(valores);
    setErroresCliente(errores);

    if (errores.length > 0) return;

    onGuardar({
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      dni: valores.dni.trim(),
      telefono: valores.telefono.trim() || undefined,
      email: valores.email.trim() || undefined,
      obra_social: valores.obra_social.trim() || undefined,
      fecha_nacimiento: valores.fecha_nacimiento || undefined,
      observaciones: valores.observaciones.trim() || undefined,
    });
  }

  const errores = [...erroresCliente, ...erroresBackend];

  return (
    <div className="modal-confirmacion__overlay">
      <div className="modal-confirmacion pacientes-form">
        <div className="modal-confirmacion__contenido">
          <h2>{esEdicion ? "Editar ficha del paciente" : "Nuevo paciente"}</h2>
          <p>
            Los campos Nombre, Apellido y DNI son obligatorios. El resto es
            opcional.
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
              <label htmlFor="paciente-nombre">Nombre *</label>
              <input
                id="paciente-nombre"
                type="text"
                value={valores.nombre}
                maxLength={LIMITES.nombre.max}
                disabled={cargando}
                autoFocus
                onChange={(evento) => cambiar("nombre", evento.target.value)}
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="paciente-apellido">Apellido *</label>
              <input
                id="paciente-apellido"
                type="text"
                value={valores.apellido}
                maxLength={LIMITES.apellido.max}
                disabled={cargando}
                onChange={(evento) => cambiar("apellido", evento.target.value)}
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="paciente-dni">DNI *</label>
              <input
                id="paciente-dni"
                type="text"
                inputMode="numeric"
                value={valores.dni}
                maxLength={LIMITES.dni.max}
                disabled={cargando}
                onChange={(evento) => cambiar("dni", evento.target.value)}
                placeholder="Solo números"
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="paciente-fecha-nac">Fecha de nacimiento</label>
              <input
                id="paciente-fecha-nac"
                type="date"
                value={valores.fecha_nacimiento}
                disabled={cargando}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(evento) =>
                  cambiar("fecha_nacimiento", evento.target.value)
                }
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="paciente-telefono">Teléfono</label>
              <input
                id="paciente-telefono"
                type="text"
                value={valores.telefono}
                maxLength={LIMITES.telefono.max}
                disabled={cargando}
                onChange={(evento) => cambiar("telefono", evento.target.value)}
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="paciente-email">Email</label>
              <input
                id="paciente-email"
                type="email"
                value={valores.email}
                maxLength={LIMITES.email.max}
                disabled={cargando}
                onChange={(evento) => cambiar("email", evento.target.value)}
              />
            </div>

            <div className="roles-page__campo">
              <label htmlFor="paciente-obra-social">Obra social</label>
              <input
                id="paciente-obra-social"
                type="text"
                value={valores.obra_social}
                maxLength={LIMITES.obra_social.max}
                disabled={cargando}
                onChange={(evento) =>
                  cambiar("obra_social", evento.target.value)
                }
              />
            </div>
          </div>

          <div className="roles-page__campo">
            <label htmlFor="paciente-observaciones">Observaciones</label>
            <textarea
              id="paciente-observaciones"
              rows={3}
              value={valores.observaciones}
              maxLength={LIMITES.observaciones.max}
              disabled={cargando}
              onChange={(evento) =>
                cambiar("observaciones", evento.target.value)
              }
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

export default FormularioPaciente;
