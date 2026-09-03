# Conversación 3 — Backend (firma pública + sellado del PDF)

> Requiere: `docs/abm/00-contexto-base.md` + `docs/Consentimiento/00-contexto-y-arquitectura.md`
> + Conversaciones 1 y 2 aplicadas.
> Entregable: router público `modules/consentimientos/publico.routes.js`, armado del PDF
> `modules/consentimientos/consentimientos.pdf.js`, dependencia `pdfkit`,
> `app.set("trust proxy", 1)` + `app.use("/api/publico/consentimientos", ...)` en `app.js`,
> rate limiter dedicado.

---

## Objetivo

Todo lo que ocurre **en la tablet, sin sesión**:

1. `GET /:token` — abrir la sesión de firma, ver el progreso.
2. `POST /:token/identidad` — el paciente confirma su DNI.
3. `GET /:token/documentos/:id` — leer el texto completo de un documento pendiente.
4. `POST /:token/documentos/:id/firmar` — firmar → **sellar el PDF** → marcar `firmado`.

Y el corazón del módulo: **generar el PDF inmutable y su huella SHA-256** en el servidor.

---

## Seguridad de la superficie pública (leer antes de escribir código)

Ver `00-contexto-y-arquitectura.md` §4.1. Resumen operativo:

- El router **no** usa `authMiddleware`. Nada de `req.usuario`.
- La **única** credencial es el `token` de la URL. Se busca por `token_hash = sha256(token)`.
- **Salida mínima**: nunca DNI completo, teléfono, email, obra social, observaciones, ni
  `token_hash`/`firmante_ip`/`firmante_user_agent`.
- **El consultorio y el tratamiento se resuelven desde la sesión**, jamás del request.
- **Anti-replay** en la firma: `UPDATE consentimientos SET ... WHERE id_consentimiento = ?
  AND estado = 'pendiente_firma'` y comprobar `result.affectedRows === 1` dentro de la
  transacción; si es 0 → alguien ya lo firmó o la carrera la ganó otro request → `409`.
- **Rate limiting** por IP en todo el router (abajo).
- **Tope de intentos de DNI**: `MAX_INTENTOS_DNI = 5`. Al 6.º fallo la sesión pasa a
  `cancelada` (`motivo_cancelacion = 'Cancelada automáticamente: demasiados intentos de DNI'`,
  `id_usuario_cancela = NULL`).

### `trust proxy`

En despliegue el backend corre detrás de un proxy (Render, etc.), así que `req.ip` sería la
IP del proxy. Agregar en `app.js`, **antes** de montar rutas:

```js
app.set("trust proxy", 1); // 1 salto: el proxy del hosting. Necesario para req.ip y rate-limit reales.
```

Efecto global: `express-rate-limit` y `req.ip` pasan a leer `X-Forwarded-For`. En local sin
proxy no cambia nada. Documentarlo en el comentario.

---

## Rate limiter dedicado

En `backend/src/middlewares/rateLimitMiddleware.js`, agregar (mismo estilo que
`limitadorLogin` / `limitadorRecuperacion`):

```
limitadorFirmaPublica:
  windowMs: 15 min
  limit: 40           // requests por IP por ventana (holgado: 1 sesión ≈ 4 + N*2 requests)
  standardHeaders: true, legacyHeaders: false
  handler → enviarError(res, 429, "Demasiadas solicitudes. Esperá unos minutos.")
```

Se aplica a nivel de router: `router.use(limitadorFirmaPublica)` en `publico.routes.js`.

---

## Endpoints — `/api/publico/consentimientos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/:token` | Estado de la sesión + progreso. Sin cuerpos de documento. |
| POST | `/:token/identidad` | `{ dni }`. Valida contra `pacientes.DNI`. Fija identidad + IP + UA. |
| GET | `/:token/documentos/:id` | Texto completo (`cuerpo_snapshot`) de un documento **pendiente** de esta sesión. Requiere identidad confirmada. |
| POST | `/:token/documentos/:id/firmar` | `{ firma_base64 }`. Sella el PDF, calcula la huella, marca `firmado`. |

Route param `:token` → validar formato (`base64url`, longitud 43) antes de tocar la BD;
formato inválido → `404` genérico (no revelar).

### Resolución del token (helper común)

