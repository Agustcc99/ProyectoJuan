# Contexto y arquitectura — Módulo de Consentimiento Informado

> **Pegá / referenciá este archivo al inicio de CADA conversación del módulo, después de
> `docs/abm/00-contexto-base.md`.** Es el contrato de arquitectura de esta funcionalidad.
> Todo lo que dice `00-contexto-base.md` (stack, convenciones de módulo, respuestas,
> multi-tenant, SQL parametrizado, sin `try/catch` en rutas, nombres en español largos)
> **sigue aplicando**. Acá se documentan solo los agregados y las excepciones.

---

## 1. Rol

Actuás como **desarrollador full-stack senior** sobre un sistema ya en producción con datos
reales. Agregás un **subsistema nuevo** (no un ABM) respetando los patrones existentes.
No refactorizás código ajeno, no renombrás nada. Si el pedido choca con el código o la BD,
avisás antes de tocar.

---

## 2. Qué es esto y por qué NO es un ABM

Un ABM del roadmap (`docs/abm/`) es una entidad con alta/baja/modificación/consulta que
replica un patrón ya resuelto. Este módulo **rompe ese molde en tres puntos**, y por eso
tiene su propia carpeta de documentación:

1. **Introduce la primera pantalla y los primeros endpoints SIN autenticación** del
   sistema. Hoy todo pasa por `verificarToken`; CORS está bloqueado a orígenes explícitos
   (`backend/src/app.js`). La firma del paciente ocurre en una tablet que **no tiene sesión**.
2. **Introduce generación de archivos** (PDF) y **almacenamiento binario** (BLOB en MySQL).
   El sistema hoy no genera ni guarda archivos.
3. **Introduce 3 dependencias nuevas** — y `docs/abm/00-contexto-base.md` dice explícitamente
   *"no agregar librerías"*. Esta es la excepción, y está aprobada por el dueño del proyecto
   para este módulo (ver §5).

**Consecuencia:** cada decisión de seguridad de la pantalla pública se documenta y se
justifica. No hay margen para "lo hago como el resto" porque el resto está autenticado.

---

## 3. Decisiones cerradas (no volver a discutir)

| # | Decisión | Detalle |
|---|---|---|
| D1 | **Plantillas fijas** | Los 3 textos legales se cargan por **seed en una migración**. No hay ABM de plantillas ni edición desde el panel. El dueño los provee como texto plano. La edición futura queda fuera de alcance. |
| D2 | **PDF como `LONGBLOB` en MySQL** | En una tabla *sidecar* (`consentimientos_archivo`). Sin storage externo, sin Supabase, sin S3. A volumen de un consultorio (~cientos/año, ~50–200 KB c/u) es trivial. |
| D3 | **Despliegue futuro: MySQL hosteado barato** | Railway / Clever Cloud / Aiven. El código no cambia. **Supabase queda descartado** (es PostgreSQL; incompatible con el SQL crudo `mysql2` del proyecto). |
| D4 | **Un QR por sesión, varias firmas** | El usuario tilda 1..N documentos. Se genera **una** sesión de firma con **un** token / **un** QR. El paciente firma **cada documento** de la tanda, en secuencia, en la misma tablet. |
| D5 | **Sellado incremental** | El PDF de cada documento se sella **apenas se firma ese documento**, no al final. Si se corta la red tras firmar 2 de 3, esos 2 quedan válidos y el 3.º se reanuda con el mismo QR. |
| D6 | **DNI obligatorio** | Todo paciente con tratamiento **debe** tener DNI cargado (ya lo garantiza el ABM 02: DNI obligatorio y único por consultorio, validado en `pacientes.service.js`). El módulo **igual verifica** que el paciente tenga DNI antes de generar la sesión, y falla con mensaje claro si no. |
| D7 | **Revocación por el paciente: fuera de alcance** | Solo **anulación interna** por un usuario con permiso `anular_consentimientos` (baja lógica con motivo, el PDF se conserva). Que el paciente revoque desde su lado es una mejora futura. |
| D8 | **Sprint 6** | Numeración de sprint documental = 6. HU propias del sprint: HU1…HU7. |
| D9 | **TTL de la sesión de firma: 30 minutos** | Constante configurable en el service. |
| D10 | **Lienzo: `react-signature-canvas`** | Dependencia nueva de frontend, aprobada. Maneja táctil, redimensionado y "borrar" mejor que un canvas a mano. |
| D11 | **Encabezado del consultorio en el PDF: sin logo por ahora** | El PDF lleva el texto `Odontología Herrera`. El logo (`consultorios.logo`) se suma más adelante. |
| D12 | **Un PDF por documento** | No un PDF combinado. Cada consentimiento es legalmente independiente y se puede anular por separado. |

