# SprintLog — Módulo 06 · Reportes (consumo, solo lectura)

> Sprint documental: **4.5** · Historias: **HU1 … HU6** (numeración propia del sprint).
> Documento formal: [`SprintLog-Reportes.docx`](SprintLog-Reportes.docx) (formato calcado de `com.docx`).
> Mockups: [`mockups/`](mockups/) (wireframes HTML + PNG en escala de grises, `generar-mockups.js`).
> Generación del `.docx`: `NODE_PATH=<scratchpad>/docxbuild/node_modules node generar-sprintlog.js`.

---

## Objetivo del Sprint

Implementar el módulo de **Reportes**: la capa de **consulta** que responde la pregunta central del
negocio del documento de proyecto — *cuánto se cobra, cuánto ingresa por cada práctica, cuánto se
gasta*. **No es un ABM**: no crea, no modifica ni da de baja nada. Lee los datos que ya cargaron los
ABM de Pagos y Gastos, considerando sólo los movimientos **vigentes**.

- **Sin migración.** El permiso `ver_reportes` ya estaba sembrado y asignado al rol administrador.
  El módulo se apoya en las columnas `anulado` e `id_consultorio` que agregaron los ABM 04 y 05.
- Módulo backend `modules/reportes/` (`routes` / `service` / `validator`) + alta en `app.js`.
- Módulo frontend `modules/reportes/`: la pantalla real reemplaza el placeholder `PaginaReportes.jsx`.
- Integración: `AppRouter.jsx` (la ruta `reportes` deja de apuntar a `<Proximamente>`). El ítem
  «Reportes» del menú y el título del breadcrumb **ya existían** (no se tocan).
- **Sin librería de gráficos**: barras hechas con `div` + CSS.

---

## Sprint Backlog

| Nro | Historia de Usuario | Prioridad | Estimación | Dependencias |
|---|---|---|---|---|
| HU1 | Ver el resumen económico de un período (ingresos, egresos, neto) + tratamientos por estado. | Alta | M | ABM Pagos + ABM Gastos + `ver_reportes` |
| HU2 | Ver los ingresos del período agrupados por tipo de práctica (qué práctica deja más). | Alta | S | HU1 |
| HU3 | Ver los cobros del período agrupados por medio de pago (arqueo de caja). | Media | S | HU1 |
| HU4 | Ver los gastos del período agrupados por tipo de gasto. | Media | S | HU1 |
| HU5 | Ver la lista de tratamientos con saldo pendiente (precio, pagado, saldo). | Alta | S | ABM Tratamientos + ABM Pagos |
| HU6 | Ver la evolución mensual (ingresos / egresos / neto) de un año. | Media | S | HU1 |

---

## Endpoints — `/api/reportes`

Todos GET · `verificarToken` + `verificarPermiso("ver_reportes")` · aislados por
`req.usuario.id_consultorio` · sólo `pagos.anulado = 0` y `gastos.anulado = 0`.
Rango por defecto: **mes actual**. Se valida formato `YYYY-MM-DD` y `desde <= hasta`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reportes/resumen?desde=&hasta=` | `{ periodo, ingresos, egresos, neto, cantidad_pagos, cantidad_gastos, tratamientos_por_estado:[{id_estado,nombre,cantidad}] }`. Ingresos = Σ pagos vigentes por `fecha_pago` en rango; egresos = Σ gastos vigentes por `fecha_gasto`. `tratamientos_por_estado` es snapshot del consultorio (sin filtro de fecha). |
| GET | `/api/reportes/ingresos-por-tipo?desde=&hasta=` | `{ periodo, items:[{id_tipo_tratamiento,nombre,total,cantidad_pagos}], total }` — `pagos → tratamientos → tipos_tratamiento`, orden por total desc. |
| GET | `/api/reportes/ingresos-por-medio?desde=&hasta=` | `{ periodo, items:[{id_medio_pago,nombre,total,cantidad_pagos}], total }` — `pagos → medios_pago`. |
| GET | `/api/reportes/egresos-por-tipo?desde=&hasta=` | `{ periodo, items:[{id_tipo_gasto,nombre,total,cantidad_gastos}], total }` — `gastos → tipos_gasto`. |
| GET | `/api/reportes/pendientes` | `{ items:[{id_tratamiento,paciente,tipo_tratamiento,id_estado,estado,precio,pagado,saldo}], total_pendientes, total_saldo }` — tratamientos no cancelados con `saldo > 0`. No usa rango. |
| GET | `/api/reportes/mensual?anio=` | `{ anio, meses:[{mes,ingresos,egresos,neto}] (12 fijas), totales:{ingresos,egresos,neto} }`. Año por defecto: el actual; `anio` válido: 2000–2100. |

---

## Reglas de cálculo

- **Sólo vigentes:** todo total suma únicamente `pagos.anulado = 0` / `gastos.anulado = 0`.
- **Aislamiento por consultorio:** cada query filtra por `req.usuario.id_consultorio`, nunca por un
  parámetro de la petición.
- **Rango:** por defecto el mes actual (día 1 → hoy). Se usa `fecha_pago` para ingresos y
  `fecha_gasto` para egresos (fechas contables, no la de creación de la fila).
- **Neto** = ingresos − egresos (puede ser negativo).
- **Saldo de un tratamiento** = `precio_paciente − Σ(pagos vigentes)`. `pendientes` lista los
  tratamientos **no cancelados** con saldo > 0; no depende del rango.
- **Tratamientos por estado:** snapshot (cuenta todos, sin filtrar por fecha).
- Sin escritura → **sin transacciones, sin auditoría, sin transiciones de estado**.

---

## Frontend

```
modules/reportes/
  page/PaginaReportes.jsx          selector de período + KPIs (ingresos/egresos/neto) + tratamientos por estado
                                   + 3 paneles de barras (por práctica / por medio / por tipo de gasto)
                                   + tabla de pendientes + vista mensual (selector de año + tabla/barras)
  components/BarrasReporte.jsx      barras horizontales div/CSS reutilizables (sin librería de charts)
  services/reportesService.js      6 funciones axios → respuesta.data
  styles/reportes.css              KPIs, barras, tablas numéricas, vista mensual
