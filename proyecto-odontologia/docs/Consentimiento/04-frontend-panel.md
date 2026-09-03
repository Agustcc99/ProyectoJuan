# Conversación 4 — Frontend (panel: sección en la ficha del tratamiento)

> Requiere: `docs/abm/00-contexto-base.md` + `docs/Consentimiento/00-contexto-y-arquitectura.md`
> + Conversación 2 aplicada (endpoints del panel). La 3 puede no estar aún: esta sección se
> puede construir y probar contra sesiones "pendientes" (el QR y el listado ya funcionan);
> el estado "firmado" y "Ver PDF" se prueban de punta a punta cuando la 3 y la 5 estén.
> Entregable: `frontend/src/modules/consentimientos/` (service + 3 componentes), integración
> en `DetalleTratamientoPage.jsx`. **Sin dependencias nuevas.**

---

## Objetivo

Dentro de la ficha del tratamiento (`DetalleTratamientoPage.jsx`), una sección
**"Consentimientos"** — espejo de `SeccionPagosTratamiento.jsx` / `SeccionGastosTratamiento.jsx` — que permite:

1. Ver las sesiones de firma del tratamiento y el estado de cada documento.
2. **Generar** una sesión nueva eligiendo plantillas → mostrar el **QR** para la tablet.
3. Mientras el QR está en pantalla, **ver en vivo** (polling) cómo el paciente va firmando.
4. **Ver / descargar** el PDF de cada documento firmado.
5. **Anular** un documento firmado (motivo).

---

## Estructura del módulo (patrón `contexto-base.md` §"Estructura de un módulo frontend")

```
frontend/src/modules/consentimientos/
  components/SeccionConsentimientosTratamiento.jsx   → bloque embebido en el detalle del tratamiento
  components/GenerarConsentimientoModal.jsx          → elegir plantillas → mostrar QR + polling del progreso
  components/AnularConsentimientoModal.jsx           → motivo de anulación (mín. 5)
  services/consentimientosService.js                 → funciones axios (usan `api`, devuelven respuesta.data)
  styles/consentimientos.css                         → si hace falta (preferir clases del panel ya existentes)
```

Referencia canónica de estilo y estados: `frontend/src/modules/pagos/components/SeccionPagosTratamiento.jsx`
+ `frontend/src/modules/pagos/components/AnularPagoModal.jsx`.

---

## `services/consentimientosService.js`

`import api from "../../../services/api";` — `api` ya inyecta el JWT y maneja el 401.
Cada función devuelve `respuesta.data` (`{ ok, mensaje, ... }`).

| Función | Llama a | Nota |
|---|---|---|
| `obtenerPlantillas()` | `GET /consentimientos/plantillas` | |
| `generarSesion({ id_tratamiento, id_plantillas })` | `POST /consentimientos/sesiones` | Devuelve `{ sesion, url_firma, qr_dataurl }`. |
| `obtenerSesionesPorTratamiento(idTratamiento)` | `GET /consentimientos/sesiones?id_tratamiento=` | |
| `cancelarSesion(idSesion, motivo)` | `PATCH /consentimientos/sesiones/:id/cancelar` | |
| `anularConsentimiento(idConsentimiento, motivo)` | `PATCH /consentimientos/:id/anular` | |
| `descargarPdf(idConsentimiento, { descargar })` | `GET /consentimientos/:id/pdf` con `responseType: "blob"` | Devuelve el `Blob`. |

### Ver/descargar el PDF (detalle importante)

El endpoint del PDF requiere el header `Authorization`, así que **no se puede** abrir con un
`<a href>` directo. Patrón:

```
const blob = await consentimientosService.descargarPdf(id, { descargar: false });
const url = URL.createObjectURL(blob);           // blob es application/pdf
window.open(url, "_blank");                       // o asignarlo a un <a download> temporal
setTimeout(() => URL.revokeObjectURL(url), 60000);
```

Para "Descargar": crear un `<a>` en memoria con `download="consentimiento-<id>.pdf"` y
`href = url`, `a.click()`, revocar.

---

## `SeccionConsentimientosTratamiento.jsx`

