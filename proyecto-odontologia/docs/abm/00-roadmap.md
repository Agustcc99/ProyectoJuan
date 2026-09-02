# Roadmap de ABMs — Odontología Herrera

> Documento de planificación. No contiene código funcional.
> Para desarrollar cada ABM: abrir una conversación nueva y decir
> "leé `docs/abm/00-contexto-base.md` y desarrollá `docs/abm/0X-<entidad>.md`".

---

## 1. Análisis del código y de la BASE DE DATOS REAL

**Base:** `odontologia_herrera` (MySQL). **Verificada en vivo** — todas las tablas ya existen
y tienen datos de prueba. Este roadmap trabaja sobre lo que hay, NO desde cero.

### Tablas existentes (13)

| Tabla | Estado ABM | Columnas relevantes (tal cual están en la BD) |
|---|---|---|
| `consultorios` | — (1 fila: Herrera) | `id_consultorio, nombre, slug, logo, color_principal, color_secundario, activo` |
| `usuarios` | Parcial ✅ | `ID_USUARIO, NOMBRE, APELLIDO, EMAIL, CONTRASENA_HASH, ID_ROL, id_consultorio, ACTIVO, FECHA_CREACION, token_recuperacion_*` |
| `roles` | Completo ✅ | `ID_ROL, NOMBRE_ROL, descripcion, activo, id_consultorio` |
| `permisos` | Catálogo (solo listar) ✅ | `id_permiso, codigo_permiso, nombre_permiso, descripcion, activo` — **17 permisos ya sembrados** |
| `roles_permisos` | Dentro de roles ✅ | `id_rol, id_permiso, fecha_asignacion` |
| `pacientes` | **Sin ABM** (1 fila) | `ID_PACIENTE, NOMBRE, APELLIDO, DNI, TELEFONO, EMAIL, OBRA_SOCIAL, OBSERVACIONES, ACTIVO` |
| `estados_tratamiento` | **Sin ABM** (4 filas) | `ID_ESTADO, NOMBRE_ESTADO` — sin `activo` |
| `medios_pago` | **Sin ABM** (4 filas) | `ID_MEDIO_PAGO, NOMBRE_MEDIO` — sin `activo` |
| `tipos_gasto` | **Sin ABM** (5 filas) | `ID_TIPO_GASTO, NOMBRE_TIPO` — sin `activo` |
| `tipos_tratamiento` | **Sin ABM** (5 filas) | `ID_TIPO_TRATAMIENTO, NOMBRE, DESCRIPCION, ACTIVO` |
| `tratamientos` | **Sin ABM** (1 fila) | `ID_TRATAMIENTO, ID_PACIENTE, ID_TIPO_TRATAMIENTO, DESCRIPCION, PRECIO_PACIENTE, ID_ESTADO, FECHA_INICIO, FECHA_FIN, OBSERVACIONES, ID_USUARIO, FECHA_CREACION` |
| `pagos` | **Sin ABM** (1 fila) | `ID_PAGO, ID_TRATAMIENTO (NOT NULL), MONTO, ID_MEDIO_PAGO, FECHA_PAGO, NOTAS, ID_USUARIO` |
| `gastos` | **Sin ABM** (2 filas) | `ID_GASTO, ID_TRATAMIENTO (NULLABLE), ID_TIPO_GASTO, MONTO, DESCRIPCION, FECHA_GASTO, ID_USUARIO` |

### Datos ya cargados (seeds reales — usarlos, no reinventarlos)

- **estados_tratamiento:** `1 pendiente`, `2 en proceso`, `3 finalizado`, `4 cancelado`
- **medios_pago:** `1 efectivo`, `2 transferencia`, `3 tarjeta`, `4 obra social`
- **tipos_gasto:** `1 insumo`, `2 laboratorio`, `3 protesis`, `4 servicio externo`, `5 otro`
- **tipos_tratamiento:** `1 limpieza`, `2 endodoncia`, `3 perno y corona`, `4 extraccion`, `5 ortodoncia`
- **roles:** `1 administrador` (17 permisos), `2 empleado` (8 permisos), + roles de prueba

### Permisos YA sembrados (17) — reutilizarlos

```
ver_roles, crear_roles, editar_roles, desactivar_roles, reactivar_roles, asignar_permisos,
ver_usuarios, asignar_roles_usuarios,
ver_pacientes, crear_pacientes, editar_pacientes,
ver_tratamientos, crear_tratamientos, editar_tratamientos,
registrar_pagos, registrar_gastos, ver_reportes
```

**Ojo con la nomenclatura ya establecida:** el par de baja/alta lógica es `desactivar_X` + `reactivar_X`
(no `eliminar_X`), y el alta de movimientos es `registrar_pagos` / `registrar_gastos` (no `crear_pagos`).

### Hallazgos que corrigen el plan anterior

