# SprintLog — ABM 04 · Pagos (transaccional)

> Sprint documental: **4.3** · Historias: **HU1 … HU6** (numeración propia del sprint).
> Documento formal: [`SprintLog-Pagos.docx`](SprintLog-Pagos.docx) (formato calcado de `com.docx`, ABM Transaccional).
> Mockups: [`mockups/`](mockups/) (wireframes HTML + PNG en escala de grises, `generar-mockups.js`).
> Generación del `.docx`: `NODE_PATH=<scratchpad>/docxbuild/node_modules node generar-sprintlog.js`.

---

## Objetivo del Sprint

Implementar el ABM **Transaccional de Pago**: el registro de los cobros que financian
cada tratamiento del consultorio odontológico Herrera. Cada pago se registra **contra
un tratamiento existente** (`pagos.id_tratamiento` NOT NULL) con un medio de pago; la
suma de los pagos **vigentes** de un tratamiento frente a su `precio_paciente` define
el **saldo pendiente** (nunca se almacena, se deriva).

`pagos` ya existía con una fila real (pago ID 1, $20.000 en efectivo sobre el
tratamiento 1) y el permiso `registrar_pagos` (asignado al rol administrador). Este
sprint agrega:

- **Migración `007_pagos.sql`** (aditiva): `id_consultorio` (+ FK a `consultorios`),
  `anulado`, `motivo_anulacion`, `id_usuario_anula` (+ FK a `usuarios`),
  `fecha_anulacion` y `fecha_creacion`. Reutiliza la tabla genérica
  `auditoria_cambios` creada en el ABM 03 (`entidad = 'pagos'`).
- **Migración `008_permisos_pagos.sql`**: permisos `ver_pagos`, `editar_pagos` y
  `anular_pagos`, asignados al rol administrador (`registrar_pagos` ya existía).
- Módulo backend `modules/pagos/` (`routes` / `service` / `validator`) y módulo
  frontend `modules/pagos/` (1 página + 3 componentes + service + estilos).
- Integración: `app.js`, `AppRouter.jsx`, `LayoutPrincipal.jsx`, la sección **«Pagos»
  real dentro de `DetalleTratamientoPage.jsx`** (ABM 03) y el ajuste del cálculo de
  saldo en `tratamientos.service.js` para que los pagos anulados dejen de contar.

**Baja lógica = anulación** (`PATCH /:id/anular` con motivo): no hay `desactivar` /
`reactivar`. **El monto no se edita**: para corregirlo se anula el pago y se registra
uno nuevo.

---

## Sprint Backlog

| Nro | Historia de Usuario | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|
| HU1 | Registrar un pago contra un tratamiento (monto, medio y fecha) y ver el saldo recalculado. | Alta | S/M | ABM 03 (tratamiento) + `registrar_pagos` |
| HU2 | Editar los datos administrativos de un pago (medio, fecha, notas) sin tocar el monto. | Media | S | HU1 |
| HU3 | Anular un pago indicando el motivo, sin perder el registro ni el historial. | Alta | S | HU1 |
| HU4 | Consultar la caja: listado global de pagos con filtros por fecha, medio y estado, con totales. | Alta | M | HU1 |
| HU5 | Permitir el sobrepago con advertencia y bloquear el pago en un tratamiento cancelado. | Media | S | HU1 |
| HU6 | Permisos diferenciados por operación (ver / registrar / editar / anular) y trazabilidad del actor. | Media | S | HU1 … HU3 |

---

## Migraciones SQL