**Props:** `idTratamiento`, `estadoTratamiento` (id o nombre — para saber si está cancelado),
`onCambio` (callback opcional para refrescar la ficha, como hace `SeccionPagosTratamiento`).

**Permisos** (`const { tienePermiso } = useAuth();`):
- `ver_consentimientos` → sin esto, la sección **no se renderiza** (o muestra un aviso sutil).
  *(La ruta de la ficha ya exige `ver_tratamientos`; la sección se auto-oculta si falta `ver_consentimientos`.)*
- `generar_consentimientos` → muestra el botón "Generar consentimiento".
- `anular_consentimientos` → muestra "Anular" por documento firmado.

**Estados de componente** (mismos nombres que el resto: `cargando`, `mensajeError`,
`mensajeExito`): carga `obtenerSesionesPorTratamiento(idTratamiento)` al montar y tras cada acción.

**Layout:**
- Encabezado: título "Consentimientos" + botón "Generar consentimiento"
  (deshabilitado con tooltip si el tratamiento está `cancelado`, o si falta el permiso).
- Si no hay sesiones: estado vacío ("Todavía no se generaron consentimientos para este tratamiento.").
- Por cada **sesión** (más reciente primero): tarjeta con
  - Badge de estado (`pendiente` gris · `parcial` azul · `completa` verde · `expirada` gris tachado · `cancelada` rojo).
  - `Generada por {generada_por} · {fecha}` · `Vence {token_expira}` (si aplica).
  - Si `firmante.dni_ultimos4`: `Firmada por DNI ••••{dni_ultimos4}`.
  - Tabla de documentos: `#orden · título · badge de estado · fecha_firma` +
    acciones por fila: **Ver PDF** / **Descargar** (si `firmado`), **Anular** (si `firmado` + permiso).
  - Si la sesión está `pendiente`/`parcial` y no venció: botón **"Mostrar QR"** (reabre el
    modal en modo "seguimiento", sin volver a generar) y **"Cancelar sesión"** (si permiso).

> El `qr_dataurl` **no** viene en el listado de sesiones (solo en el `POST`). Para "Mostrar
> QR" de una sesión ya creada, hay dos opciones — decidir en la conversación:
> **(a)** el `GET /sesiones` incluye también `qr_dataurl` regenerado desde el `token_hash`…
> **no se puede** (no tenemos el token en claro).
> **(b)** guardar el `qr_dataurl` + `url_firma` en estado del componente al generarla, y si
> el usuario recarga la página, "Mostrar QR" queda deshabilitado con la leyenda
> *"El QR solo se muestra al generarlo. Si lo perdiste, cancelá la sesión y generá otra."*.
> → **Ir por (b)**: es lo honesto con el modelo de token. Documentarlo en la UI.

---

## `GenerarConsentimientoModal.jsx`

Dos modos en un mismo modal:

### Modo "selección"
- Carga `obtenerPlantillas()`.
- Lista con **checkboxes**: `titulo` de cada plantilla activa. Al menos una tildada para
  habilitar "Generar".
- Botón "Generar" → `generarSesion({ id_tratamiento, id_plantillas })` → pasa a modo "QR".

### Modo "QR / seguimiento"
- Muestra `<img src={qr_dataurl} alt="Código QR para firmar" />` grande (~280–320px).
- Debajo: la `url_firma` como texto seleccionable + botón "Copiar enlace".
- Instrucción: *"Escaneá este código con la tablet. El enlace vence en 30 minutos."*
- **Polling**: cada **5 s**, `obtenerSesionesPorTratamiento(idTratamiento)`, buscar esta
  `id_sesion`, y mostrar el progreso: `Firmado 1 de 2` + lista de documentos con su estado.
  - `setInterval` en un `useEffect`, **limpiado al cerrar el modal** y al desmontar.
  - Cuando la sesión llega a `completa` → mensaje de éxito verde
    (*"¡Listo! El paciente firmó los 2 documentos."*), frenar el polling, botón "Cerrar".
  - Si pasa a `expirada`/`cancelada` → aviso y frenar el polling.