```
1. token_hash = sha256(:token)
2. SELECT * FROM consentimiento_sesiones WHERE token_hash = ? LIMIT 1
3. si no existe → 404 { mensaje: "El enlace no es válido." }
4. si estado ∈ {pendiente, parcial} y token_expira < NOW() → UPDATE estado = 'expirada'
5. devolver la sesión (ya con el estado actualizado)
```

---

### `GET /:token`

`200` (identidad NO confirmada):
```json
{ "ok": true,
  "sesion": { "estado": "pendiente", "identidad_confirmada": false, "token_expira": "..." },
  "paciente": { "nombre": "Ana", "dni_ultimos4": "5678" },
  "documentos": [
    { "id_consentimiento": 12, "orden": 1, "titulo": "Consentimiento informado general", "estado": "pendiente_firma" },
    { "id_consentimiento": 13, "orden": 2, "titulo": "Consentimiento para extracción",   "estado": "pendiente_firma" }
  ],
  "siguiente_documento_id": null }
```

- `paciente.nombre` = solo el nombre de pila (`pacientes.NOMBRE`), sin apellido.
- `paciente.dni_ultimos4` = últimos 4 dígitos del DNI real del paciente (para que sepa qué
  ingresar). Nada más.
- Si `sesion.estado ∈ {expirada, cancelada}` → `200` igual pero con `documentos: []` y un
  campo `motivo` legible (`"El enlace venció."` / `"La firma fue cancelada por el consultorio."`).
- Si `sesion.estado = 'completa'` → `200` con `documentos` mostrando todos `firmado` y
  `mensaje_final: "Ya firmaste todos los documentos. ¡Gracias!"`.

`200` (identidad confirmada) agrega `siguiente_documento_id` = el `id_consentimiento` de
menor `orden` que siga `pendiente_firma` (o `null` si no queda ninguno).

### `POST /:token/identidad`

Body: `{ "dni": "12.345.678" }`

- Sesión debe estar `pendiente` o `parcial` → si no, `409` con motivo legible.
- Normalizar el DNI ingresado y el de la ficha con el mismo criterio de `pacientes.service.js`:
  `String(dni).replace(/\s+/g, "").replace(/\./g, "").toLowerCase()` (sin espacios, sin puntos).
- Comparar contra `pacientes.DNI` (del `id_paciente` de la sesión), normalizado igual.
- **Match**:
  - `UPDATE consentimiento_sesiones SET dni_confirmado = <normalizado>, fecha_identidad = NOW(),
     firmante_ip = ?, firmante_user_agent = ? WHERE id_sesion = ?` (solo si `dni_confirmado IS NULL`
     — no re-pisar si ya estaba confirmada).
  - `firmante_ip` = `req.ip` (truncar a 45 chars). `firmante_user_agent` = `req.headers["user-agent"]`
    truncado a 255.
  - `200` con el mismo shape que `GET /:token` (identidad confirmada, `siguiente_documento_id`).
- **No match**:
  - `UPDATE ... SET intentos_dni = intentos_dni + 1`.
  - Si `intentos_dni + 1 >= MAX_INTENTOS_DNI` (6.º) → `UPDATE ... SET estado = 'cancelada',
    motivo_cancelacion = 'Cancelada automáticamente: demasiados intentos de DNI',
    fecha_cancelacion = NOW()` → responder `409`
    *"Se canceló la firma por demasiados intentos. Pedile al consultorio un nuevo enlace."*.
  - Si no llegó al tope → `401` *"El DNI no coincide. Te quedan N intento(s)."*.
- Si la identidad **ya estaba confirmada** y el DNI coincide → `200` idempotente. Si no
  coincide → `409` *"Esta firma ya fue iniciada por otra persona."* (no incrementar intentos).

### `GET /:token/documentos/:id`

- Sesión `pendiente`/`parcial`, identidad confirmada → si no, `409`/`403`.
- El documento debe pertenecer a **esta** sesión y estar `pendiente_firma` → si no, `404`/`409`.
- `200`:
  ```json
  { "ok": true,
    "documento": { "id_consentimiento": 12, "orden": 1, "titulo": "Consentimiento informado general",
                   "cuerpo": "Párrafo 1...\n\nPárrafo 2...", "total": 2 } }
  ```
  `total` = cantidad de documentos de la sesión (para el "1 de 2" del asistente).

### `POST /:token/documentos/:id/firmar`

