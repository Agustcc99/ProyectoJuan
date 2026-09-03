# Conversación 2 — Backend (panel autenticado)

> Requiere: `docs/abm/00-contexto-base.md` + `docs/Consentimiento/00-contexto-y-arquitectura.md`
> + Conversación 1 aplicada (tablas + seed + permisos).
> Entregable: módulo `backend/src/modules/consentimientos/` (routes/service/validator),
> alta en `app.js`, dependencia `qrcode`. **Sin la parte pública** (eso es la Conv. 3).

---

## Objetivo

Todo lo que el **usuario del consultorio** hace desde el panel:

1. Ver las plantillas disponibles.
2. **Generar una sesión de firma** con 1..N documentos → obtener URL + QR.
3. Listar las sesiones/documentos de un tratamiento (para la ficha).
4. **Descargar el PDF** de un consentimiento firmado.
5. **Anular** un consentimiento firmado (motivo).
6. **Cancelar** una sesión pendiente (invalida el QR).

La firma en sí (endpoints públicos, sellado del PDF) es la **Conversación 3**. Este módulo
deja el `service` con las reglas de sesión, snapshot y estados listas para que la Conv. 3
las reutilice.

---

## Estructura del módulo (patrón `contexto-base.md`)

```
backend/src/modules/consentimientos/
  consentimientos.routes.js      → endpoints autenticados. verificarToken + verificarPermiso. SIN try/catch.
  consentimientos.service.js     → reglas de negocio + acceso a datos (poolDeConexiones). Lanza Error con .statusCode.
  consentimientos.validator.js   → middlewares de validación (array `errores` → enviarError(res, 400, ..., errores)).
  consentimientos.pdf.js         → (se crea en la Conv. 3) armado del PDF con pdfkit + huella SHA-256.
  publico.routes.js              → (Conv. 3) router sin auth.
```

En esta conversación se crean **routes / service / validator**. `consentimientos.pdf.js` y
`publico.routes.js` los agrega la Conv. 3.

Registrar en `backend/src/app.js` (junto a los demás `app.use`):

```js
const consentimientosRoutes = require("./modules/consentimientos/consentimientos.routes");
app.use("/api/consentimientos", consentimientosRoutes);
```

Instalar: `cd backend && npm install qrcode` (agrega `qrcode` a `dependencies`).

---

## Constantes del service

```
TTL_SESION_MINUTOS         = 30
MAX_INTENTOS_DNI           = 5     (se usa en la Conv. 3, pero la constante vive acá)
MOTIVO_MIN                 = 5     (anulación y cancelación)
ESTADOS_TRATAMIENTO_BLOQUEA_GENERACION = [4]   // 'cancelado'
ESTADO_DOC   = { PENDIENTE: 'pendiente_firma', FIRMADO: 'firmado', ANULADO: 'anulado' }
ESTADO_SESION = { PENDIENTE: 'pendiente', PARCIAL: 'parcial', COMPLETA: 'completa', EXPIRADA: 'expirada', CANCELADA: 'cancelada' }
```

Token: `crypto.randomBytes(32).toString("base64url")` → `token_hash = sha256(token)`
(`crypto.createHash("sha256").update(token).digest("hex")`).

---

