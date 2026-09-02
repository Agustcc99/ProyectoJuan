# ABM 04 — `pagos` (Transaccional)

> Requiere: `00-contexto-base.md` + `_plantilla-documentacion.md` + ABM 01 y 03 completados.

## Objetivo

ABM de los cobros. Cada pago se registra **contra un tratamiento** (`pagos.ID_TRATAMIENTO` NOT NULL)
con un medio de pago. Σ pagos vigentes de un tratamiento vs. `PRECIO_PACIENTE` = **saldo pendiente**.

## Estado real de la tabla

```
pagos: ID_PAGO, ID_TRATAMIENTO(FK, NOT NULL), MONTO(decimal 10,2), ID_MEDIO_PAGO(FK),
       FECHA_PAGO(datetime), NOTAS(text), ID_USUARIO(FK)
```
No tiene baja lógica → agregar `ANULADO`.

## Clasificación y dependencias

- **Tipo:** Transaccional. **Depende de:** `tratamientos` (N—1), `medios_pago` (N—1), `usuarios` (N—1).

## Migración SQL — `database/migrations/007_pagos.sql`

```sql
ALTER TABLE pagos ADD COLUMN id_consultorio   INT          NOT NULL DEFAULT 1;
UPDATE pagos SET id_consultorio = 1;
ALTER TABLE pagos ALTER COLUMN id_consultorio DROP DEFAULT;
ALTER TABLE pagos ADD CONSTRAINT fk_pagos_consultorio
  FOREIGN KEY (id_consultorio) REFERENCES consultorios(id_consultorio);

ALTER TABLE pagos ADD COLUMN anulado          TINYINT(1)   NOT NULL DEFAULT 0;
ALTER TABLE pagos ADD COLUMN motivo_anulacion VARCHAR(255) NULL;
ALTER TABLE pagos ADD COLUMN id_usuario_anula INT          NULL;
ALTER TABLE pagos ADD COLUMN fecha_creacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pagos ADD CONSTRAINT fk_pagos_usuario_anula
  FOREIGN KEY (id_usuario_anula) REFERENCES usuarios(ID_USUARIO);
```

Todas las queries filtran por `id_consultorio = req.usuario.id_consultorio`; el alta lo estampa
(y valida que el tratamiento sea del mismo consultorio).

## Permisos — `database/migrations/008_permisos_pagos.sql`

`registrar_pagos` ya existe (= alta). Agregar:

```sql
INSERT INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_pagos',    'Ver pagos',    'Ver los pagos de tratamientos',        1),
  ('editar_pagos', 'Editar pagos', 'Editar medio/fecha/notas de un pago',   1),
  ('anular_pagos', 'Anular pagos', 'Anular un pago registrado',             1);
INSERT INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos WHERE codigo_permiso IN ('ver_pagos','editar_pagos','anular_pagos');
```

## Reglas de negocio

- **Obligatorios en el alta:** `id_tratamiento`, `id_medio_pago`, `monto` (> 0).
- El tratamiento debe existir y **no estar en estado `cancelado`** (409 `"No se pueden registrar pagos en un tratamiento cancelado."`).
- El medio de pago debe existir y estar `activo = 1`.
- **Sobrepago:** se **permite** con advertencia si `Σ pagos vigentes + monto > PRECIO_PACIENTE`
  → devolver `advertencia: "El total pagado supera el precio del tratamiento."` (no bloquear).
  Constante `PERMITIR_SOBREPAGO = true` por si se quiere invertir.
- `fecha_pago`: default ahora; si viene, no futura.
- **Modificación:** solo `id_medio_pago`, `fecha_pago`, `notas`. El **`monto` NO se edita**
  → 409 `"El monto de un pago no se edita: anulá y registrá uno nuevo."`.
- **Baja lógica = anulación:** `PATCH /:id/anular` con `{ motivo }` obligatorio (mín 5), permiso
  `anular_pagos`. Setea `anulado=1`, `motivo_anulacion`, `id_usuario_anula`. No hay "reactivar".
- Un pago anulado no cuenta para el saldo ni para reportes de caja.
- **Auditoría:** alta, modificación, anulación → `auditoria_cambios` (`entidad='pagos'`), en transacción.

## Backend — `modules/pagos/` (`/api/pagos`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/` | `ver_pagos` | Lista + filtros: `?id_tratamiento=`, `?id_medio_pago=`, `?desde=&hasta=` (fecha_pago), `?estado=vigentes\|anulados\|todos`, orden por fecha, paginación. Resuelve nombres (paciente, tratamiento, medio). |
| GET | `/:id` | `ver_pagos` | Detalle + auditoría. |
| POST | `/` | `registrar_pagos` | Alta (acepta `?id_tratamiento=` prefijado desde la ficha). |
| PUT | `/:id` | `editar_pagos` | Modificación acotada. |
| PATCH | `/:id/anular` | `anular_pagos` | Anulación con motivo. |

Endpoint auxiliar (o dentro del detalle del tratamiento en ABM 03):
`GET /api/tratamientos/:id/pagos` → pagos + total pagado + saldo.

## Frontend — `modules/pagos/`

```
pages/PaginaPagos.jsx          → listado global de pagos con filtros (fecha, medio, estado) — vista "caja"
components/FormularioPago.jsx   → alta (monto, medio, fecha, notas) + edición acotada
components/AnularPagoModal.jsx   → motivo de anulación
services/pagosService.js
```

- **Integración principal:** dentro de `DetalleTratamientoPage.jsx` (ABM 03) — sección "Pagos":
  tabla de pagos del tratamiento, total pagado, **saldo pendiente destacado**, botón "Registrar pago"
  (si `tienePermiso("registrar_pagos")` y el tratamiento no está cancelado), acción "Anular" por fila.
- **Menú:** ítem "Pagos" / "Caja" en `LayoutPrincipal.jsx` con `mostrar: tienePermiso("ver_pagos")`.
  Ruta `/panel/pagos`, título en `obtenerTituloRutaActual`.
- Mostrar la `advertencia` de sobrepago si viene (banner amarillo, no bloquea).

## Documento SprintLog — `docs/abm/entregas/04-pagos/`

`sprintlog.md` + (transaccional) las secciones del PDF: Sprint Backlog, Reglas de negocio
(monto no editable, sobrepago, no pagar cancelados, anulación con motivo, auditoría), Historias
de usuario, Criterios de aceptación, Mockups, Subtareas TSHIRT, Pruebas de criterios.

## Checklist de aceptación

- [ ] Migración aplicada; el pago existente (ID 1, $20.000) queda `anulado=0`.
- [ ] Alta: monto > 0 y medio válido; el pago aparece y el saldo del tratamiento se recalcula (tratamiento 1: 50.000 − 20.000 = 30.000).
- [ ] No se puede pagar un tratamiento cancelado.
- [ ] Editar monto → bloqueado con mensaje; editar medio/fecha/notas → OK.
- [ ] Anular con motivo: el pago queda "anulado", deja de contar para saldo y caja, visible en "todos".
- [ ] Sobrepago: se registra con advertencia visible.
- [ ] Listado de caja filtra por rango de fechas y medio; totales correctos.
- [ ] Historial de auditoría por pago (alta, edición, anulación con actor/fecha/motivo).
- [ ] Sin `registrar_pagos` no aparece el botón y el POST responde 403.
- [ ] Documentación en `docs/abm/entregas/04-pagos/`.
- [ ] Tabla de prueba manual.