Body: `{ "firma_base64": "data:image/png;base64,iVBOR..." }`

- **Límite de body solo en esta ruta**: `express.json({ limit: "2mb" })` como middleware
  local del router público (no cambiar el global de `app.js`). Un PNG de lienzo son ~10–50 KB.
- Validaciones:
  - `firma_base64` presente, empieza con `data:image/png;base64,`, decodifica a un buffer
    PNG no vacío (chequear firma de archivo `\x89PNG`), tamaño ≤ 1.5 MB → si no, `400`.
  - Sesión `pendiente`/`parcial`, no vencida, identidad confirmada → si no, `409`/`403`.
  - Documento de esta sesión, `estado = 'pendiente_firma'` → si no, `409`.
- **Transacción** (`getConnection` + `beginTransaction`):
  1. `SELECT ... FOR UPDATE` la fila de `consentimientos` y la de `consentimiento_sesiones`.
  2. Revalidar estados dentro del lock.
  3. `fechaFirma = NOW()` (leer el valor real con un `SELECT NOW()` o `RETURNING`-equivalente:
     hacer el `UPDATE` con `fecha_firma = NOW()` y luego `SELECT fecha_firma` de la fila).
  4. **Armar el PDF** con `consentimientos.pdf.js` (ver abajo) → `bufferPdf`.
  5. **Calcular la huella** (ver abajo) → `hashDocumento`.
  6. `UPDATE consentimientos SET estado='firmado', fecha_firma=<fechaFirma>, hash_documento=?
     WHERE id_consentimiento=? AND estado='pendiente_firma'` → **verificar `affectedRows === 1`**.
  7. `INSERT INTO consentimientos_archivo (id_consentimiento, pdf, firma_png, pdf_bytes)
     VALUES (?, ?, ?, ?)`.
  8. `recalcularEstadoSesion(conexion, idSesion)` (helper del service de la Conv. 2):
     - todos `firmado` → `estado='completa'`, `fecha_completada = NOW()`.
     - alguno firmado, quedan pendientes → `estado='parcial'`.
  9. `commit`.
- **No se escribe en `auditoria_cambios`** (el actor es el paciente; ver `00-contexto` §8).
- `200`:
  ```json
  { "ok": true, "mensaje": "Documento firmado correctamente.",
    "progreso": { "firmados": 1, "total": 2, "sesion_estado": "parcial",
                  "siguiente_documento_id": 13 } }
  ```

---

## `consentimientos.pdf.js` — armado del PDF

Función `construirPdfConsentimiento(datos) → Promise<Buffer>` donde `datos` trae todo lo
necesario **ya resuelto** (no hace queries): 

```
{ id_consentimiento, id_sesion, id_consultorio, id_tratamiento, id_paciente,
  codigo_plantilla, version_plantilla, titulo_snapshot, cuerpo_snapshot,
  paciente_nombre, paciente_apellido, dni_confirmado,
  tratamiento_tipo, tratamiento_descripcion,
  fecha_firma,           // Date del servidor
  hash_documento,        // se pasa ya calculado para imprimirlo en el pie
  firma_png_buffer }     // Buffer del PNG
```

Estructura del documento (pdfkit, A4, márgenes ~50pt):

1. **Encabezado**: `Odontología Herrera` (negrita, ~16pt). Línea fina debajo. *(logo: más adelante)*
2. **Título del documento**: `titulo_snapshot` (negrita, ~14pt), centrado.
3. **Bloque de datos** (tabla simple o líneas):
   - `Paciente: {paciente_nombre} {paciente_apellido}`
   - `DNI: {dni_confirmado}`  *(el confirmado en la tablet; acá sí va completo — es el doc legal)*
   - `Tratamiento: #{id_tratamiento} — {tratamiento_tipo}` + descripción si hay.
4. **Cuerpo legal**: `cuerpo_snapshot`, separando en párrafos por `\n\n`, justificado, ~11pt.
   Manejar salto de página automático de pdfkit.
5. **Firma**:
   - Texto `Firma del paciente:`
   - `doc.image(firma_png_buffer, { fit: [220, 90] })` sobre una línea base.
6. **Fecha y hora**: `Firmado el {DD/MM/YYYY} a las {HH:MM} ART (UTC−3)`.
   Formatear `fecha_firma` (que viene en hora del servidor) explicitando la zona. Si el
   servidor está en UTC, convertir a UTC−3 para mostrar y aclarar la zona; guardar/loguear en UTC.