## Endpoints — `/api/consentimientos`

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/plantillas` | `ver_consentimientos` | Plantillas **activas** del consultorio (`id, codigo, titulo, version`). Para el modal de selección. |
| POST | `/sesiones` | `generar_consentimientos` | Crea una sesión + N documentos con snapshot. Devuelve `{ sesion, url_firma, qr_dataurl }`. |
| GET | `/sesiones` | `ver_consentimientos` | `?id_tratamiento=` (obligatorio). Lista sesiones del tratamiento con sus documentos y estado. Aplica **expiración perezosa**. |
| GET | `/sesiones/:id` | `ver_consentimientos` | Detalle de una sesión (mismos datos que arriba, una sola). |
| PATCH | `/sesiones/:id/cancelar` | `generar_consentimientos` | `{ motivo }` (≥ 5). Solo si `estado ∈ {pendiente, parcial}`. Invalida el token (estado → `cancelada`). Documentos ya firmados se conservan. |
| GET | `/:id/pdf` | `ver_consentimientos` | Devuelve el PDF (`Content-Type: application/pdf`). Solo si el documento está `firmado`. `?descargar=1` → `Content-Disposition: attachment`; por defecto `inline`. |
| PATCH | `/:id/anular` | `anular_consentimientos` | `{ motivo }` (≥ 5). Solo si `estado = firmado`. `estado → anulado`, guarda actor/fecha/motivo. El PDF y la huella **se conservan**. |

Todas las rutas: `verificarToken` primero, `verificarPermiso(...)` después, luego el
validator, luego el handler que llama al service. **Sin `try/catch`** (los errores con
`.statusCode` los toma el `errorMiddleware`). Respuestas con `enviarExito` / `enviarError`.

Orden en el router: `/plantillas` y `/sesiones*` **antes** de `/:id/...` para que no se
interprete `sesiones` como un id (mismo cuidado que en `tratamientos.routes.js` con `/opciones`).

---

## Contratos

### `GET /api/consentimientos/plantillas`

`200`:
```json
{ "ok": true, "mensaje": "Plantillas obtenidas correctamente.",
  "plantillas": [
    { "id_plantilla": 1, "codigo": "consentimiento_general", "titulo": "Consentimiento informado general", "version": 1 }
  ] }
```

### `POST /api/consentimientos/sesiones`

Body:
```json
{ "id_tratamiento": 1, "id_plantillas": [1, 3] }
```

Reglas de validación / negocio:
- `id_tratamiento` entero > 0, existe y `id_consultorio = req.usuario.id_consultorio` → si no, `404`.
- El tratamiento **no** puede estar `cancelado` (id_estado 4) → `409` *"No se puede generar un consentimiento para un tratamiento cancelado."*.
- `id_plantillas`: array no vacío de enteros; cada uno existe, es del consultorio y está `activo` → si no, `400`.
- Sin duplicados en `id_plantillas` (si vienen, se deduplican).
- El **paciente del tratamiento debe tener DNI** cargado (no NULL / no vacío) → si no, `409`
  *"El paciente no tiene DNI cargado. Cargalo en la ficha del paciente antes de generar el consentimiento."*.
- **Transacción**:
  1. Genera `token` + `token_hash`, `token_expira = NOW() + INTERVAL 30 MINUTE`.
  2. `INSERT` en `consentimiento_sesiones` (`estado = 'pendiente'`, `id_usuario_genera`, `id_paciente` del tratamiento).
  3. Por cada plantilla, en el orden recibido: `INSERT` en `consentimientos` con
     `orden = 1..N`, snapshot de `codigo/titulo/cuerpo/version`, `estado = 'pendiente_firma'`.
  4. Por cada documento: fila en `auditoria_cambios` (`entidad='consentimientos'`,
     `accion='alta'`, `id_usuario = req.usuario.id_usuario`, `campo='estado'`, `valor_nuevo='pendiente_firma'`).
  5. `commit`.
- **URL de firma**: `${FRONTEND_URL}/firmar/${token}`. `FRONTEND_URL` sale de una env nueva
  (`APP_URL_FRONTEND`, con default `http://localhost:5173`). El **token en claro solo se usa
  acá** para armar la URL y el QR; no se persiste ni se vuelve a mostrar.
- **QR**: `await QRCode.toDataURL(url_firma, { margin: 1, width: 512 })` → string
  `data:image/png;base64,...`.

`201`:
```json
{ "ok": true, "mensaje": "Sesión de firma generada correctamente.",
  "sesion": {
    "id_sesion": 7, "id_tratamiento": 1, "estado": "pendiente",
    "token_expira": "2026-09-03T17:12:00.000Z",
    "documentos": [
      { "id_consentimiento": 12, "orden": 1, "titulo_snapshot": "Consentimiento informado general", "estado": "pendiente_firma" },
      { "id_consentimiento": 13, "orden": 2, "titulo_snapshot": "Consentimiento para extracción", "estado": "pendiente_firma" }
    ]
  },
  "url_firma": "http://localhost:5173/firmar/xK3...",
  "qr_dataurl": "data:image/png;base64,iVBORw0KGgo..." }
```