1. **NO hay que crear tablas.** Todas existen. Cada ABM entrega **`ALTER TABLE ... ADD COLUMN`**
   (aditivo, idempotente con `IF NOT EXISTS` donde el motor lo permita, o guardado en
   `database/migrations/NNN_*.sql`). Única tabla nueva: `auditoria_cambios` (ABM 03).
2. **Multi-tenant: se agrega `id_consultorio` a las entidades de negocio.**
   Hoy las tablas de negocio (`pacientes`, `tratamientos`, `pagos`, `gastos`) y los catálogos
   **no tienen `id_consultorio`**; solo `usuarios` y `roles` lo tienen (y todo es consultorio 1).
   El documento del proyecto (`com.docx`, Sprint 4) **planifica explícitamente** agregar
   `id_consultorio` + FK a `tratamientos` ("alinea la tabla con el aislamiento multiconsultorio
   del Sprint 2") y lo pone como criterio de aceptación ("aislamiento por consultorio").
   → **Decisión: cada ABM de negocio agrega `id_consultorio INT NOT NULL` + FK a su tabla**
   (backfill = 1 para las filas existentes) y **filtra todas sus queries por
   `req.usuario.id_consultorio`**, igual que `roles`/`usuarios`. Los **catálogos siguen globales**
   (el material los define como listas compartidas entre módulos).
3. **Nombres de columna en MAYÚSCULAS** en las tablas de dominio (`ID_PACIENTE`, `NOMBRE`, `DNI`, `ACTIVO`…).
   MySQL trata los nombres de columna como case-insensitive, así que el código de los `service`
   sigue escribiéndose en minúsculas (igual que `auth.service.js` hoy). No renombrar columnas.
4. **Nombres de tabla irregulares:** `estados_tratamiento` (singular), `medios_pago`, `tipos_gasto`,
   `tipos_tratamiento`. Usarlos tal cual.
5. **Baja lógica que falta:** `estados_tratamiento`, `medios_pago`, `tipos_gasto` no tienen `activo`
   → hay que agregarlo. `pacientes` y `tipos_tratamiento` ya lo tienen. En `tratamientos` la "baja"
   es el estado `cancelado` (no hace falta columna). En `pagos`/`gastos` hay que agregar `ANULADO`.
6. **No hay `schema.sql` ni `auditoria_cambios`.** El primer ABM crea `database/` con
   `schema-actual.sql` (dump de referencia) + carpeta `migrations/`.
7. El módulo `backend/src/modules/catalogos/` ya está scaffolded (vacío) → confirma agrupar
   los 4 catálogos en un solo ABM.

---

## 2. Decisiones de arquitectura (para este roadmap)

| # | Decisión |
|---|---|
| 1 | **Multi-tenant** en entidades de negocio: cada ABM agrega `id_consultorio INT NOT NULL` + FK y filtra por `req.usuario.id_consultorio`. Catálogos globales. |
| 2 | **Migraciones aditivas** en `database/migrations/NNN_descripcion.sql`. Nunca `DROP`/`CREATE` sobre tablas existentes (excepto tablas nuevas como `auditoria_cambios`). |
| 3 | **No renombrar** tablas ni columnas existentes. SQL en los `service` en minúsculas (case-insensitive). |
| 4 | Baja lógica con `activo`/`anulado`. En `tratamientos`, baja = estado `cancelado`. |
| 5 | **Auditoría** solo en las 3 transaccionales, vía tabla genérica `auditoria_cambios` (creada en ABM 03). |
| 6 | Reutilizar los 17 permisos existentes; agregar los que falten respetando la nomenclatura (`desactivar_X`/`reactivar_X`, `registrar_X`). |
| 7 | **Cada ABM genera además un documento `.docx`** (SprintLog) que replica el formato de `com.docx` — ver `docs/abm/_plantilla-documentacion.md`. |

---

## 3. Clasificación de entidades

### 🟦 Soporte (catálogos — 2 columnas, bajo volumen, parametrizan el dominio)
`estados_tratamiento` · `medios_pago` · `tipos_gasto` · `tipos_tratamiento`
→ **un solo ABM** ("catálogos"), reusando el módulo `catalogos/` ya scaffolded.

### 🟨 Maestras (ficha con ciclo de vida propio, citada por las transacciones)
`pacientes` · (`usuarios` parcial ✅ · `roles` ✅)

### 🟥 Transaccionales (eventos del negocio — volumen, ciclo de estados, auditoría)
`tratamientos` · `pagos` · `gastos`

### ⚪ Sin ABM propio
`roles_permisos` (dentro de roles ✅) · `auditoria_cambios` (la escriben las transaccionales) ·
`permisos` y `consultorios` (seed / fuera de alcance)

---

## 4. Orden de desarrollo y justificación

| # | ABM | Tipo | Justificación (orden + relaciones clave) |
|---|---|---|---|
| **01** | **`catalogos`** (estados_tratamiento, medios_pago, tipos_gasto, tipos_tratamiento) | Soporte | Van primero: son las listas que referencian todas las transaccionales (`tratamientos.ID_ESTADO`, `tratamientos.ID_TIPO_TRATAMIENTO`, `pagos.ID_MEDIO_PAGO`, `gastos.ID_TIPO_GASTO`). Sin `activo` en 3 de las 4 → este ABM agrega la columna. Crea `database/` y el módulo `catalogos`. |
| **02** | **`pacientes`** | Maestra | Maestro central y foco de la navegación (la ficha concentra tratamientos → pagos → gastos). `tratamientos.ID_PACIENTE` depende de él. Ya tiene `ACTIVO`, ruta `/panel/pacientes` y permisos `ver/crear/editar_pacientes` sembrados; falta el par `desactivar/reactivar` y toda la implementación. 1—N con `tratamientos`. |
| **03** | **`tratamientos`** | Transaccional | Evento núcleo. No arranca hasta tener 01 y 02: referencia `pacientes` + `tipos_tratamiento` + `estados_tratamiento` + `usuarios`. Tiene ciclo de estados (`pendiente→en proceso→finalizado`/`cancelado`) y auditoría → sigue la plantilla completa del PDF. Crea `auditoria_cambios`. 1—N con `pagos` y `gastos`. |
| **04** | **`pagos`** | Transaccional | Se registra **contra un tratamiento existente** (`pagos.ID_TRATAMIENTO` NOT NULL) → después de 03. Σ pagos vigentes vs. `PRECIO_PACIENTE` = saldo. N—1 con `tratamientos`, `medios_pago`, `usuarios`. Alta ya tiene permiso (`registrar_pagos`); falta `ver_pagos`, `anular_pagos` y la columna `ANULADO`. |
| **05** | **`gastos`** | Transaccional | Último: `gastos.ID_TRATAMIENTO` es **NULLABLE** (gasto general vs. imputado) → necesita `tratamientos` pero no lo bloquea. N—1 con `tipos_gasto`, `usuarios`; N—1 opcional con `tratamientos`. Alta ya tiene permiso (`registrar_gastos`); falta `ver_gastos`, `editar_gastos`, `anular_gastos`, columna `ANULADO`. |
| **06** | **`reportes`** | Solo lectura (no ABM) | Agrega ingresos (`pagos`), egresos (`gastos`), pendientes por tratamiento, resumen mensual. Al final: necesita datos reales de 03–05. Permiso `ver_reportes` ya sembrado. |

---

## 5. Resumen del orden

```
01. catalogos     (Soporte)        + crea database/, agrega `activo` a 3 catálogos
02. pacientes     (Maestra)        + id_consultorio + FK, permisos desactivar/reactivar
03. tratamientos  (Transaccional)  + id_consultorio + auditoria_cambios + doc completa
04. pagos         (Transaccional)  + id_consultorio + columna anulado
05. gastos        (Transaccional)  + id_consultorio + columna anulado
06. reportes      (solo lectura)
```

Cada ABM entrega también su documento `.docx` SprintLog (ver `_plantilla-documentacion.md`).

### Numeración de Historias de Usuario (continua con el proyecto)

`com.docx` ya usa: Sprint 1 = HU1–HU6 · Sprint 2 = HU7–HU12 · Sprint 3 = HT1–HT9 ·
**Sprint 4 = HU13–HU16 (Tratamientos, ya documentado)**.

Como Tratamientos ya está documentado como Sprint 4, el orden de *sprints documentales* que
propongo (el usuario confirma antes de generar cada `.docx`):

| ABM | Sprint doc | HU |
|---|---|---|
| catalogos | Sprint 3.1 (o el que elija el usuario) | HU (continúa) |
| pacientes | Sprint 3.2 | HU… |
| tratamientos | **Sprint 4** (ya existe, se completa) | HU13–HU16 |
| pagos | Sprint 4.1 (ya anticipado en `com.docx`) | HU17… |
| gastos | Sprint 4.2 | HU… |
| reportes | Sprint 5 | HU… |

---

## 6. Cómo usar este roadmap

1. Abrir conversación nueva de Claude Code sobre este repo.
2. Decir: **"Leé `docs/abm/00-contexto-base.md` y `docs/abm/_plantilla-documentacion.md`. Después desarrollá `docs/abm/02-pacientes.md`."**
3. Claude muestra el plan (archivos, migración SQL, endpoints, permisos, estructura del documento) → dar OK.
4. Backend → Frontend → Documento SprintLog → checklist de aceptación.
5. Marcar la entidad como ✅ en la tabla de la sección 1.
6. Respetar el orden: 01 → 02 → 03 → 04 → 05 → 06.
