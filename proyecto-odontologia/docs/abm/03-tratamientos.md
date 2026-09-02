# ABM 03 — `tratamientos` (Transaccional)

> Requiere: `00-contexto-base.md` + `_plantilla-documentacion.md` + ABM 01 y 02 completados.
> **Entidad transaccional de referencia:** documentación completa según
> `PP - Material ABM Transaccional.pdf`. Crea la tabla `auditoria_cambios`.

## Objetivo

ABM del tratamiento: el evento de negocio núcleo. Pertenece a un paciente, es de un tipo,
tiene un precio pactado, atraviesa un **ciclo de estados** y contra él se registran pagos
(ABM 04) y gastos (ABM 05).

## Estado real de la tabla

```
tratamientos: ID_TRATAMIENTO, ID_PACIENTE(FK), ID_TIPO_TRATAMIENTO(FK), DESCRIPCION(text),
              PRECIO_PACIENTE(decimal 10,2), ID_ESTADO(FK estados_tratamiento),
              FECHA_INICIO(date, NULL), FECHA_FIN(date, NULL), OBSERVACIONES(text),
              ID_USUARIO(FK), FECHA_CREACION(datetime)
```
No tiene: `activo`, `id_consultorio`, `fecha_actualizacion`, `motivo_cancelacion`.
**Baja lógica = pasar al estado `cancelado` (ID_ESTADO = 4).** No se agrega columna `activo`.

## Clasificación y dependencias

- **Tipo:** Transaccional. **Depende de:** `pacientes` (N—1), `tipos_tratamiento` (N—1),
  `estados_tratamiento` (N—1), `usuarios` (N—1). **Referido por:** `pagos` (1—N), `gastos` (1—N, nullable).

## Migración SQL — `database/migrations/005_tratamientos.sql`

```sql
-- Multi-tenant (planificado en com.docx / Sprint 4).
ALTER TABLE tratamientos ADD COLUMN id_consultorio INT NOT NULL DEFAULT 1;
UPDATE tratamientos SET id_consultorio = 1;
ALTER TABLE tratamientos ALTER COLUMN id_consultorio DROP DEFAULT;
ALTER TABLE tratamientos ADD CONSTRAINT fk_trat_consultorio
  FOREIGN KEY (id_consultorio) REFERENCES consultorios(id_consultorio);

ALTER TABLE tratamientos ADD COLUMN fecha_actualizacion DATETIME NOT NULL
  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE tratamientos ADD COLUMN motivo_cancelacion VARCHAR(255) NULL;

-- Tabla de auditoría genérica (la usan tratamientos, pagos y gastos)
CREATE TABLE IF NOT EXISTS auditoria_cambios (
  id_auditoria   INT AUTO_INCREMENT PRIMARY KEY,
  entidad        VARCHAR(40)  NOT NULL,   -- 'tratamientos','pagos','gastos'
  id_entidad     INT          NOT NULL,
  id_usuario     INT          NOT NULL,   -- actor
  accion         VARCHAR(20)  NOT NULL,   -- 'alta','modificacion','cambio_estado','anulacion','reactivacion'
  campo          VARCHAR(60)  NULL,
  valor_anterior VARCHAR(255) NULL,
  valor_nuevo    VARCHAR(255) NULL,
  motivo         VARCHAR(255) NULL,
  fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_entidad (entidad, id_entidad),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(ID_USUARIO)
);
```

## Permisos — `database/migrations/006_permisos_tratamientos.sql`

`ver_tratamientos`, `crear_tratamientos`, `editar_tratamientos` ya existen. Agregar:

```sql
INSERT INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('cambiar_estado_tratamientos', 'Cambiar estado de tratamiento', 'Avanzar el tratamiento en su flujo', 1),
  ('cancelar_tratamientos',       'Cancelar tratamientos',         'Pasar un tratamiento a Cancelado',    1);
INSERT INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, id_permiso FROM permisos WHERE codigo_permiso IN ('cambiar_estado_tratamientos','cancelar_tratamientos');
```

## Reglas de negocio (traducción del PDF al dominio)

### Campos obligatorios en el alta
`ID_PACIENTE`, `ID_TIPO_TRATAMIENTO`, `PRECIO_PACIENTE` (≥ 0). Estado inicial automático = `1 pendiente`.
El paciente y el tipo deben existir y estar `activo = 1`.

### Ciclo de estados (transiciones válidas)

```
pendiente ──▶ en proceso ──▶ finalizado
    │              │
    └──────────────┴──▶ cancelado
```

- **Permitidas:** `pendiente→en proceso`, `en proceso→finalizado`, `pendiente→cancelado`, `en proceso→cancelado`.
- **Prohibidas:** todo lo demás. En particular `pendiente→finalizado` directo (`"Debe iniciarse antes de finalizar."`); salir de `finalizado` o `cancelado` (estados finales).
- Pasar a **finalizado**: si `FECHA_FIN` está vacía, setear hoy.
- Pasar a **cancelado**: `motivo_cancelacion` obligatorio (mín 5 caracteres) + permiso `cancelar_tratamientos`.
- Endpoint dedicado: `PATCH /:id/estado` con `{ id_estado, motivo? }`. Valida contra la matriz.

### Campos editables según estado
- **pendiente:** todos.
- **en proceso:** `DESCRIPCION`, `PRECIO_PACIENTE`, `FECHA_FIN`, `OBSERVACIONES`. No cambiar paciente ni tipo.
- **finalizado / cancelado:** solo `OBSERVACIONES`. Resto → 409 `"Tratamiento <estado>, no editable."`.
- `ID_TRATAMIENTO` nunca editable.