> **Una sola sesión activa por tratamiento a la vez.** Antes de crear, si ya existe una
> sesión `pendiente` o `parcial` no vencida para ese tratamiento → `409`
> *"Ya hay una sesión de firma abierta para este tratamiento. Cancelala o esperá a que venza."*.
> (Evita QRs zombies conviviendo.) Confirmar esta regla con el dueño; si prefiere permitir
> varias, se quita el chequeo.

### `GET /api/consentimientos/sesiones?id_tratamiento=1`

- Valida que el tratamiento sea del consultorio.
- **Expiración perezosa**: por cada sesión leída con `estado ∈ {pendiente, parcial}` y
  `token_expira < NOW()` → `UPDATE ... SET estado = 'expirada'` antes de responder.
- Recalcula el estado mostrado de cada sesión no terminal a partir de sus documentos
  (`pendiente` / `parcial`).

`200`:
```json
{ "ok": true, "mensaje": "Consentimientos obtenidos correctamente.",
  "sesiones": [
    { "id_sesion": 7, "estado": "parcial",
      "fecha_generacion": "...", "generada_por": "Julieta Herrera",
      "token_expira": "...", "fecha_completada": null,
      "firmante": { "dni_ultimos4": "5678", "fecha_identidad": "..." },
      "documentos": [
        { "id_consentimiento": 12, "orden": 1, "titulo": "Consentimiento informado general",
          "estado": "firmado", "fecha_firma": "...", "hash_documento": "9f2c...", "tiene_pdf": true },
        { "id_consentimiento": 13, "orden": 2, "titulo": "Consentimiento para extracción",
          "estado": "pendiente_firma", "fecha_firma": null, "hash_documento": null, "tiene_pdf": false }
      ] }
  ] }
```

- `dni_ultimos4`: últimos 4 de `dni_confirmado` si la identidad se confirmó; si no, `null`.
- **Nunca** devolver `token_hash`, `firmante_ip`, `firmante_user_agent` ni el `cuerpo_snapshot`
  en este listado (el cuerpo es pesado y no hace falta en la ficha).

### `PATCH /api/consentimientos/sesiones/:id/cancelar`

- `{ motivo }` string, `trim`, ≥ 5 → si no, `400`.
- Sesión del consultorio; `estado ∈ {pendiente, parcial}` → si no, `409`
  *"Solo se puede cancelar una sesión que sigue esperando firmas."*.
- Transacción: `estado = 'cancelada'`, `motivo_cancelacion`, `id_usuario_cancela`,
  `fecha_cancelacion = NOW()` + fila en `auditoria_cambios`
  (`entidad='consentimiento_sesiones'`, `accion='cancelacion'`, `id_entidad = id_sesion`, `motivo`).
- `200` con la sesión actualizada.

### `GET /api/consentimientos/:id/pdf`

- Documento del consultorio; `estado = 'firmado'` → si no, `409`
  *"El consentimiento todavía no está firmado."* / `404` si no existe.
- Lee `consentimientos_archivo` (única query que toca esa tabla).
- Responde el buffer: `res.set("Content-Type", "application/pdf")`,
  `Content-Length: pdf_bytes`,
  `Content-Disposition: ${descargar ? "attachment" : "inline"}; filename="consentimiento-<id>-<codigo_plantilla>.pdf"`,
  `res.send(buffer)`. **No** usar `enviarExito` (no es JSON).

### `PATCH /api/consentimientos/:id/anular`

- `{ motivo }` ≥ 5.
- Documento del consultorio; `estado = 'firmado'` → si no, `409`
  (*"Solo se puede anular un consentimiento firmado."* / *"El consentimiento ya está anulado."*).
- Transacción: `estado = 'anulado'`, `motivo_anulacion`, `id_usuario_anula`,
  `fecha_anulacion = NOW()` + `auditoria_cambios` (`accion='anulacion'`, `campo='estado'`,
  `valor_anterior='firmado'`, `valor_nuevo='anulado'`, `motivo`).
- El PDF y `hash_documento` **no se tocan**.
- `200` con el documento actualizado.

---

## `consentimientos.service.js` — funciones esperadas