```

- **Ruta** (`AppRouter.jsx`): `reportes` → `<PaginaReportes>` dentro de
  `RutaPorPermiso permisoRequerido="ver_reportes"`. Se eliminó el componente `Proximamente` que
  quedó sin uso.
- **Menú / breadcrumb:** ya existían en `LayoutPrincipal.jsx` (`ver_reportes`), no se modificaron.
- **Error:** 403 → «No tenés permisos suficientes para consultar los reportes.»; el guard de ruta
  lleva a la pantalla de acceso denegado.

---

## Checklist de aceptación

- [x] Resumen del período con ingresos, egresos y neto correctos (validado con el rango abril 2026: 1 pago de 20.000, 2 gastos de 15.000 + 30.000 → ingresos 20.000 / egresos 45.000 / neto −25.000).
- [x] Ingresos por tipo de práctica (`endodoncia` 20.000) y por medio de pago (`efectivo` 20.000); el total del arqueo coincide con los ingresos del resumen.
- [x] Egresos por tipo de gasto (`laboratorio` 30.000, `insumo` 15.000).
- [x] Lista de pendientes con saldo por tratamiento (escenario de referencia: tratamiento 1 → saldo 30.000). Con la base viva —dos pagos de prueba extra cargados en el ABM de Pagos— el tratamiento queda saldado y la lista aparece vacía.
- [x] Vista mensual del año (2026): abril neto −25.000, septiembre neto 30.000, total del año neto 5.000.
- [x] Anulados excluidos de todos los totales (`pagos.anulado = 0` / `gastos.anulado = 0`).
- [x] Sin `ver_reportes` → 403 en todos los endpoints y pantalla de acceso denegado; el ítem de menú no se muestra.
- [x] Aislamiento por consultorio en todas las queries.
- [x] `sprintlog.md` + `SprintLog-Reportes.docx` + 7 mockups generados.

---

## Tabla de prueba manual de la API

> Base: `http://localhost:3000/api` · `Authorization: Bearer <JWT>` · verificado contra la base real
> (`odontologia_herrera`, MariaDB 10.4) con el backend levantado localmente y un JWT del rol
> administrador. Rango determinista: **2026-04-01 … 2026-04-30**.

| # | Método y ruta | Respuesta esperada |
|---|---|---|
| 1 | `GET /reportes/resumen?desde=2026-04-01&hasta=2026-04-30` | `200` · `ingresos:20000, egresos:45000, neto:-25000, cantidad_pagos:1, cantidad_gastos:2`; `tratamientos_por_estado` con `finalizado:1`, resto `0` |
| 2 | `GET /reportes/resumen` (sin params) | `200` · `periodo.desde` = 1º del mes actual, `periodo.hasta` = hoy |
| 3 | `GET /reportes/resumen?desde=2026-12-01&hasta=2026-01-01` | `400` · `"El parámetro «hasta» no puede ser anterior a «desde»."` |
| 4 | `GET /reportes/resumen?desde=nope` | `400` · `"El parámetro «desde» no es una fecha válida (YYYY-MM-DD)."` |
| 5 | `GET /reportes/ingresos-por-tipo?desde=2026-04-01&hasta=2026-04-30` | `200` · `items:[{nombre:"endodoncia", total:20000, cantidad_pagos:1}]`, `total:20000` |
| 6 | `GET /reportes/ingresos-por-medio?desde=2026-04-01&hasta=2026-04-30` | `200` · `items:[{nombre:"efectivo", total:20000, cantidad_pagos:1}]`, `total:20000` |
| 7 | `GET /reportes/egresos-por-tipo?desde=2026-04-01&hasta=2026-04-30` | `200` · `items:[{"laboratorio",30000,1},{"insumo",15000,1}]`, `total:45000` |
| 8 | `GET /reportes/pendientes` | `200` · con la base viva: `items:[]`, `total_pendientes:0`, `total_saldo:0` (tratamiento 1 saldado). Escenario de referencia (1 pago de 20.000): `saldo:30000` |
| 9 | `GET /reportes/mensual?anio=2026` | `200` · 12 meses; abril `{20000, 45000, -25000}`, septiembre `{30000, 0, 30000}`; `totales:{50000, 45000, 5000}` |
| 10 | `GET /reportes/mensual?anio=99` | `400` · `"El parámetro «anio» debe ser un año entre 2000 y 2100."` |
| 11 | `GET /reportes/resumen` sin header `Authorization` | `401` · `"No se envió token de autenticación."` |
| 12 | `GET /reportes/resumen` con token de un rol sin `ver_reportes` | `403` · `"No tenés permisos para realizar esta acción."` (idéntico en los 6 endpoints) |