### Auditoría
- Alta, modificación, cambio de estado → fila en `auditoria_cambios` (`entidad='tratamientos'`,
  `id_usuario = req.usuario.id_usuario`, `campo`/`valor_anterior`/`valor_nuevo` en modificaciones,
  `motivo` en cambio de estado). Dentro de la misma transacción que el cambio.

## Backend — `modules/tratamientos/` (`/api/tratamientos`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/` | `ver_tratamientos` | Lista + filtros: `?id_paciente=`, `?id_estado=`, `?id_tipo=`, `?busqueda=` (descripción/paciente), `?desde=&hasta=` (FECHA_INICIO), `?orden=fecha_desc\|fecha_asc\|actualizacion_desc`, paginación. JOIN a paciente/tipo/estado (nombres resueltos) + `saldo` = `PRECIO_PACIENTE − Σ pagos`. |
| GET | `/:id` | `ver_tratamientos` | Detalle + historial de `auditoria_cambios` + lista de pagos + lista de gastos imputados. |
| POST | `/` | `crear_tratamientos` | Alta. Estampa `ID_USUARIO = req.usuario.id_usuario`. |
| PUT | `/:id` | `editar_tratamientos` | Modificación (editables según estado). |
| PATCH | `/:id/estado` | `cambiar_estado_tratamientos` (+ `cancelar_tratamientos` si destino = cancelado) | Transición. |

> **No hay `desactivar`/`reactivar`**: la baja es el estado `cancelado`.
> Si el negocio necesita "borrar un tratamiento cargado por error", tratarlo como cancelación con motivo.

**Todas las queries filtran por `id_consultorio = req.usuario.id_consultorio`.** El alta lo estampa
junto con `id_usuario`. Validar que `id_paciente` pertenezca al consultorio y que
`id_paciente` / `id_tipo` / `id_estado` existan y estén activos antes de usarlos.

## Frontend — `modules/tratamientos/`

```
pages/PaginaTratamientos.jsx        → listado global con filtros (estado, tipo, paciente, fechas) + orden + paginación
pages/DetalleTratamientoPage.jsx    → detalle + timeline de estados + historial de auditoría + pagos + gastos + acciones
components/FormularioTratamiento.jsx → alta/edición (campos habilitados según estado)
components/CambiarEstadoModal.jsx    → estado destino (solo transiciones válidas) + motivo si cancelar
services/tratamientosService.js
styles/tratamientos.css
```

- **Menú:** "Tratamientos" ya existe (`ver_tratamientos`). En `AppRouter.jsx` quitar el `<Proximamente>` y enchufar `PaginaTratamientos`. Títulos en `obtenerTituloRutaActual`.
- **Integración con pacientes (ABM 02):** en `FichaPacientePage.jsx`, la sección "Tratamientos del paciente" lista los del paciente (`?id_paciente=`) con botón "Nuevo tratamiento" (paciente prefijado).
- Rutas:
  ```jsx
  <Route path="tratamientos" element={<RutaPorPermiso permisoRequerido="ver_tratamientos"><PaginaTratamientos/></RutaPorPermiso>} />
  <Route path="tratamientos/:id" element={<RutaPorPermiso permisoRequerido="ver_tratamientos"><DetalleTratamientoPage/></RutaPorPermiso>} />
  ```
- Detalle: badge de estado con color, botones de transición **solo** para estados alcanzables,
  timeline del historial (`"Precio: 50000 → 60000 por claude@... el 2026-05-02 14:32"`), saldo pendiente,
  campos deshabilitados con leyenda cuando el estado no permite editar.

## Documento SprintLog — `docs/abm/entregas/03-tratamientos/`

Además de `sprintlog.md`, por ser transaccional generar las secciones del PDF (pueden ir en el mismo
archivo o separadas):
1. **Sprint Backlog** (tabla HU01–HU07: alta, modificación, baja lógica/cancelación, consulta/filtros, detalle+historial, transiciones de estado, permisos+auditoría).
2. **Reglas de negocio** (matriz de transiciones, campos editables por estado, auditoría actor/fecha/campo viejo→nuevo/motivo).
3. **Historias de usuario** (formato Scrum).
4. **Criterios de aceptación** (Dado/Cuando/Entonces, positivo + bloqueo).
5. **Prototipos/mockups** por pantalla en `mockups/`.
6. **Subtareas técnicas TSHIRT**.
7. **Pruebas de criterios** (Datos / Pasos / Resultado esperado + evidencia).

## Checklist de aceptación

- [ ] Migraciones aplicadas; el tratamiento existente (ID 1, "en proceso") conserva datos.
- [ ] Alta: obligatorios validados, estado inicial `pendiente` automático, aparece con ID visible.
- [ ] Modificación permitida se refleja en detalle y listado; campo no editable → bloqueado con mensaje.
- [ ] Transición válida (`en proceso → finalizado`) OK; inválida (`pendiente → finalizado`) → "Debe iniciarse antes de finalizar".
- [ ] Cancelar exige motivo y permiso `cancelar_tratamientos`; sale de la bandeja de pendientes.
- [ ] Tratamiento finalizado/cancelado: UI deshabilita campos, muestra "Tratamiento \<estado\>, no editable".
- [ ] Consulta: filtro por estado + búsqueda de texto + orden por última actualización; sin resultados → "Sin resultados".
- [ ] Detalle muestra historial de cambios (campo, valor anterior, nuevo, fecha, actor).
- [ ] Usuario sin `editar_tratamientos` ve el detalle pero no edita; edición válida de otro usuario queda en auditoría.
- [ ] `auditoria_cambios` creada y poblándose.
- [ ] Documentación completa en `docs/abm/entregas/03-tratamientos/`.
- [ ] Tabla de prueba manual de la API.
