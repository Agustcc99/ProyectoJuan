# ABM 02 — `pacientes` (Maestra)

> Requiere: `00-contexto-base.md` + `_plantilla-documentacion.md` + ABM 01 completado.

## Objetivo

ABM de la ficha de paciente: **entidad maestra central**. Todo el flujo clínico-financiero
(tratamientos → pagos → gastos) cuelga de un paciente. Ya existen: la tabla con datos, la ruta
`/panel/pacientes`, la página placeholder `PaginaPacientes.jsx` y los permisos
`ver_pacientes` / `crear_pacientes` / `editar_pacientes`. Falta implementar todo y agregar la baja lógica.

## Estado real de la tabla

```
pacientes: ID_PACIENTE, NOMBRE(50), APELLIDO(50), DNI(20, NULL), TELEFONO(20),
           EMAIL(100), OBRA_SOCIAL(50), OBSERVACIONES(text), ACTIVO(default 1)
```
No tiene: `id_consultorio`, `FECHA_ALTA`, `FECHA_NACIMIENTO`, `id_usuario_alta`.

## Clasificación y dependencias

- **Tipo:** Maestra. **Depende de:** nada (mono-consultorio). **Referido por:** `tratamientos.ID_PACIENTE` (1—N).

## Migración SQL — `database/migrations/003_pacientes.sql`

```sql
-- Multi-tenant: alinear con el aislamiento por consultorio del Sprint 2.
ALTER TABLE pacientes ADD COLUMN id_consultorio INT NOT NULL DEFAULT 1;
UPDATE pacientes SET id_consultorio = 1;                 -- backfill filas existentes
ALTER TABLE pacientes ALTER COLUMN id_consultorio DROP DEFAULT;
ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_consultorio
  FOREIGN KEY (id_consultorio) REFERENCES consultorios(id_consultorio);

-- Trazabilidad de alta (opcional pero recomendado; el resto del sistema estampa autor).
ALTER TABLE pacientes ADD COLUMN fecha_alta       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pacientes ADD COLUMN id_usuario_alta  INT NULL;
ALTER TABLE pacientes ADD COLUMN fecha_nacimiento DATE NULL;   -- pedido en el doc de diseño original
ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_usuario
  FOREIGN KEY (id_usuario_alta) REFERENCES usuarios(ID_USUARIO);

-- DNI: hoy es NULL y sin unicidad. Definir política:
--   opción elegida → DNI obligatorio y único (case/space-insensitive por app).
--   No se puede poner UNIQUE directo si hay NULLs/duplicados: primero limpiar, luego:
-- ALTER TABLE pacientes ADD CONSTRAINT uq_pacientes_dni UNIQUE (DNI);
-- Si preferís no tocar la constraint, la unicidad se valida solo por aplicación (documentarlo).
```

## Permisos — `database/migrations/004_permisos_pacientes.sql`

```sql
INSERT INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('desactivar_pacientes', 'Desactivar pacientes', 'Baja lógica de fichas de paciente', 1),
  ('reactivar_pacientes',  'Reactivar pacientes',  'Reactivar fichas dadas de baja',    1);
INSERT INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos WHERE codigo_permiso IN ('desactivar_pacientes','reactivar_pacientes');
```

## Backend — `modules/pacientes/` (`/api/pacientes`)

> Borrar `pacientes.controller.js` y `pacientes.repository.js` (scaffold vacío).
> Patrón `routes + service + validator` de `roles`.

| Método | Ruta | Permiso | Notas |
|---|---|---|---|
| GET | `/` | `ver_pacientes` | Lista paginada. Query: `?busqueda=` (nombre/apellido/dni), `?estado=activos\|inactivos\|todos`, `?pagina=`, `?porPagina=` (default 20). Devuelve `{ pacientes, total, pagina, porPagina }`. |
| GET | `/:id` | `ver_pacientes` | Detalle. 404 si no existe. Incluir contador `tratamientos_total` (COUNT en `tratamientos`). |
| POST | `/` | `crear_pacientes` | Alta. |
| PUT | `/:id` | `editar_pacientes` | Modificación. |
| PATCH | `/:id/desactivar` | `desactivar_pacientes` | Baja lógica. |
| PATCH | `/:id/reactivar` | `reactivar_pacientes` | Reactivación. |