7. **Pie de integridad** (~8pt, gris):
   - `Documento firmado electrónicamente conforme Ley 25.506. Consentimiento informado — Ley 26.529.`
   - `Huella de integridad (SHA-256): {hash_documento}`
   - `Sesión #{id_sesion} · Consentimiento #{id_consentimiento} · Plantilla {codigo_plantilla} v{version_plantilla}`
8. Numeración de página `Página X de Y` en el pie si el doc tiene >1 página.

Recolectar el output con un stream a buffer (`doc.on("data", ...)` / `doc.on("end", ...)`),
resolver la Promise con `Buffer.concat(chunks)`.

---

## Huella SHA-256 — payload canónico

Ver `00-contexto-y-arquitectura.md` §4.3. Implementación:

```
sha256hex(s) = crypto.createHash("sha256").update(s, "utf8").digest("hex")
sha256hexBuf(b) = crypto.createHash("sha256").update(b).digest("hex")

payload = [
  "v1",
  id_consentimiento, id_sesion, id_consultorio, id_tratamiento, id_paciente,
  codigo_plantilla, version_plantilla,
  sha256hex(cuerpo_snapshot),
  dni_confirmado, paciente_nombre, paciente_apellido,
  fecha_firma.toISOString(),           // UTC, ej "2026-09-03T17:05:12.000Z"
  sha256hexBuf(firma_png_buffer)
].join("|")

hash_documento = sha256hex(payload)
```

`hash_documento` se calcula **antes** de armar el PDF (para poder imprimirlo en el pie) y
se guarda en `consentimientos.hash_documento`.

> Escribir también, en el mismo archivo o en el checklist, **cómo se re-verifica**: dado
> un `id_consentimiento`, leer sus columnas + `firma_png` de `consentimientos_archivo`,
> recomponer el `payload` y comparar `sha256hex(payload) === hash_documento`.

---

## `publico.routes.js` — estructura

```
const router = express.Router();
router.use(limitadorFirmaPublica);
router.use(express.json({ limit: "2mb" }));   // local, no toca el global

router.get("/:token", ...)
router.post("/:token/identidad", validarDni, ...)
router.get("/:token/documentos/:id", ...)
router.post("/:token/documentos/:id/firmar", validarFirma, ...)

module.exports = router;
```

Sin `try/catch` (el `errorMiddleware` global cubre). Los helpers de negocio pueden vivir en
`consentimientos.service.js` (funciones nuevas: `resolverSesionPorToken`, `confirmarIdentidad`,
`obtenerDocumentoParaFirma`, `firmarDocumento`) o en un `publico.service.js` — a criterio,
pero reutilizando `recalcularEstadoSesion` y las constantes de la Conv. 2.

En `app.js`:
```js
app.set("trust proxy", 1);
const consentimientosPublicoRoutes = require("./modules/consentimientos/publico.routes");
app.use("/api/publico/consentimientos", consentimientosPublicoRoutes);
```

Instalar: `cd backend && npm install pdfkit`.

---

## Checklist de aceptación (Conversación 3)

- [ ] `npm install pdfkit` hecho; `package.json` actualizado.
- [ ] `app.set("trust proxy", 1)` agregado y comentado.
- [ ] `limitadorFirmaPublica` en `rateLimitMiddleware.js`, aplicado al router público.
- [ ] `GET /:token`: token inválido → 404 genérico; token válido → progreso + `dni_ultimos4`, **sin** datos de contacto ni DNI completo.
- [ ] `GET /:token` con sesión vencida → la sesión queda `expirada` en BD y la respuesta lo informa.
- [ ] `POST /:token/identidad`: DNI correcto (con y sin puntos) → identidad confirmada, IP y user-agent guardados.
- [ ] DNI incorrecto: 5 intentos con mensaje "te quedan N"; 6.º → sesión `cancelada`, no se puede seguir.
- [ ] `GET /:token/documentos/:id` sin identidad confirmada → 403; con identidad → devuelve `cuerpo` + `total`.
- [ ] `POST /:token/documentos/:id/firmar`: firma válida → documento `firmado`, `hash_documento` seteado, fila en `consentimientos_archivo`, `pdf_bytes` correcto.
- [ ] Anti-replay: firmar dos veces el mismo documento (o dos requests en carrera) → una gana, la otra 409.
- [ ] Sellado incremental: firmar 1 de 2 → sesión `parcial`; firmar el 2.º → `completa` + `fecha_completada`; token deja de servir.
- [ ] `firma_base64` inválido (no PNG / vacío / >1.5 MB) → 400.
- [ ] El PDF abre correctamente y contiene: "Odontología Herrera", título, nombre + apellido + DNI del paciente, texto exacto del `cuerpo_snapshot`, imagen de la firma, fecha/hora con "ART (UTC−3)", huella SHA-256 en el pie, ids de sesión/consentimiento/plantilla.
- [ ] Re-verificación de la huella: recomponer el payload desde la BD da el mismo `hash_documento`.
- [ ] `GET /api/consentimientos/:id/pdf` (Conv. 2) ahora sí devuelve el binario para un documento firmado.
- [ ] Rate limiter: superar el límite → 429 con el mensaje uniforme.
- [ ] Tabla de prueba manual (abajo) ejecutada.

