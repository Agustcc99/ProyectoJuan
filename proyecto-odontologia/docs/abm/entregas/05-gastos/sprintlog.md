# SprintLog — ABM 05 · Gastos (transaccional)

> Sprint documental: **4.4** · Historias: **HU1 … HU6** (numeración propia del sprint).
> Documento formal: [`SprintLog-Gastos.docx`](SprintLog-Gastos.docx) (formato calcado de `com.docx`, ABM Transaccional).
> Mockups: [`mockups/`](mockups/) (wireframes HTML + PNG en escala de grises, `generar-mockups.js`).
> Generación del `.docx`: `NODE_PATH=<scratchpad>/docxbuild/node_modules node generar-sprintlog.js`.

---

## Objetivo del Sprint

Implementar el ABM **Transaccional de Gasto**: el registro de los egresos del consultorio
odontológico Herrera. Un gasto siempre tiene un **tipo de gasto** y, **opcionalmente**, se
imputa a un tratamiento (`gastos.id_tratamiento` NULLABLE): puede ser un gasto **general**
(alquiler, insumos del mes) o el **costo de laboratorio** de un tratamiento concreto. Es el
último ABM transaccional antes de reportes.

`gastos` ya existía con dos filas reales (gasto ID 1: $15.000 de insumo, general; gasto ID 2:
$30.000 de laboratorio, imputado al tratamiento 1) y el permiso `registrar_gastos` (asignado
al rol administrador). Este sprint agrega:

- **Migración `009_gastos.sql`** (aditiva): `id_consultorio` (+ FK a `consultorios`),
  `anulado`, `motivo_anulacion`, `id_usuario_anula` (+ FK a `usuarios`), `fecha_anulacion` y
  `fecha_creacion`. Reutiliza la tabla genérica `auditoria_cambios` creada en el ABM 03
  (`entidad = 'gastos'`).
- **Migración `010_permisos_gastos.sql`**: permisos `ver_gastos`, `editar_gastos` y
  `anular_gastos`, asignados al rol administrador (`registrar_gastos` ya existía).
- Módulo backend `modules/gastos/` (`routes` / `service` / `validator`) y módulo frontend
  `modules/gastos/` (1 página + 3 componentes + service + estilos).
- Integración: `app.js`, `AppRouter.jsx`, `LayoutPrincipal.jsx` y la sección **«Gastos
  imputados» real dentro de `DetalleTratamientoPage.jsx`** (ABM 03), que reemplaza la tabla
  estática por `<SeccionGastosTratamiento>` (total imputado, «Imputar gasto» que prefija el
  tratamiento, «Anular» por fila).

**Baja lógica = anulación** (`PATCH /:id/anular` con motivo): no hay `desactivar` /
`reactivar`. **El monto no se edita**: para corregirlo se anula el gasto y se registra uno
nuevo. Un gasto anulado no cuenta para el total del período ni para los reportes.

---

## Sprint Backlog

| Nro | Historia de Usuario | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|
| HU1 | Registrar un gasto (general o imputado a un tratamiento) con tipo, monto y fecha. | Alta | S/M | ABM 01 (`tipos_gasto`) + ABM 03 (`tratamientos`) + `registrar_gastos` |
| HU2 | Editar los datos de un gasto (tipo, imputación, fecha, descripción) sin tocar el monto. | Media | S | HU1 |
| HU3 | Anular un gasto indicando el motivo, sin perder el registro ni el historial. | Alta | S | HU1 |
| HU4 | Consultar los gastos con filtros por tipo, período, imputación y estado, con el total del período. | Alta | M | HU1 |
| HU5 | Ver los gastos imputados en la ficha del tratamiento e imputar uno nuevo desde ahí. | Media | S | HU1 + ABM 03 |
| HU6 | Permisos diferenciados por operación (ver / registrar / editar / anular) y trazabilidad del actor. | Media | S | HU1 … HU3 |

---

## Migraciones SQL

