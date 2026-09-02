# ABM 05 — `gastos` (Transaccional)

> Requiere: `00-contexto-base.md` + `_plantilla-documentacion.md` + ABM 01 y 03 completados.
> Último ABM antes de reportes.

## Objetivo

ABM de los egresos del consultorio. Un gasto siempre tiene un **tipo de gasto**; y
**opcionalmente** se imputa a un tratamiento (`gastos.ID_TRATAMIENTO` NULLABLE): puede ser un
gasto general (alquiler, insumos del mes) o el costo de laboratorio de un tratamiento concreto.

## Estado real de la tabla

```
gastos: ID_GASTO, ID_TRATAMIENTO(FK, NULLABLE), ID_TIPO_GASTO(FK), MONTO(decimal 10,2),
        DESCRIPCION(text), FECHA_GASTO(datetime), ID_USUARIO(FK)
```
No tiene baja lógica → agregar `ANULADO`.

## Clasificación y dependencias

- **Tipo:** Transaccional. **Va último** entre las transaccionales: su FK a `tratamientos` es opcional,
  necesita la tabla pero no queda atada a su ciclo de estados.
- **Depende de:** `tipos_gasto` (N—1), `usuarios` (N—1), `tratamientos` (N—1, opcional).

## Migración SQL — `database/migrations/009_gastos.sql`

```sql
ALTER TABLE gastos ADD COLUMN id_consultorio   INT          NOT NULL DEFAULT 1;
UPDATE gastos SET id_consultorio = 1;
ALTER TABLE gastos ALTER COLUMN id_consultorio DROP DEFAULT;
ALTER TABLE gastos ADD CONSTRAINT fk_gastos_consultorio
  FOREIGN KEY (id_consultorio) REFERENCES consultorios(id_consultorio);

ALTER TABLE gastos ADD COLUMN anulado          TINYINT(1)   NOT NULL DEFAULT 0;
ALTER TABLE gastos ADD COLUMN motivo_anulacion VARCHAR(255) NULL;
ALTER TABLE gastos ADD COLUMN id_usuario_anula INT          NULL;
ALTER TABLE gastos ADD COLUMN fecha_creacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE gastos ADD CONSTRAINT fk_gastos_usuario_anula
  FOREIGN KEY (id_usuario_anula) REFERENCES usuarios(ID_USUARIO);
```

Todas las queries filtran por `id_consultorio = req.usuario.id_consultorio`; el alta lo estampa.

## Permisos — `database/migrations/010_permisos_gastos.sql`

`registrar_gastos` ya existe (= alta). Agregar:

```sql
INSERT INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_gastos',    'Ver gastos',    'Ver los gastos del consultorio',            1),
  ('editar_gastos', 'Editar gastos', 'Editar tipo/tratamiento/fecha/descripción',  1),
  ('anular_gastos', 'Anular gastos', 'Anular un gasto registrado',                 1);
INSERT INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos WHERE codigo_permiso IN ('ver_gastos','editar_gastos','anular_gastos');
```

## Reglas de negocio

- **Obligatorios:** `id_tipo_gasto`, `monto` (> 0). `descripcion` recomendable, opcional (máx 2000).
- `id_tratamiento` opcional; si viene, debe existir (cualquier estado — un tratamiento cancelado igual pudo generar un gasto de laboratorio).
- El tipo de gasto debe existir y estar `activo = 1`.
- `fecha_gasto`: default ahora; si viene, no futura.
- **Modificación:** `id_tipo_gasto`, `id_tratamiento`, `descripcion`, `fecha_gasto`. El **`monto` NO se edita** → 409.
- **Baja lógica = anulación:** `PATCH /:id/anular` con `{ motivo }` (mín 5), permiso `anular_gastos`.
- Un gasto anulado no cuenta para reportes.
- **Auditoría:** alta, modificación, anulación → `auditoria_cambios` (`entidad='gastos'`), en transacción.

## Backend — `modules/gastos/` (`/api/gastos`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/` | `ver_gastos` | Lista + filtros: `?id_tipo_gasto=`, `?id_tratamiento=`, `?desde=&hasta=` (fecha_gasto), `?estado=vigentes\|anulados\|todos`, `?imputacion=todos\|con_tratamiento\|generales`, orden por fecha, paginación. Resuelve nombres (tipo, y paciente/tratamiento si aplica). Devuelve `total` del período filtrado. |
| GET | `/:id` | `ver_gastos` | Detalle + auditoría. |
| POST | `/` | `registrar_gastos` | Alta. |
| PUT | `/:id` | `editar_gastos` | Modificación acotada. |
| PATCH | `/:id/anular` | `anular_gastos` | Anulación con motivo. |

## Frontend — `modules/gastos/`

```
pages/PaginaGastos.jsx          → listado con filtros (tipo, período, imputación, estado) + total del período
components/FormularioGasto.jsx   → alta/edición acotada; toggle "Gasto general / de un tratamiento"
components/AnularGastoModal.jsx
services/gastosService.js
```

- **Menú:** ítem "Gastos" en `LayoutPrincipal.jsx` con `mostrar: tienePermiso("ver_gastos")`.
  Ruta `/panel/gastos`, título en `obtenerTituloRutaActual`.
- **Integración:** en `DetalleTratamientoPage.jsx` (ABM 03), sección "Gastos imputados" — tabla de
  gastos con `id_tratamiento = :id`, total, botón "Imputar gasto" (prefija el tratamiento).

## Documento SprintLog — `docs/abm/entregas/05-gastos/`

`sprintlog.md` + (transaccional) las secciones del PDF: Sprint Backlog, Reglas de negocio
(general vs imputado, monto no editable, anulación con motivo, auditoría), Historias de usuario,
Criterios de aceptación, Mockups, Subtareas TSHIRT, Pruebas de criterios.

## Checklist de aceptación

- [ ] Migración aplicada; los 2 gastos existentes quedan `anulado=0` (uno general, uno imputado al tratamiento 1).
- [ ] Alta general (sin tratamiento) y alta imputada (con tratamiento) funcionan.
- [ ] `monto > 0` y tipo válido; monto no editable después.
- [ ] Anular con motivo: el gasto deja de sumar en el total del período, visible en "todos".
- [ ] Filtros por tipo, período e imputación; total del período correcto.
- [ ] Gasto imputado aparece también en la ficha del tratamiento.
- [ ] Historial de auditoría por gasto.
- [ ] Sin `registrar_gastos` no aparece el botón y el POST responde 403.
- [ ] Documentación en `docs/abm/entregas/05-gastos/`.
- [ ] Tabla de prueba manual.
