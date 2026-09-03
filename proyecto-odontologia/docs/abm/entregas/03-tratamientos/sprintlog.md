# SprintLog — ABM 03 · Tratamientos (transaccional)

> Sprint documental: **4** · Historias: **HU13 … HU19**
> (HU13–HU16 ya estaban en `docs/abm/modelo/com.docx`; **HU17–HU19 se agregan** para el
> motor de estados, el detalle con historial y los permisos/auditoría — numeración continua, sin renumerar).
> Documento formal: [`SprintLog-Tratamientos.docx`](SprintLog-Tratamientos.docx) (formato calcado de `com.docx`, SPRINT 4 — ABM Transaccional).
> Mockups: [`mockups/`](mockups/) (wireframes HTML + PNG en escala de grises, `generar-mockups.js`).
> Generación del `.docx`: `NODE_PATH=<scratchpad>/docxbuild/node_modules node generar-sprintlog.js`.

---

## Objetivo del Sprint

Implementar el ABM **Transaccional de Tratamiento**, la entidad **núcleo** del sistema
del consultorio odontológico Herrera: registra la práctica que efectivamente se le
realizó a un paciente, su precio, su **ciclo de estados** y su relación con los pagos
y gastos.

`tratamientos` ya existía con datos reales, la ruta `/panel/tratamientos` (placeholder)
y los permisos `ver_tratamientos` / `crear_tratamientos` / `editar_tratamientos`
(ya asignados al rol administrador). Este sprint agrega:

- **Migración `005_tratamientos.sql`** (aditiva): `id_consultorio` (+ FK a `consultorios`),
  `fecha_actualizacion`, `motivo_cancelacion`, y la **tabla genérica `auditoria_cambios`**
  (la usarán también pagos y gastos).
- **Migración `006_permisos_tratamientos.sql`**: permisos `cambiar_estado_tratamientos`
  y `cancelar_tratamientos`, asignados al rol administrador.
- Módulo backend `modules/tratamientos/` (`routes` / `service` / `validator`) y
  módulo frontend `modules/tratamientos/` (2 páginas + 2 componentes + service + estilos).
- Integración: `app.js`, `AppRouter.jsx`, `LayoutPrincipal.jsx` y la sección
  **«Tratamientos del paciente»** real en `FichaPacientePage.jsx`.

**Baja lógica = estado «cancelado»** (no hay columna `activo` ni `desactivar`/`reactivar`).

---

## Sprint Backlog

| Nro | Historia de Usuario | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|
| HU13 | Registrar un nuevo tratamiento para un paciente, con la práctica y el precio acordado. | Alta | S/M | Paciente cargado (ABM 02) |
| HU14 | Modificar un tratamiento existente respetando lo que cada estado permite tocar. | Alta | S/M | HU13 |
| HU15 | Listar tratamientos filtrando por estado, paciente, tipo y rango de fechas, con búsqueda y orden. | Alta | M | HU13 |
| HU16 | Dar de baja lógica (cancelar) un tratamiento indicando el motivo, sin perder el historial. | Alta | S | HU13, HU15 |
| HU17 | Avanzar el tratamiento por su ciclo de estados mediante transiciones controladas. | Alta | M | HU13 |
| HU18 | Abrir el detalle con saldo, pagos, gastos imputados e historial completo de cambios. | Media | M | HU13 … HU17 |
| HU19 | Permisos diferenciados por operación y trazabilidad del actor en cada cambio. | Media | S | HU13 … HU17 |

---

## Migraciones SQL

| NNN | Archivo | Qué hace |
|----:|---------|----------|
| 005 | `database/migrations/005_tratamientos.sql` | `ALTER TABLE tratamientos ADD COLUMN` (aditivo, reejecutable): `id_consultorio INT NOT NULL` (+ FK `fk_tratamientos_consultorio`, guard contra `information_schema`), `fecha_actualizacion DATETIME … ON UPDATE CURRENT_TIMESTAMP`, `motivo_cancelacion VARCHAR(255) NULL`; backfill de la fila existente al consultorio 1. `CREATE TABLE IF NOT EXISTS auditoria_cambios` (genérica: `entidad`, `id_entidad`, `id_usuario`, `accion`, `campo`, `valor_anterior`, `valor_nuevo`, `motivo`, `fecha`; FK a `usuarios`). |
| 006 | `database/migrations/006_permisos_tratamientos.sql` | `INSERT IGNORE` de `cambiar_estado_tratamientos` y `cancelar_tratamientos` + `INSERT IGNORE` en `roles_permisos` para el rol administrador (por `codigo_permiso`, sin id fijo). |

> El tratamiento existente (**ID 1**, «en proceso», $50.000 con $20.000 cobrados) se conserva
> intacto tras aplicar las migraciones.

---