---

## 4. Cambios de arquitectura que este módulo introduce

### 4.1. Endpoints públicos (sin `verificarToken`)

Se monta un router nuevo bajo **`/api/publico/consentimientos`**. No pasa por
`authMiddleware`. Su seguridad se apoya en:

- **Token opaco de un solo uso**: 32 bytes aleatorios (`crypto.randomBytes(32).toString("base64url")`).
  En la BD se guarda **solo su hash SHA-256** (`token_hash`), nunca el token en claro.
- **Vencimiento** (`token_expira`, 30 min) con **expiración perezosa**: al leer una sesión,
  si `token_expira < NOW()` y no está `completa`, se marca `expirada` en ese momento.
  **No hay cron.**
- **Rate limiting propio** por IP sobre todo el router público (ver `03-backend-firma-y-sellado.md`),
  reusando el patrón de `backend/src/middlewares/rateLimitMiddleware.js`.
- **Tope de intentos de DNI**: 5 por sesión. Al 6.º intento fallido la sesión se
  **cancela** y hay que regenerar el QR.
- **Salida mínima**: el `GET` público devuelve solo lo necesario para renderizar
  (nombre de pila, **últimos 4 dígitos del DNI**, títulos y estado de los documentos).
  Nunca teléfono, email, obra social, observaciones, ni el DNI completo del paciente.
- **Sin IDOR**: el token mapea *server-side* a exactamente una sesión. **Jamás** se acepta
  `id_tratamiento` / `id_paciente` / `id_consultorio` desde el body de la tablet.
- **Sin replay**: la firma de un documento se hace en transacción con
  `UPDATE ... WHERE estado = 'pendiente_firma'` y verificación de `affectedRows === 1`.

**CORS:** la tablet carga el **frontend ya desplegado** (mismo origen permitido), así que
`CORS_ORIGENES_PERMITIDOS` **no cambia**. Solo hay que registrar los routers nuevos en `app.js`.

**`trust proxy`:** en despliegue (Render/host detrás de proxy) hace falta
`app.set("trust proxy", 1)` para que `req.ip` y el rate-limiter vean la IP real del cliente
vía `X-Forwarded-For`. **Se agrega en la conversación 3** y se documenta el efecto global.

### 4.2. Generación de PDF

- Librería: **`pdfkit`** (flujo de texto multipágina; `pdf-lib` es para rellenar formularios,
  puppeteer/chromium queda descartado por peso en hosting barato).
- El PDF se arma **en el request** de firma (≈100–300 ms por documento). **Sin cola ni worker.**
- El PDF terminado se guarda como `LONGBLOB` junto con el PNG de la firma.

### 4.3. Huella de integridad (SHA-256)

Al firmar un documento se calcula el hash de un **payload canónico determinista** (string,
orden de campos fijo) que se puede **recomponer desde las filas de la BD**:

```
v1|{id_consentimiento}|{id_sesion}|{id_consultorio}|{id_tratamiento}|{id_paciente}
  |{codigo_plantilla}|{version_plantilla}|{sha256(cuerpo_snapshot)}
  |{dni_confirmado}|{paciente_nombre}|{paciente_apellido}
  |{fecha_firma en ISO 8601 UTC}|{sha256(bytes del PNG de la firma)}
```