- Al cerrar el modal (en cualquier modo) → refrescar la sección.

> **No** hacer polling fuera del modal (no cargar el navegador con timers si nadie está
> mirando el QR). La sección se refresca al montar y tras cada acción; con eso alcanza.

---

## `AnularConsentimientoModal.jsx`

Calcado de `AnularPagoModal.jsx`: textarea "Motivo de la anulación", validación cliente
(≥ 5, `trim`), botón "Anular consentimiento" (rojo), muestra el `error.response?.data?.mensaje`
del backend. Al confirmar → `anularConsentimiento(id, motivo)` → cerrar + refrescar.

---

## Integración en `DetalleTratamientoPage.jsx`

Único cambio en un archivo ajeno (autorizado por `00-contexto` §10):

```jsx
import SeccionConsentimientosTratamiento from "../../consentimientos/components/SeccionConsentimientosTratamiento";
// ...
// después de <SeccionGastosTratamiento ... />:
<SeccionConsentimientosTratamiento
  idTratamiento={tratamiento.id_tratamiento}
  estadoTratamiento={tratamiento.id_estado}
  onCambio={recargarTratamiento}   // el nombre real del callback que ya usa la página
/>
```

Ver las líneas 315–321 de `DetalleTratamientoPage.jsx` para el patrón exacto de props que
usan las secciones de pagos y gastos, y replicarlo.

**No se toca** `AppRouter.jsx` ni `LayoutPrincipal.jsx` en esta conversación (el módulo no
tiene página propia ni ítem de menú).

---

## Estilo

Bootstrap 5 + clases del panel ya usadas (`panel-card`, `page-header`, `panel-btn-primary`,
badges de Bootstrap). Reusar `roles.css` / `pacientes.css` / `tratamientos.css` que ya
importa `DetalleTratamientoPage.jsx` antes de agregar un `consentimientos.css` nuevo.
Mensajes de error: `error.response?.data?.mensaje`; el 403 → "No tenés permisos…".

---

## Checklist de aceptación (Conversación 4)

- [ ] `modules/consentimientos/` (front) con service + 3 componentes; sin dependencias nuevas.
- [ ] Sección "Consentimientos" visible en la ficha del tratamiento, después de "Gastos imputados".
- [ ] Sin `ver_consentimientos`: la sección no se muestra (el resto de la ficha funciona igual).
- [ ] Botón "Generar consentimiento": oculto/deshabilitado sin `generar_consentimientos`; deshabilitado si el tratamiento está cancelado (con tooltip).
- [ ] Modal: carga las 3 plantillas; exige al menos una tildada; al generar muestra el QR (`<img>` del data URI) + enlace + botón copiar.
- [ ] Polling en el modal cada 5 s: el progreso pasa de "0 de N" a "N de N" a medida que se firma (probado contra la Conv. 3, o simulando estados en BD).
- [ ] Al completarse la sesión: mensaje de éxito y el polling se detiene.
- [ ] El `setInterval` se limpia al cerrar el modal y al desmontar (verificado: no quedan timers).
- [ ] Lista de sesiones con badges de estado correctos; documentos con su estado y fecha de firma.
- [ ] "Ver PDF" abre el PDF en una pestaña (vía blob con JWT); "Descargar" baja el archivo con nombre legible.
- [ ] "Anular" (con permiso) sobre un documento firmado: pide motivo ≥ 5, lo marca anulado, el PDF sigue disponible.
- [ ] "Cancelar sesión" (con permiso) sobre una sesión pendiente/parcial: la marca cancelada.
- [ ] "Mostrar QR" de una sesión ya creada tras recargar la página: deshabilitado con la leyenda explicativa.
- [ ] Errores del backend se muestran con su `mensaje`; 403 legible.

---

## Qué queda para la Conversación 5

La pantalla que ve el paciente en la tablet: ruta pública `/firmar/:token`, asistente
identidad → documento → lienzo → siguiente → éxito, con la dependencia nueva
`react-signature-canvas` y un cliente axios público separado.
Ver [`05-frontend-firma-tablet.md`](05-frontend-firma-tablet.md).