| NNN | Archivo | Qué hace |
|----:|---------|----------|
| 007 | `database/migrations/007_pagos.sql` | `ALTER TABLE pagos ADD COLUMN` (aditivo, reejecutable): `id_consultorio INT NOT NULL` (+ FK `fk_pagos_consultorio`, guard contra `information_schema`), `anulado TINYINT(1) NOT NULL DEFAULT 0`, `motivo_anulacion VARCHAR(255) NULL`, `id_usuario_anula INT NULL` (+ FK `fk_pagos_usuario_anula`), `fecha_anulacion DATETIME NULL`, `fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`; backfill de la fila existente al consultorio 1. |
| 008 | `database/migrations/008_permisos_pagos.sql` | `INSERT IGNORE` de `ver_pagos`, `editar_pagos` y `anular_pagos` + `INSERT IGNORE` en `roles_permisos` para el rol administrador (por `codigo_permiso`, sin id fijo). |

> El pago existente (**ID 1**, $20.000 en efectivo) queda `anulado = 0`,
> `id_consultorio = 1`; el tratamiento 1 conserva su saldo de $30.000 (50.000 − 20.000).

---

## Endpoints — `/api/pagos`

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/pagos/opciones` | `ver_pagos` | `{ medios }` (medios de pago activos) para poblar los selectores sin exigir `ver_catalogos`. |
| GET | `/api/pagos` | `ver_pagos` | Listado de caja + filtros `?id_tratamiento ?id_medio_pago ?desde ?hasta ?estado=vigentes\|anulados\|todos ?orden=fecha_desc\|fecha_asc ?pagina ?porPagina`. Devuelve `{ pagos, total, pagina, porPagina, totales:{vigente,anulado} }` y, si se filtra por `id_tratamiento`, además `resumen:{precio_paciente,total_pagado,saldo,sobrepago}`. |
| GET | `/api/pagos/:id` | `ver_pagos` | Detalle de un pago + `historial` (auditoría con actor). |
| POST | `/api/pagos` | `registrar_pagos` | Alta. Acepta `id_tratamiento` en el body (la ficha del tratamiento lo prefija). Devuelve `{ pago, advertencia? }` (sobrepago). |
| PUT | `/api/pagos/:id` | `editar_pagos` | Modificación acotada: sólo `id_medio_pago`, `fecha_pago`, `notas`. Enviar un `monto` distinto → 409. |
| PATCH | `/api/pagos/:id/anular` | `anular_pagos` | Anulación con `{ motivo }` obligatorio (mín. 5). |

---

## Reglas de negocio

### Ciclo de vida del pago (matriz de estados)

| Origen \ Destino | vigente | anulado |
|---|---|---|
| **vigente** | — | ✅ (motivo obligatorio, mín. 5; permiso `anular_pagos`) |
| **anulado** | ❌ (no hay reactivar) | ❌ (409 «El pago ya está anulado.») |

Un pago **anulado** no cuenta para el saldo del tratamiento ni para los totales de
caja, pero se conserva con su motivo, su actor y su fecha de anulación.

### Alta

- **Obligatorios:** `id_tratamiento`, `id_medio_pago`, `monto` (> 0).
- El tratamiento debe existir, pertenecer al consultorio y **no estar `cancelado`**
  → 409 «No se pueden registrar pagos en un tratamiento cancelado.».
- El medio de pago debe existir y estar `activo = 1` → 400.
- `fecha_pago`: por defecto la de hoy; si viene, **no puede ser futura** → 400.
- **Sobrepago:** si `Σ pagos vigentes + monto > precio_paciente`, el pago **se
  registra igual** y la respuesta incluye `advertencia: "El total pagado supera el
  precio del tratamiento."` (constante `PERMITIR_SOBREPAGO = true` para invertirlo).

### Modificación

- Sólo se aplican `id_medio_pago`, `fecha_pago` y `notas`.
- **El monto no se edita** → 409 «El monto de un pago no se edita: anulá y registrá
  uno nuevo.». Un pago **anulado** no se edita → 409.

### Auditoría (`auditoria_cambios`, `entidad = 'pagos'`)