---

## Tabla de prueba manual de la API (Conversación 3)

> Base: `http://localhost:3000/api`. **Sin** `Authorization`. Primero generar una sesión con
> `POST /api/consentimientos/sesiones` (autenticado) y quedarse con el `token` de la `url_firma`.
> Paciente de prueba: Ana Pérez, DNI `12.345.678`.

| # | Método y ruta | Body | Respuesta esperada |
|---|---|---|---|
| 1 | `GET /publico/consentimientos/<token>` | — | `200` · `paciente.nombre="Ana"`, `dni_ultimos4="5678"`, documentos `pendiente_firma`, `identidad_confirmada:false` |
| 2 | `GET /publico/consentimientos/tokenbasura` | — | `404` · `"El enlace no es válido."` |
| 3 | `POST /publico/consentimientos/<token>/identidad` | `{"dni":"99999999"}` | `401` · `"El DNI no coincide. Te quedan 4 intento(s)."` |
| 4 | `POST /publico/consentimientos/<token>/identidad` | `{"dni":"12345678"}` | `200` · `identidad_confirmada:true`, `siguiente_documento_id` = 1.er documento |
| 5 | `GET /publico/consentimientos/<token>/documentos/<idDoc1>` | — | `200` · `cuerpo` completo + `total` |
| 6 | `POST /publico/consentimientos/<token>/documentos/<idDoc1>/firmar` | `{"firma_base64":"data:image/png;base64,<png real>"}` | `200` · `progreso.firmados:1`, `sesion_estado:"parcial"` (o `"completa"` si era 1 solo) |
| 7 | `POST .../documentos/<idDoc1>/firmar` (otra vez) | idem | `409` · ya firmado |
| 8 | `POST .../documentos/<idDoc2>/firmar` | `{"firma_base64":"data:image/png;base64,<png>"}` | `200` · `sesion_estado:"completa"` |
| 9 | `GET /publico/consentimientos/<token>` (sesión completa) | — | `200` · `mensaje_final` presente, todos `firmado` |
| 10 | `POST .../documentos/<idDoc>/firmar` (sesión completa) | idem | `409` |
| 11 | `POST .../identidad` con 6 DNIs errados seguidos | — | 6.ª respuesta `409` · sesión `cancelada` |
| 12 | `GET /publico/consentimientos/<token>` (tras cancelar) | — | `200` · `sesion.estado:"cancelada"`, `documentos:[]`, `motivo` legible |
| 13 | `POST .../documentos/<id>/firmar` | `{"firma_base64":"data:image/png;base64,"}` | `400` · firma vacía |
| 14 | `GET .../documentos/<id>` sin haber confirmado identidad | — | `403` |
| 15 | (tras firmar) `GET /api/consentimientos/<idDoc1>/pdf` **con** JWT | — | `200` · `application/pdf`, abre bien |
| 16 | 41 requests seguidos al router público desde la misma IP | — | `429` a partir del límite |

---

## Qué queda para las Conversaciones 4 y 5

- **Conv. 4** — Frontend del panel: sección en la ficha del tratamiento, modal de selección,
  panel del QR con *polling*, ver/descargar PDF, modal de anulación.
- **Conv. 5** — Frontend de la tablet: ruta pública `/firmar/:token`, asistente paso a paso,
  lienzo `react-signature-canvas`, cliente axios público separado.