| Función | Usada por | Nota |
|---|---|---|
| `listarPlantillasActivas(idConsultorio)` | GET /plantillas | |
| `crearSesionDeFirma({ idTratamiento, idPlantillas }, idUsuario, idConsultorio)` | POST /sesiones | Devuelve `{ sesion, token }` (el token en claro solo para que la route arme URL + QR). |
| `listarSesionesPorTratamiento(idTratamiento, idConsultorio)` | GET /sesiones | Aplica expiración perezosa. |
| `obtenerSesion(idSesion, idConsultorio)` | GET /sesiones/:id | |
| `cancelarSesion(idSesion, { motivo }, idUsuario, idConsultorio)` | PATCH /sesiones/:id/cancelar | |
| `obtenerArchivoPdf(idConsentimiento, idConsultorio)` | GET /:id/pdf | `{ buffer, bytes, nombreArchivo }`. |
| `anularConsentimiento(idConsentimiento, { motivo }, idUsuario, idConsultorio)` | PATCH /:id/anular | |
| `expirarSesionesVencidas(...)` *(helper interno)* | listar/obtener | `UPDATE ... WHERE estado IN ('pendiente','parcial') AND token_expira < NOW()`. |
| `recalcularEstadoSesion(conexion, idSesion)` *(helper)* | Conv. 3 lo reusa tras cada firma | Deriva `pendiente/parcial/completa` de los documentos. |

Exportar también las constantes de estado y `TTL_SESION_MINUTOS`, `MAX_INTENTOS_DNI` para
que `publico.routes.js` (Conv. 3) las importe.

---

## `consentimientos.validator.js`

Middlewares (patrón `tratamientos.validator.js`): arman `const errores = []` y responden
`enviarError(res, 400, "Los datos enviados no son válidos.", errores)`.

- `validarIdParam` — `:id` entero > 0.
- `validarIdSesionParam` — `:id` entero > 0.
- `validarQueryTratamiento` — `?id_tratamiento` presente, entero > 0.
- `validarCrearSesion` — `id_tratamiento` entero > 0; `id_plantillas` array no vacío de enteros > 0.
- `validarMotivo` — `motivo` string, `trim`, longitud ≥ 5 (reusar para anular y cancelar).

---

## Variables de entorno nuevas

| Var | Default | Para qué |
|---|---|---|
| `APP_URL_FRONTEND` | `http://localhost:5173` | Base para armar `url_firma` (`${APP_URL_FRONTEND}/firmar/${token}`). En despliegue = la URL pública del frontend. |

Agregar a `backend/.env` (y documentarla en el `.env.example` si existe).

---

## Auditoría (resumen para esta conversación)

| Acción | entidad | id_entidad | Cuándo |
|---|---|---|---|
| `alta` | `consentimientos` | `id_consentimiento` | POST /sesiones, una por documento |
| `anulacion` | `consentimientos` | `id_consentimiento` | PATCH /:id/anular |
| `cancelacion` | `consentimiento_sesiones` | `id_sesion` | PATCH /sesiones/:id/cancelar |

Siempre **dentro de la transacción** del cambio. Actor = `req.usuario.id_usuario`.

---

## Checklist de aceptación (Conversación 2)

- [ ] `npm install qrcode` hecho; `package.json` actualizado.
- [ ] Módulo `modules/consentimientos/` con routes/service/validator; alta en `app.js`.
- [ ] `GET /plantillas` devuelve las 3 plantillas activas del consultorio.
- [ ] `POST /sesiones` con 1 y con varias plantillas: crea sesión + documentos con snapshot; devuelve `url_firma` y `qr_dataurl` (data URI PNG válido).
- [ ] `POST /sesiones` bloquea: tratamiento cancelado (409), tratamiento de otro consultorio (404), plantilla inexistente/inactiva (400), array vacío (400), paciente sin DNI (409).
- [ ] `POST /sesiones` con una sesión ya abierta para el tratamiento → 409 *(si se confirma la regla de "una activa por vez")*.
- [ ] `GET /sesiones?id_tratamiento=` lista con documentos + estado; **no** filtra bien sin el query (400).
- [ ] Expiración perezosa: una sesión con `token_expira` en el pasado aparece como `expirada` tras el GET, y queda persistida.
- [ ] `GET /:id/pdf` → 409 si el documento no está firmado; (se prueba de verdad en la Conv. 3, cuando ya hay PDF).
- [ ] `PATCH /:id/anular`: exige `anular_consentimientos` + motivo ≥ 5; documento `firmado` → `anulado`; el archivo sigue existiendo. Doble anulación → 409.
- [ ] `PATCH /sesiones/:id/cancelar`: exige `generar_consentimientos` + motivo ≥ 5; solo sesiones `pendiente`/`parcial`; token queda inservible.
- [ ] Auditoría: filas de `alta` / `anulacion` / `cancelacion` en `auditoria_cambios`.
- [ ] Aislamiento por consultorio en todas las queries (probado con un tratamiento de otro consultorio).
- [ ] Permisos: 403 sin `ver_` en los GET; 403 sin `generar_` en POST/cancelar; 403 sin `anular_` en anular; 401 sin token.
- [ ] `APP_URL_FRONTEND` en `.env`.
- [ ] Tabla de prueba manual de la API (abajo) ejecutada y adjuntada.