`hash_documento = sha256(ese string)`. Se **imprime en el pie del PDF** y se **guarda en
`consentimientos.hash_documento`**. Verificación posterior = recomponer el payload desde
la fila + el archivo y volver a hashear. (No se hashea el binario del PDF: no se puede
imprimir dentro del PDF el hash de sí mismo.)

### 4.4. Ruta pública en el frontend

`/firmar/:token` se declara en `AppRouter.jsx` **como hermana de `/login`, FUERA de
`<Route path="/panel">`** (hoy todo el panel está envuelto en `RutaPrivada`).

La pantalla de firma **no debe usar el axios `api` compartido** (`services/api.js`): ese
inyecta el JWT y, ante un 401, limpia sesión y redirige a `/login`. Se crea un cliente
axios aparte (`services/publicoApi.js`) con solo `baseURL`.

---

## 5. Dependencias nuevas (aprobadas para este módulo)

| Paquete | Dónde | Para qué | Alternativa descartada |
|---|---|---|---|
| `pdfkit` | backend | Generar el PDF sellado | `pdf-lib` (formularios, no flujo), puppeteer (chromium pesado) |
| `qrcode` | backend | Generar el PNG del QR como *data URI* y devolverlo en la respuesta | `qrcode.react` en el front (evita sumar dep al front y mantiene la lógica del token en un solo lado) |
| `react-signature-canvas` | frontend | Lienzo de firma en la tablet | canvas a mano (peor en táctil / redimensionado) |

El token sale de **`crypto` nativo de Node** — sin dependencia.

**Instalación:** `cd backend && npm install pdfkit qrcode` · `cd frontend && npm install react-signature-canvas`.
Cada conversación que agregue una dep lo hace en su fase (ver roadmap) y actualiza el
`package.json` correspondiente.

---

## 6. Modelo de datos completo

Cuatro tablas nuevas. **Ninguna toca tablas existentes** salvo por las claves foráneas
que apuntan a `consultorios`, `tratamientos`, `pacientes` y `usuarios`. Todas las columnas
de dominio de las tablas nuevas van **en minúsculas** (son tablas nuevas, no hay que
imitar el MAYÚSCULAS heredado).

### 6.1. `plantillas_consentimiento` — los 3 textos legales (seed fijo)

| Columna | Tipo | Nota |
|---|---|---|
| `id_plantilla` | `INT AUTO_INCREMENT PK` | |
| `id_consultorio` | `INT NOT NULL` | FK → `consultorios(id_consultorio)`. Seed = 1. |
| `codigo` | `VARCHAR(50) NOT NULL` | Identificador estable: `consentimiento_general`, `consentimiento_endodoncia`, `consentimiento_extraccion` (o los que defina el dueño). |
| `titulo` | `VARCHAR(150) NOT NULL` | Título que se muestra y va al PDF. |
| `cuerpo` | `MEDIUMTEXT NOT NULL` | Texto legal completo. Párrafos separados por línea en blanco (`\n\n`). Texto plano, sin HTML. |
| `version` | `INT NOT NULL DEFAULT 1` | Se incrementa si una migración futura cambia el texto. |
| `activo` | `TINYINT(1) NOT NULL DEFAULT 1` | Solo las activas aparecen en el modal de selección. |
| `fecha_creacion` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | |
| — | `UNIQUE KEY (id_consultorio, codigo)` | |

### 6.2. `consentimiento_sesiones` — la tanda de firma (dueña del token / QR)

