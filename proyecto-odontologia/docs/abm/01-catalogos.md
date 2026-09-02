# ABM 01 — `catalogos` (Soporte)

> Requiere: `00-contexto-base.md` + `_plantilla-documentacion.md` leídos antes.
> Primer ABM: **crea `database/`** y el módulo `catalogos` (ya scaffolded vacío).

## Objetivo

Un único ABM para los 4 catálogos de soporte, todos de estructura mínima:

| Catálogo | Tabla | Columnas actuales | Usado por |
|---|---|---|---|
| Estados de tratamiento | `estados_tratamiento` | `ID_ESTADO, NOMBRE_ESTADO` | `tratamientos.ID_ESTADO` |
| Medios de pago | `medios_pago` | `ID_MEDIO_PAGO, NOMBRE_MEDIO` | `pagos.ID_MEDIO_PAGO` |
| Tipos de gasto | `tipos_gasto` | `ID_TIPO_GASTO, NOMBRE_TIPO` | `gastos.ID_TIPO_GASTO` |
| Tipos de tratamiento | `tipos_tratamiento` | `ID_TIPO_TRATAMIENTO, NOMBRE, DESCRIPCION, ACTIVO` | `tratamientos.ID_TIPO_TRATAMIENTO` |

## Clasificación y dependencias

- **Tipo:** Soporte. **Depende de:** nada. **Referido por:** las 3 transaccionales (1—N cada uno).
- Mono-consultorio: sin `id_consultorio`.

## Migración SQL — `database/migrations/001_catalogos_activo.sql`

```sql
-- estados_tratamiento, medios_pago y tipos_gasto no tienen baja lógica: agregarla.
ALTER TABLE estados_tratamiento ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE medios_pago         ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE tipos_gasto         ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
-- tipos_tratamiento ya tiene ACTIVO.

-- Opcional recomendado: descripción en los que no la tienen (para la UI).
ALTER TABLE estados_tratamiento ADD COLUMN descripcion VARCHAR(255) NULL;
ALTER TABLE medios_pago         ADD COLUMN descripcion VARCHAR(255) NULL;
ALTER TABLE tipos_gasto         ADD COLUMN descripcion VARCHAR(255) NULL;
```

Además crear `database/schema-actual.sql` = dump `SHOW CREATE TABLE` de las 13 tablas (referencia, solo lectura) y `database/README.md` explicando el flujo de migraciones.

## Permisos — `database/migrations/002_permisos_catalogos.sql`

Los catálogos son administración pura → un solo par de permisos para los 4:

```sql
INSERT INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_catalogos',      'Ver catálogos',      'Ver los catálogos de soporte del sistema', 1),
  ('gestionar_catalogos','Gestionar catálogos','Alta, edición y baja de ítems de catálogo', 1);

INSERT INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos WHERE codigo_permiso IN ('ver_catalogos','gestionar_catalogos');
```

## Backend — `modules/catalogos/`