| Acción | Cuándo | Registra |
|---|---|---|
| `alta` | POST | actor + `campo = 'monto'`, `valor_nuevo = <monto>` |
| `modificacion` | PUT | una fila por campo cambiado (`campo`, `valor_anterior`, `valor_nuevo`) |
| `anulacion` | PATCH `/anular` | `campo = 'anulado'`, `0 → 1`, `motivo` |

Toda escritura de auditoría va **dentro de la misma transacción** que el cambio.

---

## Frontend

```
modules/pagos/
  pages/PaginaPagos.jsx                 vista "caja": listado global + filtros (fecha/medio/estado) + totales + paginación + "Sin resultados"
  components/FormularioPago.jsx          alta (monto, medio, fecha, notas) + edición acotada (monto deshabilitado)
  components/AnularPagoModal.jsx         motivo de anulación (mín. 5)
  components/SeccionPagosTratamiento.jsx bloque embebido en el detalle del tratamiento: saldo destacado, tabla, alta y anulación por fila
  services/pagosService.js
  styles/pagos.css
```

- **Ruta** (`AppRouter.jsx`): `pagos` → `PaginaPagos`, `RutaPorPermiso permisoRequerido="ver_pagos"`.
- **Menú** (`LayoutPrincipal.jsx`): ítem «Pagos» con `mostrar: tienePermiso("ver_pagos")`, ruta `/panel/pagos`, título en `obtenerTituloRutaActual`.
- **Detalle del tratamiento** (`DetalleTratamientoPage.jsx`, ABM 03): la sección «Pagos» de sólo lectura se reemplazó por `<SeccionPagosTratamiento>` (saldo pendiente destacado, botón «Registrar pago» si el tratamiento no está cancelado, acción «Anular» por fila, banner de advertencia de sobrepago). Un refresco *silencioso* actualiza el saldo del tratamiento tras registrar o anular un pago.
- **`tratamientos.service.js`**: los tres `SUM(monto)` sobre `pagos` (saldo del listado, tope de precio en la edición, bloqueo de cancelación) ahora llevan `AND anulado = 0`.

---

## Checklist de aceptación

- [x] Migración aplicada; el pago existente (ID 1, $20.000) queda `anulado = 0`, `id_consultorio = 1`.
- [x] Alta: monto > 0 y medio válido; el pago aparece y el saldo del tratamiento se recalcula (tratamiento 1: 50.000 − 20.000 = 30.000).
- [x] No se puede pagar un tratamiento cancelado (409).
- [x] Editar monto → bloqueado con mensaje 409; editar medio / fecha / notas → 200.
- [x] Anular con motivo (mín. 5): el pago queda «anulado», deja de contar para saldo y caja, sigue visible en «todos».
- [x] Sobrepago: se registra con `advertencia` visible (banner amarillo, no bloquea).
- [x] Listado de caja filtra por rango de fechas, medio y estado; totales `vigente` / `anulado` correctos.
- [x] Historial de auditoría por pago (alta, edición, anulación con actor / fecha / motivo).
- [x] Sin `registrar_pagos` no aparece el botón y el POST responde 403; sin `ver_pagos` el GET responde 403 y el ítem de menú no se muestra.
- [x] Documentación completa en `docs/abm/entregas/04-pagos/` (`.docx` + `sprintlog.md` + 7 mockups).
- [x] Tabla de prueba manual de la API.

---

## Tabla de prueba manual de la API

> Base: `http://localhost:3000/api` · `Authorization: Bearer <JWT>` · `Content-Type: application/json`.
> Verificado contra la base real (`odontologia_herrera`, MariaDB 10.4) con el backend levantado
> localmente. Estado inicial: tratamiento 1 = $50.000, pago 1 = $20.000 vigente, saldo $30.000.
> Las altas de prueba se eliminaron al finalizar; la base quedó en su estado inicial.