| Columna | Tipo | Nota |
|---|---|---|
| `id_sesion` | `INT AUTO_INCREMENT PK` | |
| `id_consultorio` | `INT NOT NULL` | FK → `consultorios`. Desde `req.usuario`, nunca del body. |
| `id_tratamiento` | `INT NOT NULL` | FK → `tratamientos(ID_TRATAMIENTO)`. |
| `id_paciente` | `INT NOT NULL` | FK → `pacientes(ID_PACIENTE)`. Denormalizado del tratamiento para consultas y para congelar la identidad. |
| `token_hash` | `CHAR(64) NOT NULL` | `sha256(token en claro)`. **UNIQUE.** El token en claro nunca se guarda. |
| `token_expira` | `DATETIME NOT NULL` | `fecha_generacion + 30 min`. |
| `estado` | `VARCHAR(20) NOT NULL DEFAULT 'pendiente'` | `pendiente` · `parcial` · `completa` · `expirada` · `cancelada`. Derivado (ver §7). |
| `dni_confirmado` | `VARCHAR(20) NULL` | DNI normalizado que el paciente tipeó al confirmar identidad. |
| `intentos_dni` | `TINYINT NOT NULL DEFAULT 0` | Tope 5; al 6.º → `estado = 'cancelada'`. |
| `firmante_ip` | `VARCHAR(45) NULL` | `req.ip` al confirmar identidad (IPv4/IPv6). |
| `firmante_user_agent` | `VARCHAR(255) NULL` | Header `User-Agent` de la tablet. |
| `fecha_generacion` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | |
| `id_usuario_genera` | `INT NOT NULL` | FK → `usuarios(ID_USUARIO)`. Quién generó la sesión. |
| `fecha_identidad` | `DATETIME NULL` | Cuándo se confirmó el DNI. |
| `fecha_completada` | `DATETIME NULL` | Cuándo se firmó el último documento. |
| `motivo_cancelacion` | `VARCHAR(255) NULL` | Si un usuario cancela la sesión o si se cancela por exceso de intentos de DNI. |
| `id_usuario_cancela` | `INT NULL` | FK → `usuarios`. NULL si la canceló el sistema (intentos DNI). |
| `fecha_cancelacion` | `DATETIME NULL` | |
| — | `INDEX (id_tratamiento)`, `UNIQUE (token_hash)` | |

### 6.3. `consentimientos` — un documento de la tanda

| Columna | Tipo | Nota |
|---|---|---|
| `id_consentimiento` | `INT AUTO_INCREMENT PK` | |
| `id_sesion` | `INT NOT NULL` | FK → `consentimiento_sesiones`. |
| `id_consultorio` | `INT NOT NULL` | FK → `consultorios`. |
| `id_tratamiento` | `INT NOT NULL` | FK → `tratamientos`. Denormalizado para el listado de la ficha. |
| `id_paciente` | `INT NOT NULL` | FK → `pacientes`. |
| `id_plantilla` | `INT NOT NULL` | FK → `plantillas_consentimiento`. |
| `codigo_plantilla` | `VARCHAR(50) NOT NULL` | Snapshot del `codigo`. |
| `titulo_snapshot` | `VARCHAR(150) NOT NULL` | Snapshot del `titulo`. |
| `cuerpo_snapshot` | `MEDIUMTEXT NOT NULL` | **Snapshot del texto exacto** que se le mostró y firmó. Si la plantilla cambia después, este documento se regenera fiel. |
| `version_plantilla` | `INT NOT NULL` | Snapshot de `version`. |
| `orden` | `TINYINT NOT NULL` | 1..N dentro de la sesión (orden del asistente). |
| `estado` | `VARCHAR(20) NOT NULL DEFAULT 'pendiente_firma'` | `pendiente_firma` · `firmado` · `anulado`. |
| `fecha_firma` | `DATETIME NULL` | `NOW()` del servidor al firmar. |
| `hash_documento` | `CHAR(64) NULL` | Huella SHA-256 del payload canónico (§4.3). |
| `motivo_anulacion` | `VARCHAR(255) NULL` | Obligatorio (mín. 5) al anular. |
| `id_usuario_anula` | `INT NULL` | FK → `usuarios`. |
| `fecha_anulacion` | `DATETIME NULL` | |
| `fecha_creacion` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | |
| — | `INDEX (id_tratamiento)`, `INDEX (id_sesion)` | |

### 6.4. `consentimientos_archivo` — el binario (sidecar, 1:1)

| Columna | Tipo | Nota |
|---|---|---|
| `id_consentimiento` | `INT NOT NULL PK` | FK → `consentimientos`. Relación 1:1. |
| `pdf` | `LONGBLOB NOT NULL` | El PDF sellado. |
| `firma_png` | `LONGBLOB NOT NULL` | El PNG del lienzo, recortado. |
| `pdf_bytes` | `INT NOT NULL` | Tamaño del PDF, para el header `Content-Length` y diagnóstico. |
| `fecha_generacion` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | |

> **Nunca** hacer `SELECT *` sobre esta tabla en un listado. Solo se lee la fila puntual
> cuando se va a servir el PDF (`GET /api/consentimientos/:id/pdf`).

### 6.5. Permisos nuevos (3)

| `codigo_permiso` | `nombre_permiso` | Qué habilita |
|---|---|---|
| `ver_consentimientos` | Ver consentimientos | Ver la sección en la ficha del tratamiento y descargar los PDF. |
| `generar_consentimientos` | Generar consentimientos | Crear una sesión de firma (QR) y cancelarla. |
| `anular_consentimientos` | Anular consentimientos | Baja lógica de un consentimiento ya firmado, con motivo. |

Se siembran e **INSERT IGNORE** en `roles_permisos` para el rol administrador (`id_rol = 1`),
igual que todas las migraciones de permisos previas.

---

## 7. Máquinas de estado

### 7.1. Documento (`consentimientos.estado`)

```
pendiente_firma ──(paciente firma en la tablet)──▶ firmado ──(usuario anula c/ motivo)──▶ anulado
```

- `pendiente_firma → firmado`: solo vía endpoint público, identidad confirmada, sesión vigente.
- `firmado → anulado`: solo vía `PATCH /api/consentimientos/:id/anular`, permiso
  `anular_consentimientos`, motivo ≥ 5. El PDF y la huella **se conservan**.
- `anulado` es final. `pendiente_firma → anulado` no existe (si la sesión se cancela, el
  documento pendiente simplemente queda inerte con su sesión `cancelada`/`expirada`).

### 7.2. Sesión (`consentimiento_sesiones.estado`) — derivado

| Estado | Cómo se llega |
|---|---|
| `pendiente` | Recién creada, ningún documento firmado. |
| `parcial` | Al menos un documento `firmado`, pero quedan `pendiente_firma`. |
| `completa` | Todos los documentos `firmado`. Setea `fecha_completada`. El token deja de servir. |
| `expirada` | `token_expira < NOW()` y no `completa`, evaluado **al leer** (perezoso). Los documentos ya firmados siguen válidos; los pendientes quedan inertes. |
| `cancelada` | Un usuario con `generar_consentimientos` la canceló (`motivo`), **o** el sistema la canceló por 6.º intento de DNI fallido. |

La transición a `parcial` / `completa` se recalcula **dentro de la transacción de firma**.
La transición a `expirada` se aplica en cualquier `GET` que toque la sesión.

---

## 8. Auditoría

Se **reutiliza** la tabla genérica `auditoria_cambios` (creada en el ABM 03), pero con una
limitación clave:

> `auditoria_cambios.id_usuario` es **`NOT NULL`** con FK a `usuarios`. **El paciente no es
> un usuario.** Por lo tanto **el evento "el paciente firmó" NO se registra en
> `auditoria_cambios`.** Su traza vive en las columnas propias:
> `consentimientos.fecha_firma` + `hash_documento`, y
> `consentimiento_sesiones.dni_confirmado` + `firmante_ip` + `firmante_user_agent` + `fecha_identidad`.

Lo que **sí** va a `auditoria_cambios` (acciones de un usuario del consultorio):

| `accion` | `entidad` | `id_entidad` | Cuándo | Registra |
|---|---|---|---|---|
| `alta` | `consentimientos` | `id_consentimiento` | Al crear la sesión, una fila por documento | actor, `campo='estado'`, `valor_nuevo='pendiente_firma'` |
| `anulacion` | `consentimientos` | `id_consentimiento` | `PATCH /:id/anular` | actor, `campo='estado'`, `firmado → anulado`, `motivo` |
| `cancelacion` | `consentimiento_sesiones` | `id_sesion` | `PATCH /sesiones/:id/cancelar` | actor, `motivo` |

Toda escritura de auditoría va **dentro de la misma transacción** que el cambio.

---

## 9. Reglas transversales del módulo