## Endpoints — `/api/tratamientos`

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/tratamientos` | `ver_tratamientos` | Lista + filtros `?id_paciente ?id_estado ?id_tipo ?busqueda ?desde ?hasta ?orden=fecha_desc\|fecha_asc\|actualizacion_desc ?pagina ?porPagina`. Devuelve `{ tratamientos, total, pagina, porPagina }` con `total_cobrado` y `saldo` derivados. |
| GET | `/api/tratamientos/opciones` | `ver_tratamientos` | `{ tipos, estados, pacientes }` (activos del consultorio) para los selectores del formulario. |
| GET | `/api/tratamientos/:id` | `ver_tratamientos` | Detalle + `historial` (auditoría con actor) + `pagos` + `gastos` + `transiciones_posibles`. |
| POST | `/api/tratamientos` | `crear_tratamientos` | Alta. Fuerza estado `pendiente`; estampa `id_usuario` e `id_consultorio`. |
| PUT | `/api/tratamientos/:id` | `editar_tratamientos` | Modificación según campos editables por estado; regla de precio ≥ cobrado; auditoría campo a campo. |
| PATCH | `/api/tratamientos/:id/estado` | `cambiar_estado_tratamientos` (+ `cancelar_tratamientos` si destino = 4) | Transición contra la matriz. `{ id_estado, motivo? }`. |

---

## Reglas de negocio

### Matriz de transiciones (fila = origen, columna = destino)

| Origen \ Destino | pendiente | en proceso | finalizado | cancelado |
|---|---|---|---|---|
| **pendiente** | — | ✅ | ❌ «Debe iniciarse antes de finalizar.» | ✅ (motivo obligatorio) |
| **en proceso** | ❌ | — | ✅ (setea `fecha_fin` = hoy) | ✅ (motivo obligatorio) |
| **finalizado** | ❌ | ❌ | — | ❌ (estado final) |
| **cancelado** | ❌ | ❌ | ❌ | — (estado final) |

- Salir de `finalizado` / `cancelado` → 409 `"El tratamiento está <estado>: no admite cambios de estado."`
- `→ en proceso`: si `FECHA_INICIO` está vacía, se setea hoy.
- `→ cancelado`: `motivo` obligatorio (mín. 5 caracteres) **y** sin pagos registrados **y** permiso `cancelar_tratamientos`.

### Campos editables por estado

| Estado | Editables | Bloqueados |
|---|---|---|
| pendiente | paciente, tipo, descripción, precio, fecha inicio, fecha fin, observaciones | `id_tratamiento` |
| en proceso | descripción, precio, fecha fin, observaciones | paciente, tipo, fecha inicio |
| finalizado / cancelado | observaciones | todo el resto → 409 `"Tratamiento <estado>, no editable."` |

- El precio nunca puede quedar `< Σ pagos` → 409 `"El precio no puede ser menor al total ya cobrado ($X)."`
- El precio de alta y de edición debe ser `> 0`.

### Auditoría (`auditoria_cambios`, `entidad = 'tratamientos'`)

| Acción | Cuándo | Registra |
|---|---|---|
| `alta` | POST | actor + `valor_nuevo = 'pendiente'` |
| `modificacion` | PUT | una fila por campo cambiado (`campo`, `valor_anterior`, `valor_nuevo`) |
| `cambio_estado` | PATCH `/estado` (destino ≠ 4) | `campo = 'id_estado'`, nombres de estado viejo → nuevo |
| `cancelacion` | PATCH `/estado` (destino = 4) | igual que `cambio_estado` + `motivo` |

Todas las escrituras de auditoría van **dentro de la misma transacción** que el cambio.

---

## Frontend

```
modules/tratamientos/
  pages/PaginaTratamientos.jsx        listado + filtros (estado/tipo/paciente/fechas) + orden + paginación + "Sin resultados"
  pages/DetalleTratamientoPage.jsx    detalle + saldo + pagos + gastos + línea de tiempo del historial + acciones
  components/FormularioTratamiento.jsx alta/edición; campos habilitados según estado
  components/CambiarEstadoModal.jsx    transiciones alcanzables + motivo obligatorio si cancela
  services/tratamientosService.js
  styles/tratamientos.css