| # | Método y ruta | Body | Respuesta esperada |
|---|---|---|---|
| 1 | `GET /pagos/opciones` | — | `200` · `{ medios: [efectivo, transferencia, tarjeta, obra social] }` |
| 2 | `GET /pagos` | — | `200` · `{ pagos:[1], total:1, totales:{ vigente:20000, anulado:0 } }` |
| 3 | `GET /pagos?id_tratamiento=1&estado=todos` | — | `200` · agrega `resumen:{ precio_paciente:50000, total_pagado:20000, saldo:30000, sobrepago:false }` |
| 4 | `POST /pagos` | `{"id_tratamiento":1,"id_medio_pago":1,"monto":10000,"fecha_pago":"2026-05-02","notas":"cuota 2"}` | `201` · `pago.monto = 10000`, `anulado=false`, `id_usuario` e `id_consultorio` estampados; auditoría `accion:"alta"` |
| 5 | `POST /pagos` | `{"id_tratamiento":1,"monto":0}` | `400` · `errores:["El medio de pago es obligatorio.","El monto debe ser mayor a cero."]` |
| 6 | `POST /pagos` | `{"id_tratamiento":1,"id_medio_pago":1,"monto":100,"fecha_pago":"2099-01-01"}` | `400` · `"La fecha del pago no puede ser futura."` |
| 7 | `POST /pagos` | `{"id_tratamiento":999,"id_medio_pago":1,"monto":100}` | `404` · `"El tratamiento no existe o no pertenece a este consultorio."` |
| 8 | `POST /pagos` (con saldo 30.000 y monto 25.000) | `{"id_tratamiento":1,"id_medio_pago":2,"monto":25000}` | `201` · `advertencia:"El total pagado supera el precio del tratamiento."` (no bloquea) |
| 9 | `PUT /pagos/<n>` | `{"monto":12345}` | `409` · `"El monto de un pago no se edita: anulá y registrá uno nuevo."` |
| 10 | `PUT /pagos/<n>` | `{"id_medio_pago":3,"notas":"pasa a tarjeta"}` | `200` · valores actualizados; historial suma 2 filas `modificacion` |
| 11 | `PATCH /pagos/<n>/anular` | `{"motivo":"cargado por error en transferencia"}` | `200` · `anulado=true`, `motivo_anulacion` y `anulado_por` guardados; auditoría `accion:"anulacion"` |
| 12 | `PATCH /pagos/<n>/anular` (otra vez) | `{"motivo":"otra vez nomas"}` | `409` · `"El pago ya está anulado."` |
| 13 | `PATCH /pagos/<n>/anular` | `{"motivo":"abc"}` | `400` · `"El motivo de anulación debe tener al menos 5 caracteres."` |
| 14 | `GET /pagos?id_tratamiento=1&estado=todos` (tras anular el pago de 25.000) | — | `200` · `resumen.total_pagado` y `resumen.saldo` ignoran el pago anulado; `totales.anulado` lo refleja |
| 15 | `GET /tratamientos/1` | — | `200` · `total_cobrado` y `saldo` del tratamiento **no** cuentan los pagos anulados |
| 16 | `PUT /pagos/<anulado>` | `{"notas":"x"}` | `409` · `"Un pago anulado no se puede editar."` |
| 17 | `POST /pagos` a un tratamiento en estado `cancelado` | `{"id_tratamiento":<cancelado>,"id_medio_pago":1,"monto":1000}` | `409` · `"No se pueden registrar pagos en un tratamiento cancelado."` |
| 18 | `GET /pagos?estado=basura` | — | `400` · `"El filtro estado debe ser uno de: vigentes, anulados, todos."` |
| 19 | `GET /pagos` con token de rol sin `ver_pagos` | — | `403` · `"No tenés permisos para realizar esta acción."` |
| 20 | `POST /pagos` con token de rol sin `registrar_pagos` | — | `403` · `"No tenés permisos para realizar esta acción."` |
| 21 | cualquier ruta sin header `Authorization` | — | `401` · `"No se envió token de autenticación."` |