---

## Tabla de prueba manual de la API (Conversación 2)

> Base: `http://localhost:3000/api` · `Authorization: Bearer <JWT>` · `Content-Type: application/json`.
> Estado inicial: tratamiento 1 (Ana Pérez, en proceso, $50.000). Confirmar que el paciente 1 tiene DNI.

| # | Método y ruta | Body | Respuesta esperada |
|---|---|---|---|
| 1 | `GET /consentimientos/plantillas` | — | `200` · 3 plantillas activas |
| 2 | `POST /consentimientos/sesiones` | `{"id_tratamiento":1,"id_plantillas":[1]}` | `201` · `sesion.documentos` con 1 ítem `pendiente_firma`; `url_firma` y `qr_dataurl` presentes |
| 3 | `POST /consentimientos/sesiones` | `{"id_tratamiento":1,"id_plantillas":[1,2,3]}` | `409` si ya hay una sesión abierta *(regla "una activa")*, o `201` con 3 documentos si se permite |
| 4 | `POST /consentimientos/sesiones` | `{"id_tratamiento":1,"id_plantillas":[]}` | `400` · `"Elegí al menos un documento."` |
| 5 | `POST /consentimientos/sesiones` | `{"id_tratamiento":1,"id_plantillas":[999]}` | `400` · `"La plantilla seleccionada no existe o no está activa."` |
| 6 | `POST /consentimientos/sesiones` | `{"id_tratamiento":<cancelado>,"id_plantillas":[1]}` | `409` · `"No se puede generar un consentimiento para un tratamiento cancelado."` |
| 7 | `POST /consentimientos/sesiones` | `{"id_tratamiento":<de otro consultorio>,"id_plantillas":[1]}` | `404` |
| 8 | `GET /consentimientos/sesiones?id_tratamiento=1` | — | `200` · lista con la sesión creada, documentos y estado |
| 9 | `GET /consentimientos/sesiones` | — | `400` · `"Indicá el tratamiento."` |
| 10 | `PATCH /consentimientos/sesiones/<id>/cancelar` | `{"motivo":"se eligió el documento equivocado"}` | `200` · `estado: "cancelada"` |
| 11 | `PATCH /consentimientos/sesiones/<id>/cancelar` | `{"motivo":"otra"}` | `400` · motivo corto |
| 12 | `PATCH /consentimientos/sesiones/<id ya cancelada>/cancelar` | `{"motivo":"cualquiera larga"}` | `409` |
| 13 | `GET /consentimientos/<id>/pdf` (documento pendiente) | — | `409` · `"El consentimiento todavía no está firmado."` |
| 14 | `PATCH /consentimientos/<id>/anular` (documento pendiente) | `{"motivo":"prueba de anulación"}` | `409` · `"Solo se puede anular un consentimiento firmado."` |
| 15 | `GET /consentimientos/plantillas` con rol sin `ver_consentimientos` | — | `403` |
| 16 | `POST /consentimientos/sesiones` con rol sin `generar_consentimientos` | — | `403` |
| 17 | cualquier ruta sin `Authorization` | — | `401` |

---

## Qué queda para la Conversación 3

El módulo público (`/api/publico/consentimientos`): leer el token, confirmar identidad,
firmar cada documento, y el **sellado del PDF con `pdfkit` + huella SHA-256**. Reutiliza el
`service` de esta conversación. Ver [`03-backend-firma-y-sellado.md`](03-backend-firma-y-sellado.md).