| NNN | Archivo | Qué hace |
|----:|---------|----------|
| 009 | `database/migrations/009_gastos.sql` | `ALTER TABLE gastos ADD COLUMN` (aditivo, reejecutable): `id_consultorio INT NOT NULL` (+ FK `fk_gastos_consultorio`, guard contra `information_schema`), `anulado TINYINT(1) NOT NULL DEFAULT 0`, `motivo_anulacion VARCHAR(255) NULL`, `id_usuario_anula INT NULL` (+ FK `fk_gastos_usuario_anula`), `fecha_anulacion DATETIME NULL`, `fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`; backfill de las 2 filas existentes al consultorio 1. No toca `id_tratamiento` (ya era NULLABLE). |
| 010 | `database/migrations/010_permisos_gastos.sql` | `INSERT IGNORE` de `ver_gastos`, `editar_gastos` y `anular_gastos` + `INSERT IGNORE` en `roles_permisos` para el rol administrador (por `codigo_permiso`, sin id fijo). |

> Los 2 gastos existentes quedan `anulado = 0`, `id_consultorio = 1`: ID 1 general (insumo,
> $15.000), ID 2 imputado al tratamiento 1 (laboratorio, $30.000).

---

## Endpoints — `/api/gastos`

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/gastos/opciones` | `ver_gastos` | `{ tipos, tratamientos }` (tipos de gasto activos + tratamientos del consultorio como `{ id, etiqueta }`) para poblar los selectores sin exigir `ver_catalogos` ni `ver_tratamientos`. |
| GET | `/api/gastos` | `ver_gastos` | Listado + filtros `?id_tipo_gasto ?id_tratamiento ?desde ?hasta ?estado=vigentes\|anulados\|todos ?imputacion=todos\|con_tratamiento\|generales ?orden=fecha_desc\|fecha_asc ?pagina ?porPagina`. Devuelve `{ gastos, total, pagina, porPagina, totales:{vigente,anulado} }`; `totales.vigente` es el total del período filtrado. Resuelve el tipo y, en los imputados, el paciente y el tipo de tratamiento. |
| GET | `/api/gastos/:id` | `ver_gastos` | Detalle de un gasto + `historial` (auditoría con actor). |
| POST | `/api/gastos` | `registrar_gastos` | Alta. Acepta `id_tratamiento` opcional en el body (la ficha del tratamiento lo prefija). |
| PUT | `/api/gastos/:id` | `editar_gastos` | Modificación acotada: `id_tipo_gasto`, `id_tratamiento` (incluye pasar de imputado a general y viceversa), `fecha_gasto`, `descripcion`. Enviar un `monto` distinto → 409. |
| PATCH | `/api/gastos/:id/anular` | `anular_gastos` | Anulación con `{ motivo }` obligatorio (mín. 5). |

---

## Reglas de negocio

### Ciclo de vida del gasto (matriz de estados)

| Origen \ Destino | vigente | anulado |
|---|---|---|
| **vigente** | — | ✅ (motivo obligatorio, mín. 5; permiso `anular_gastos`) |
| **anulado** | ❌ (no hay reactivar) | ❌ (409 «El gasto ya está anulado.») |

Un gasto **anulado** no cuenta para el total del período ni para los reportes, pero se
conserva con su motivo, su actor y su fecha de anulación.

### Alta

- **Obligatorios:** `id_tipo_gasto` (existe y `activo = 1`), `monto` (> 0).
- `id_tratamiento` **opcional**: si viene, debe existir y pertenecer al consultorio —
  **cualquier estado** (un tratamiento cancelado igual pudo generar un gasto de laboratorio)
  → 404 si no existe.
- `descripcion` recomendable, opcional (máx. 2000 caracteres).
- `fecha_gasto`: por defecto la de hoy; si viene, **no puede ser futura** → 400.

### Modificación

- Sólo se aplican `id_tipo_gasto`, `id_tratamiento`, `fecha_gasto` y `descripcion`. El
  `id_tratamiento` admite `null` para pasar el gasto **imputado → general**.
- **El monto no se edita** → 409 «El monto de un gasto no se edita: anulá y registrá uno
  nuevo.». Un gasto **anulado** no se edita → 409 «Un gasto anulado no se puede editar.».

### Auditoría (`auditoria_cambios`, `entidad = 'gastos'`)

| Acción | Cuándo | Registra |
|---|---|---|
| `alta` | POST | actor + `campo = 'monto'`, `valor_nuevo = <monto>` |
| `modificacion` | PUT | una fila por campo cambiado (`campo`, `valor_anterior`, `valor_nuevo`) |
| `anulacion` | PATCH `/anular` | `campo = 'anulado'`, `0 → 1`, `motivo` |

Toda escritura de auditoría va **dentro de la misma transacción** que el cambio.

---

## Frontend

```
modules/gastos/
  pages/PaginaGastos.jsx                  listado global + filtros (tipo / período / imputación / estado) + total del período + paginación + "Sin resultados"; alta, edición y anulación por fila
  components/FormularioGasto.jsx           alta / edición acotada; toggle "Gasto general / De un tratamiento"; monto deshabilitado en edición
  components/AnularGastoModal.jsx          motivo de anulación (mín. 5)
  components/SeccionGastosTratamiento.jsx  bloque embebido en el detalle del tratamiento: total imputado, tabla, "Imputar gasto" (prefija el tratamiento) y anulación por fila
  services/gastosService.js
  styles/gastos.css