Un solo módulo, endpoints parametrizados por catálogo. Base `/api/catalogos`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/:catalogo` | `ver_catalogos` | Lista. `:catalogo` ∈ `estados-tratamiento\|medios-pago\|tipos-gasto\|tipos-tratamiento`. Query `?estado=activos\|inactivos\|todos`. |
| POST | `/:catalogo` | `gestionar_catalogos` | Alta. Body: `{ nombre, descripcion? }`. |
| PUT | `/:catalogo/:id` | `gestionar_catalogos` | Modificación. |
| PATCH | `/:catalogo/:id/desactivar` | `gestionar_catalogos` | Baja lógica. |
| PATCH | `/:catalogo/:id/reactivar` | `gestionar_catalogos` | Reactivación. |

**Implementación del service:** un mapa `CATALOGOS` que traduce el slug a
`{ tabla, columnaId, columnaNombre }`, p. ej.:
```js
const CATALOGOS = {
  "estados-tratamiento": { tabla: "estados_tratamiento", id: "id_estado",  nombre: "nombre_estado" },
  "medios-pago":         { tabla: "medios_pago",         id: "id_medio_pago", nombre: "nombre_medio" },
  "tipos-gasto":         { tabla: "tipos_gasto",         id: "id_tipo_gasto", nombre: "nombre_tipo" },
  "tipos-tratamiento":   { tabla: "tipos_tratamiento",   id: "id_tipo_tratamiento", nombre: "nombre" },
};
```
Validar que `:catalogo` exista en el mapa (404 `"Catálogo inexistente."`). El nombre de tabla
sale del mapa (no del request) → seguro contra inyección.

### Reglas de negocio

- `nombre` obligatorio, `trim`, 2–20 caracteres (los `NOMBRE_*` son `VARCHAR(20)`; en `tipos_tratamiento` es `VARCHAR(50)`), **único** case-insensitive entre los activos del mismo catálogo.
- `descripcion` opcional, máx 255.
- **No desactivar si está en uso por filas activas** de la tabla transaccional que lo referencia:
  - `estados_tratamiento` id → `tratamientos.ID_ESTADO` (cualquier tratamiento). 409.
  - `medios_pago` id → `pagos.ID_MEDIO_PAGO`. 409.
  - `tipos_gasto` id → `gastos.ID_TIPO_GASTO` (no anulados). 409.
  - `tipos_tratamiento` id → `tratamientos.ID_TIPO_TRATAMIENTO`. 409.
  Mensaje: `"No se puede desactivar: hay registros que usan este ítem."`
- **Los 4 estados de tratamiento base (pendiente, en proceso, finalizado, cancelado) no se pueden
  desactivar ni renombrar** — el motor de estados de `tratamientos` (ABM 03) depende de ellos por
  nombre/ID. Marcarlos como "protegidos" (por ID 1–4). Alta de estados nuevos: permitida.
- Reactivar: rechazar nombre duplicado activo (409).

## Frontend — `modules/catalogos/`

```
pages/PaginaCatalogos.jsx           → una página con pestañas (una por catálogo) o selector
components/TablaCatalogo.jsx         → tabla genérica (nombre, descripción, estado, acciones)
components/FormularioItemCatalogo.jsx → alta/edición en modal
services/catalogosService.js         → obtenerCatalogo(slug, params), crearItem(slug, datos), ...
styles/catalogos.css
```

- **Ubicación:** dentro de **Administración**. Ruta `/panel/administrador/catalogos`,
  `permisoRequerido="ver_catalogos"`. Agregar sub-ítem/pestaña "Catálogos" junto a Roles y Usuarios.
- Título en `obtenerTituloRutaActual`: "Catálogos".
- Botones "Nuevo" / "Editar" / "Desactivar" deshabilitados sin `gestionar_catalogos`.
- Ítems protegidos (estados base): mostrar con candado, sin acciones de baja/edición de nombre.

## Documento SprintLog

Generar `docs/abm/entregas/01-catalogos/sprintlog.md` según `_plantilla-documentacion.md`.
HU: alta de ítem, edición, baja lógica, consulta con filtro por catálogo y estado, permisos.
(No es transaccional → sin secciones de transiciones ni auditoría.)

## Checklist de aceptación

- [ ] `database/` creado (migraciones + `schema-actual.sql` + `README.md`).
- [ ] Los 3 catálogos sin `activo` ahora lo tienen; datos existentes quedan `activo = 1`.
- [ ] Alta valida obligatorio + longitud + unicidad por catálogo; errores por campo.
- [ ] Edición reflejada en el listado.
- [ ] Baja lógica bloqueada si el ítem está en uso (probar con los seeds: estado 2 lo usa el tratamiento 1).
- [ ] Estados base 1–4 protegidos (no se desactivan ni se renombran).
- [ ] Reactivación controla duplicados.
- [ ] Sin `ver_catalogos` → 403 API + pantalla sin permisos.
- [ ] Sin `gestionar_catalogos` → GET funciona, POST/PUT/PATCH devuelven 403.
- [ ] `sprintlog.md` generado.
- [ ] Tabla de prueba manual incluida.