```

- **Rutas** (`AppRouter.jsx`): `tratamientos` → `PaginaTratamientos`, `tratamientos/:id` → `DetalleTratamientoPage`, ambas `RutaPorPermiso permisoRequerido="ver_tratamientos"`.
- **Menú** (`LayoutPrincipal.jsx`): el ítem «Tratamientos» ya existía; se agregó el título «Detalle del tratamiento» al breadcrumb.
- **Ficha del paciente** (`FichaPacientePage.jsx`): el bloque «Tratamientos del paciente» ahora lista los del paciente (`GET /api/tratamientos?id_paciente=`) con botón «Nuevo tratamiento» (paciente prefijado).

---

## Checklist de aceptación

- [x] Migraciones aplicadas; el tratamiento existente (ID 1, «en proceso») conserva datos (`id_consultorio = 1`).
- [x] Alta: obligatorios validados, estado inicial `pendiente` automático, aparece con ID visible.
- [x] Modificación permitida se refleja en detalle y listado; campo no editable → bloqueado con mensaje 409.
- [x] Transición válida (`en proceso → finalizado`) OK; inválida (`pendiente → finalizado`) → «Debe iniciarse antes de finalizar».
- [x] Cancelar exige motivo (≥ 5) y permiso `cancelar_tratamientos`; sale de la bandeja de pendientes.
- [x] Tratamiento finalizado/cancelado: la UI deshabilita campos y muestra «Tratamiento \<estado\>, no editable».
- [x] Consulta: filtro por estado + búsqueda de texto + orden por última actualización; sin resultados → «Sin resultados».
- [x] Detalle muestra el historial de cambios (campo, valor anterior, nuevo, fecha, actor).
- [x] Usuario sin `editar_tratamientos` ve el detalle pero no edita; edición de otro usuario queda en auditoría.
- [x] `auditoria_cambios` creada y poblándose.
- [x] `id_consultorio` en todas las queries; alta lo estampa junto con `id_usuario`.
- [x] Regla de precio ≥ total cobrado (alineada con `com.docx` HU14-C2).
- [x] Cancelación bloqueada si hay pagos (alineada con `com.docx` HU16-C2).
- [x] Documentación completa en `docs/abm/entregas/03-tratamientos/` (`.docx` + `sprintlog.md` + 7 mockups).

---

## Tabla de prueba manual de la API

> Base: `http://localhost:3000/api` · `Authorization: Bearer <JWT rol administrador>` · `Content-Type: application/json`.
> Verificado contra la base real; las altas de prueba se eliminaron al finalizar.

| # | Método y ruta | Body | Respuesta esperada |
|---|---|---|---|
| 1 | `GET /tratamientos/opciones` | — | `200` · `{ tipos:[5], estados:[4], pacientes:[activos del consultorio] }` |
| 2 | `GET /tratamientos` | — | `200` · `{ tratamientos:[…], total, pagina:1, porPagina:20 }` con `saldo` y `total_cobrado` |
| 3 | `GET /tratamientos/1` | — | `200` · detalle + `historial`, `pagos:[1]`, `gastos:[1]`, `transiciones_posibles:[3,4]` |
| 4 | `POST /tratamientos` | `{"id_paciente":1,"id_tipo_tratamiento":2,"precio_paciente":50000,"fecha_inicio":"2026-05-01"}` | `201` · `tratamiento.id_estado = 1` («pendiente»), `id_usuario` e `id_consultorio` estampados |
| 5 | `POST /tratamientos` | `{"id_paciente":1,"precio_paciente":0}` | `400` · `errores:["El tipo de tratamiento es obligatorio.","El precio debe ser mayor a cero."]` |
| 6 | `POST /tratamientos` | `{"id_paciente":999,"id_tipo_tratamiento":2,"precio_paciente":100}` | `400` · `"El paciente no existe o no pertenece a este consultorio."` |
| 7 | `PUT /tratamientos/<nuevo>` | `{"id_tipo_tratamiento":3,"precio_paciente":65000}` (estado pendiente) | `200` · valores actualizados; `historial` suma 2 filas `modificacion` |
| 8 | `PATCH /tratamientos/<nuevo>/estado` | `{"id_estado":3}` (desde pendiente) | `409` · `"Debe iniciarse antes de finalizar."` |
| 9 | `PATCH /tratamientos/<nuevo>/estado` | `{"id_estado":2}` | `200` · `id_estado = 2`; `fecha_inicio` se completa si estaba vacía |
| 10 | `PATCH /tratamientos/<nuevo>/estado` | `{"id_estado":4}` (sin motivo) | `400` · `"El motivo de cancelación es obligatorio (mínimo 5 caracteres)."` |
| 11 | `PATCH /tratamientos/<nuevo>/estado` | `{"id_estado":4,"motivo":"El paciente no continuó el tratamiento"}` | `200` · `id_estado = 4`, `motivo_cancelacion` guardado, `historial` con `accion:"cancelacion"` |
| 12 | `PUT /tratamientos/<cancelado>` | `{"precio_paciente":70000}` | `409` · `"Tratamiento cancelado, no editable."` |
| 13 | `PUT /tratamientos/<cancelado>` | `{"observaciones":"cerrado ok"}` | `200` · sólo observaciones se actualiza |
| 14 | `PATCH /tratamientos/1/estado` | `{"id_estado":4,"motivo":"prueba bloqueo"}` | `409` · `"No se puede cancelar: el tratamiento tiene pagos registrados. Anulá los pagos primero."` |
| 15 | `PUT /tratamientos/1` | `{"precio_paciente":15000}` | `409` · `"El precio no puede ser menor al total ya cobrado ($20000.00)."` |
| 16 | `PATCH /tratamientos/<cancelado>/estado` | `{"id_estado":1}` | `409` · `"El tratamiento está cancelado: no admite cambios de estado."` |
| 17 | cualquier ruta | sin header `Authorization` | `401` · `"No se envió token de autenticación."` |
| 18 | `POST /tratamientos` con token de rol sin `crear_tratamientos` | — | `403` · `"No tenés permisos para realizar esta acción."` |