### Validación de formato (`pacientes.validator.js`, responde 400 con array `errores`)

- `nombre`, `apellido`: obligatorios, `trim`, 2–50.
- `dni`: obligatorio, `trim`, solo dígitos, 7–20.
- `email`: opcional; si viene, regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` (la misma de `auth.validator.js`), máx 100.
- `telefono`: opcional, máx 20.
- `obra_social`: opcional, máx 50.
- `fecha_nacimiento`: opcional; si viene, fecha válida y no futura.
- `observaciones`: opcional, máx 2000.

### Reglas de negocio (`pacientes.service.js`)

- **Todas las queries filtran por `id_consultorio = req.usuario.id_consultorio`.**
- **DNI único por consultorio** (case/space-insensitive). Alta duplicada → 409 `"Ya existe un paciente con ese DNI."`. En edición, excluir el propio `id`.
- Alta: `id_consultorio = req.usuario.id_consultorio`, `ACTIVO = 1`, `id_usuario_alta = req.usuario.id_usuario`, `fecha_alta = NOW()`.
- Modificar/desactivar/reactivar: verificar que el paciente exista **y pertenezca al consultorio** (404).
- Desactivar: permitido aunque tenga tratamientos (la baja del paciente es independiente); si tiene
  tratamientos, devolver en la respuesta `advertencia: "El paciente tiene N tratamientos registrados."`.
- Reactivar: rechazar si hay otro paciente activo con el mismo DNI (409).
- `ID_PACIENTE`, `fecha_alta` no editables.

## Frontend — `modules/pacientes/`

Reemplazar `pages/PaginaPacientes.jsx` (placeholder) y crear:

```
pages/PaginaPacientes.jsx          → listado + búsqueda + filtro estado + paginación
pages/FichaPacientePage.jsx        → detalle/edición (ruta /panel/pacientes/:id)
components/FormularioPaciente.jsx   → alta y edición
components/ConfirmacionAccionModal  → reusar el de modules/roles/components
services/pacientesService.js       → obtenerPacientes, obtenerPaciente, crearPaciente, actualizarPaciente, desactivarPaciente, reactivarPaciente
styles/pacientes.css
```

- **Menú:** "Pacientes" ya existe en `LayoutPrincipal.jsx`. Agregar en `obtenerTituloRutaActual` el título de `/panel/pacientes/:id` ("Ficha del paciente").
- **Rutas** en `AppRouter.jsx`:
  ```jsx
  <Route path="pacientes" element={<RutaPorPermiso permisoRequerido="ver_pacientes"><PaginaPacientes/></RutaPorPermiso>} />
  <Route path="pacientes/:id" element={<RutaPorPermiso permisoRequerido="ver_pacientes"><FichaPacientePage/></RutaPorPermiso>} />
  ```
- Botones "Nuevo" / "Editar" / "Desactivar" según `tienePermiso("crear_pacientes")` etc.
- Listado: columnas Nombre, Apellido, DNI, Teléfono, Obra social, Estado. Fila → ficha.
- Validación en cliente antes de enviar + mostrar los `errores` del backend.
- En la ficha, dejar una sección **"Tratamientos del paciente"** como placeholder ("Próximamente" / comentada) — se completa en el ABM 03.

## Documento SprintLog

Generar `docs/abm/entregas/02-pacientes/sprintlog.md` según `_plantilla-documentacion.md`
(HU: alta, modificación, baja lógica, consulta, ver ficha, permisos).

## Checklist de aceptación

- [ ] Migraciones aplicadas; el paciente existente (Ana Pérez) conserva sus datos y queda `activo=1`.
- [ ] Alta con validación por campo (cliente + backend); DNI duplicado → mensaje claro, no crea.
- [ ] Listado con búsqueda por nombre/apellido/DNI, filtro por estado y paginación.
- [ ] Ficha muestra todos los campos; edición persiste y se refleja en el listado.
- [ ] Baja lógica: desaparece de "activos", visible en "todos"/"inactivos", reactivable.
- [ ] Campos no editables bloqueados (`ID_PACIENTE`, `fecha_alta`).
- [ ] Sin `crear_pacientes` no aparece el botón y el POST responde 403.
- [ ] `sprintlog.md` generado.
- [ ] Tabla de prueba manual (curl/Postman) incluida.