```

- **Ruta** (`AppRouter.jsx`): `gastos` → `PaginaGastos`, `RutaPorPermiso permisoRequerido="ver_gastos"`.
- **Menú** (`LayoutPrincipal.jsx`): ítem «Gastos» con `mostrar: tienePermiso("ver_gastos")`, ruta `/panel/gastos`, título en `obtenerTituloRutaActual`.
- **Detalle del tratamiento** (`DetalleTratamientoPage.jsx`, ABM 03): la sección «Gastos imputados» de sólo lectura se reemplazó por `<SeccionGastosTratamiento>` (total imputado vigente + anulado, botón «Imputar gasto» que prefija el tratamiento, acción «Anular» por fila, fila anulada tachada). No se modificó `tratamientos.service.js`: la sección hace su propio `GET /api/gastos?id_tratamiento=:id&estado=todos`.

---

## Checklist de aceptación

- [x] Migración aplicada; los 2 gastos existentes quedan `anulado=0` (uno general — insumo $15.000; uno imputado al tratamiento 1 — laboratorio $30.000).
- [x] Alta general (sin tratamiento) y alta imputada (con tratamiento) funcionan.
- [x] `monto > 0` y tipo válido (activo); monto no editable después (409).
- [x] Anular con motivo (mín. 5): el gasto deja de sumar en el total del período, visible en «todos».
- [x] Filtros por tipo, período e imputación; total del período correcto.
- [x] Gasto imputado aparece también en la ficha del tratamiento (sección «Gastos imputados» con total y «Imputar gasto»).
- [x] Historial de auditoría por gasto (alta, edición, anulación con actor / fecha / motivo).
- [x] Sin `registrar_gastos` no aparece el botón y el POST responde 403; sin `ver_gastos` el GET responde 403 y el ítem de menú no se muestra.
- [x] Documentación completa en `docs/abm/entregas/05-gastos/` (`.docx` + `sprintlog.md` + 7 mockups).
- [x] Tabla de prueba manual de la API.

---

## Tabla de prueba manual de la API

> Base: `http://localhost:3000/api` · `Authorization: Bearer <JWT>` · `Content-Type: application/json`.
> Verificado contra la base real (`odontologia_herrera`, MariaDB 10.4) con el backend levantado
> localmente. Estado inicial: gasto ID 1 = $15.000 general (insumo), gasto ID 2 = $30.000
> imputado al tratamiento 1 (laboratorio); tipo de gasto 3 («protesis») está inactivo. Las
> altas de prueba se eliminaron al finalizar; la base quedó en su estado inicial.