1. **Aislamiento por consultorio:** todas las tablas nuevas llevan `id_consultorio`. Las
   queries autenticadas filtran por `req.usuario.id_consultorio`. Los endpoints públicos
   resuelven el consultorio **desde la sesión** (vía token), nunca del request.
2. **Snapshot inmutable:** `titulo_snapshot`, `cuerpo_snapshot`, `codigo_plantilla`,
   `version_plantilla` se copian al crear el documento y **no se vuelven a tocar**.
3. **Timestamps del servidor:** `fecha_firma`, `fecha_identidad`, etc. siempre `NOW()` de
   MySQL, nunca del dispositivo. En despliegue el MySQL suele estar en **UTC**; el PDF
   imprime la hora con zona explícita (`14:32 ART (UTC−3)`); guardar y comparar en UTC.
4. **El monto/precio del tratamiento no se toca.** Este módulo no modifica `tratamientos`,
   `pagos` ni `gastos`. Solo **lee** el tratamiento y el paciente.
5. **Baja lógica siempre.** Nada de `DELETE`. Anular = `estado = 'anulado'` + motivo.
6. **Generación de sesión bloqueada si:** el tratamiento está `cancelado` (id_estado 4),
   o el paciente no tiene DNI, o no hay ninguna plantilla activa seleccionada.
   *(Se permite generar en tratamientos `pendiente`, `en proceso` y `finalizado`.)*
7. **Tamaño del payload de firma:** la ruta de firma limita el body (un PNG de lienzo son
   ~10–50 KB; tope duro ~1–2 MB en esa ruta puntual, no global).

---

## 10. Puntos de integración con código existente

Solo estos. **No tocar nada más de otros módulos.**

| Archivo | Cambio | Conversación |
|---|---|---|
| `database/migrations/` | 3 archivos nuevos `NNN_*.sql` | 01 |
| `database/README.md` | Filas nuevas en la tabla de migraciones + comandos | 01 |
| `database/schema-actual.sql` | *(opcional)* regenerar la foto de referencia | 01 |
| `backend/package.json` | `+ pdfkit`, `+ qrcode` | 02 / 03 |
| `backend/src/app.js` | `app.use("/api/consentimientos", ...)` y `app.use("/api/publico/consentimientos", ...)`; `app.set("trust proxy", 1)` | 02 (autenticado) / 03 (público + trust proxy) |
| `frontend/package.json` | `+ react-signature-canvas` | 05 |
| `frontend/src/routes/AppRouter.jsx` | `<Route path="/firmar/:token" ... />` fuera de `/panel` | 05 |
| `frontend/src/modules/tratamientos/pages/DetalleTratamientoPage.jsx` | Importar y renderizar `<SeccionConsentimientosTratamiento>` después de `<SeccionGastosTratamiento>` | 04 |

**No hay ítem de menú lateral** (`LayoutPrincipal.jsx` no se toca): el módulo vive dentro
de la ficha del tratamiento. El título de `/firmar/:token` no va a `obtenerTituloRutaActual`
porque esa pantalla no usa el layout del panel.

---

## 11. Glosario

| Término | Significado |
|---|---|
| **Sesión de firma** | La tanda: 1..N documentos que un paciente firma en una sola visita, con un token / QR. Fila en `consentimiento_sesiones`. |
| **Documento** / **consentimiento** | Un formulario legal concreto dentro de una sesión. Fila en `consentimientos`. Genera **un** PDF. |
| **Plantilla** | El texto legal base, fijo. Fila en `plantillas_consentimiento`. Se copia (snapshot) a cada documento. |
| **Sellado** | Armar el PDF final + calcular la huella SHA-256 + guardar el binario. Ocurre en el servidor, al firmar. |
| **Huella de integridad** | `hash_documento`: SHA-256 del payload canónico. Permite probar que el documento no se alteró. |
| **Token** | Cadena opaca de 32 bytes en el QR. Capacidad de un solo uso. En BD solo su hash. |
| **Expiración perezosa** | La sesión pasa a `expirada` cuando alguien la lee después del `token_expira`, no por un proceso de fondo. |