| # | Método y ruta | Body | Respuesta esperada |
|---|---|---|---|
| 1 | `GET /gastos/opciones` | — | `200` · `{ tipos: [insumo, laboratorio, otro, servicio externo], tratamientos: [{ id:1, etiqueta:"#1 · Pérez, Ana · endodoncia" }] }` (el tipo 3 «protesis» no aparece: está inactivo) |
| 2 | `GET /gastos` | — | `200` · `{ gastos:[2,1], total:2, totales:{ vigente:45000, anulado:0 } }` |
| 3 | `GET /gastos?imputacion=generales&estado=todos` | — | `200` · sólo el gasto ID 1 (`imputado:false`) |
| 4 | `GET /gastos?id_tratamiento=1&estado=todos` | — | `200` · sólo el gasto ID 2 (`imputado:true`, `paciente_apellido:"Pérez"`) |
| 5 | `POST /gastos` | `{"id_tipo_gasto":1,"monto":5000,"descripcion":"test general","fecha_gasto":"2026-05-02"}` | `201` · `gasto.imputado=false`, `id_usuario` e `id_consultorio` estampados; auditoría `accion:"alta"` |
| 6 | `POST /gastos` | `{"id_tipo_gasto":2,"monto":12000,"id_tratamiento":1,"descripcion":"lab imputado"}` | `201` · `gasto.imputado=true`, `id_tratamiento=1` |
| 7 | `POST /gastos` | `{"monto":0}` | `400` · `errores:["El tipo de gasto es obligatorio.","El monto debe ser mayor a cero."]` |
| 8 | `POST /gastos` | `{"id_tipo_gasto":1,"monto":100,"fecha_gasto":"2099-01-01"}` | `400` · `"La fecha del gasto no puede ser futura."` |
| 9 | `POST /gastos` | `{"id_tipo_gasto":3,"monto":100}` | `400` · `"El tipo de gasto está inactivo."` |
| 10 | `POST /gastos` | `{"id_tipo_gasto":1,"monto":100,"id_tratamiento":9999}` | `404` · `"El tratamiento no existe o no pertenece a este consultorio."` |
| 11 | `PUT /gastos/<n>` | `{"monto":999}` | `409` · `"El monto de un gasto no se edita: anulá y registrá uno nuevo."` |
| 12 | `PUT /gastos/<n>` | `{"id_tipo_gasto":4,"descripcion":"reclasificado","id_tratamiento":1}` | `200` · valores actualizados; historial suma una fila `modificacion` por campo |
| 13 | `PUT /gastos/<n>` | `{"id_tratamiento":null}` | `200` · el gasto pasa a general (`imputado:false`); auditoría `modificacion` de `id_tratamiento` |
| 14 | `PATCH /gastos/<n>/anular` | `{"motivo":"abc"}` | `400` · `"El motivo de anulación debe tener al menos 5 caracteres."` |
| 15 | `PATCH /gastos/<n>/anular` | `{"motivo":"cargado por error en pruebas"}` | `200` · `anulado=true`, `motivo_anulacion` y `anulado_por` guardados; auditoría `accion:"anulacion"` |
| 16 | `PATCH /gastos/<n>/anular` (otra vez) | `{"motivo":"otra vez nomas"}` | `409` · `"El gasto ya está anulado."` |
| 17 | `PUT /gastos/<anulado>` | `{"descripcion":"x"}` | `409` · `"Un gasto anulado no se puede editar."` |
| 18 | `GET /gastos/<n>` | — | `200` · `historial` con las filas `alta` / `modificacion` / `anulacion` y su actor |
| 19 | `GET /gastos?estado=basura` | — | `400` · `"El filtro estado debe ser uno de: vigentes, anulados, todos."` |
| 20 | `GET /gastos` sin header `Authorization` | — | `401` · `"No se envió token de autenticación."` |
| 21 | `GET /gastos` con token de rol sin `ver_gastos` | — | `403` · `"No tenés permisos para realizar esta acción."` |
| 22 | `POST /gastos` con token de rol con `registrar_gastos` pero sin `editar_gastos` / `anular_gastos` | — | `201` en el alta; `403` en `PUT` y `PATCH /anular` (permisos diferenciados) |
