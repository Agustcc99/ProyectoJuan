# Conversación 1 — Base de datos

> Requiere: `docs/abm/00-contexto-base.md` + `docs/Consentimiento/00-contexto-y-arquitectura.md`.
> Entregable: 3 migraciones nuevas en `database/migrations/`, `database/README.md` actualizado,
> (opcional) `database/schema-actual.sql` regenerado. **Sin código de aplicación.**

---

## Objetivo

Dejar la base lista para el módulo: 4 tablas nuevas, el seed de las 3 plantillas de
consentimiento y los 3 permisos nuevos. Todo **aditivo y reejecutable**. Ninguna tabla
existente se altera (solo se crean FKs que apuntan a `consultorios`, `tratamientos`,
`pacientes`, `usuarios`).

---

## Antes de empezar

1. Verificá el estado real de la base con el snippet de `00-contexto-base.md` (§Base de datos).
2. Confirmá **el número de migración** disponible. Hoy la última es `010_permisos_gastos.sql`,
   así que lo esperable es `011`, `012`, `013`. Si hay migraciones nuevas, corré el número.
3. **Pedile al dueño los 3 textos legales** (título + cuerpo de cada plantilla) y los `codigo`
   que quiere. Sin eso, el seed queda con texto de relleno marcado como `TODO`.
4. Motor: **MariaDB 10.4**. Soporta `ADD COLUMN IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS`,
   **no** soporta `ADD CONSTRAINT IF NOT EXISTS ... FOREIGN KEY`. Como acá las tablas son
   **nuevas**, las FK van **inline en el `CREATE TABLE`** y no hace falta el guard de
   `information_schema` (ese patrón es solo para `ALTER TABLE ADD CONSTRAINT`).

---

## Archivos a crear

| NNN | Archivo | Qué hace |
|----:|---------|----------|
| 011 | `database/migrations/011_consentimientos.sql` | Crea `plantillas_consentimiento`, `consentimiento_sesiones`, `consentimientos`, `consentimientos_archivo`. |
| 012 | `database/migrations/012_seed_plantillas_consentimiento.sql` | `INSERT IGNORE` de las 3 plantillas para el consultorio 1. |
| 013 | `database/migrations/013_permisos_consentimientos.sql` | `INSERT IGNORE` de `ver_/generar_/anular_consentimientos` + asignación al rol administrador. |

---

## `011_consentimientos.sql`

Estructura completa en `00-contexto-y-arquitectura.md` §6. Puntos a respetar al escribir el SQL:

- Encabezado de comentario con el mismo estilo que `005_tratamientos.sql` / `009_gastos.sql`
  (qué hace, por qué es aditivo, qué motor).
- `CREATE TABLE IF NOT EXISTS` en las 4.
- `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci` (igual que el resto).
- Columnas de dominio **en minúsculas** (tablas nuevas).
- FKs **inline**, con nombres explícitos: `fk_<tabla>_<referencia>`.
- Índices:
  - `consentimiento_sesiones`: `UNIQUE KEY uq_sesiones_token (token_hash)`, `KEY idx_sesiones_tratamiento (id_tratamiento)`.
  - `consentimientos`: `KEY idx_consent_tratamiento (id_tratamiento)`, `KEY idx_consent_sesion (id_sesion)`.
  - `plantillas_consentimiento`: `UNIQUE KEY uq_plantilla_codigo (id_consultorio, codigo)`.
- `consentimientos_archivo.id_consentimiento` es **PK y FK a la vez** (relación 1:1).
- **Orden de creación** (por las FKs): `plantillas_consentimiento` → `consentimiento_sesiones`
  → `consentimientos` → `consentimientos_archivo`.

### Esquema de referencia (traducir a `CREATE TABLE`)

```
plantillas_consentimiento
  id_plantilla     INT AUTO_INCREMENT PK
  id_consultorio   INT NOT NULL            FK → consultorios(id_consultorio)
  codigo           VARCHAR(50)  NOT NULL
  titulo           VARCHAR(150) NOT NULL
  cuerpo           MEDIUMTEXT   NOT NULL
  version          INT NOT NULL DEFAULT 1
  activo           TINYINT(1) NOT NULL DEFAULT 1
  fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  UNIQUE (id_consultorio, codigo)

consentimiento_sesiones
  id_sesion            INT AUTO_INCREMENT PK
  id_consultorio       INT NOT NULL         FK → consultorios
  id_tratamiento       INT NOT NULL         FK → tratamientos(ID_TRATAMIENTO)
  id_paciente          INT NOT NULL         FK → pacientes(ID_PACIENTE)
  token_hash           CHAR(64) NOT NULL    UNIQUE
  token_expira         DATETIME NOT NULL
  estado               VARCHAR(20) NOT NULL DEFAULT 'pendiente'
  dni_confirmado       VARCHAR(20) NULL
  intentos_dni         TINYINT NOT NULL DEFAULT 0
  firmante_ip          VARCHAR(45) NULL
  firmante_user_agent  VARCHAR(255) NULL
  fecha_generacion     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  id_usuario_genera    INT NOT NULL         FK → usuarios(ID_USUARIO)
  fecha_identidad      DATETIME NULL
  fecha_completada     DATETIME NULL
  motivo_cancelacion   VARCHAR(255) NULL
  id_usuario_cancela   INT NULL             FK → usuarios(ID_USUARIO)
  fecha_cancelacion    DATETIME NULL
  KEY (id_tratamiento)

consentimientos
  id_consentimiento    INT AUTO_INCREMENT PK
  id_sesion            INT NOT NULL         FK → consentimiento_sesiones(id_sesion)
  id_consultorio       INT NOT NULL         FK → consultorios
  id_tratamiento       INT NOT NULL         FK → tratamientos(ID_TRATAMIENTO)
  id_paciente          INT NOT NULL         FK → pacientes(ID_PACIENTE)
  id_plantilla         INT NOT NULL         FK → plantillas_consentimiento(id_plantilla)
  codigo_plantilla     VARCHAR(50)  NOT NULL
  titulo_snapshot      VARCHAR(150) NOT NULL
  cuerpo_snapshot      MEDIUMTEXT   NOT NULL
  version_plantilla    INT NOT NULL
  orden                TINYINT NOT NULL
  estado               VARCHAR(20) NOT NULL DEFAULT 'pendiente_firma'
  fecha_firma          DATETIME NULL
  hash_documento       CHAR(64) NULL
  motivo_anulacion     VARCHAR(255) NULL
  id_usuario_anula     INT NULL             FK → usuarios(ID_USUARIO)
  fecha_anulacion      DATETIME NULL
  fecha_creacion       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  KEY (id_tratamiento), KEY (id_sesion)

consentimientos_archivo
  id_consentimiento  INT NOT NULL PK        FK → consentimientos(id_consentimiento)
  pdf                LONGBLOB NOT NULL
  firma_png          LONGBLOB NOT NULL
  pdf_bytes          INT NOT NULL
  fecha_generacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
```

> **Nota sobre `estado` como `VARCHAR` y no `ENUM`:** el proyecto ya usa `VARCHAR` + validación
> en el `service` para estados (ver `estados_tratamiento`, y `pagos.anulado` como TINYINT).
> Mantener el criterio: `VARCHAR(20)` + constantes en el service. No usar `ENUM`.

---

## `012_seed_plantillas_consentimiento.sql`

```sql
-- Seed de las 3 plantillas de consentimiento del consultorio Herrera (id_consultorio = 1).
-- INSERT IGNORE + UNIQUE (id_consultorio, codigo) hacen la migración reejecutable.
-- El texto de `cuerpo` lo provee el dueño del consultorio; párrafos separados por
-- una línea en blanco. Texto plano (sin HTML).

INSERT IGNORE INTO plantillas_consentimiento (id_consultorio, codigo, titulo, cuerpo, version, activo) VALUES
  (1, 'consentimiento_general',     '<TITULO 1>', '<CUERPO 1>', 1, 1),
  (1, 'consentimiento_endodoncia',  '<TITULO 2>', '<CUERPO 2>', 1, 1),
  (1, 'consentimiento_extraccion',  '<TITULO 3>', '<CUERPO 3>', 1, 1);
```

- Los `codigo` finales los define el dueño. Sugerencia: algo estable y legible
  (`consentimiento_general`, `consentimiento_endodoncia`, `consentimiento_extraccion`).
- Si el texto trae comillas simples, escaparlas (`''`).
- Si el dueño todavía no pasó los textos: dejar los placeholders `<CUERPO N>` y marcar la
  migración como **bloqueada** en el checklist; NO inventar contenido legal.

---

## `013_permisos_consentimientos.sql`

Copiar el patrón exacto de `006_permisos_tratamientos.sql` / `010_permisos_gastos.sql`:

```sql
INSERT IGNORE INTO permisos (codigo_permiso, nombre_permiso, descripcion, activo) VALUES
  ('ver_consentimientos',     'Ver consentimientos',     'Ver los consentimientos de un tratamiento y descargar los PDF.', 1),
  ('generar_consentimientos', 'Generar consentimientos', 'Crear una sesión de firma (QR) y cancelarla.',                    1),
  ('anular_consentimientos',  'Anular consentimientos',  'Baja lógica de un consentimiento firmado, con motivo.',           1);

INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
  SELECT 1, p.id_permiso
  FROM permisos p
  WHERE p.codigo_permiso IN ('ver_consentimientos', 'generar_consentimientos', 'anular_consentimientos');
```

> ¿Asignar alguno al rol **empleado** (`id_rol = 2`)? Por defecto **no** — igual que pagos/gastos,
> los permisos nuevos van solo al administrador y el dueño los reparte después desde la
> pantalla de roles. Confirmarlo antes de cerrar.

---

## `database/README.md`

Agregar 3 filas a la tabla de migraciones y 3 líneas a la lista de comandos `mysql -u root -p ...`,
con el mismo formato que las filas 001–010.

---

## `database/schema-actual.sql` (opcional)

Solo si se quiere actualizar la foto de referencia: correr el snippet de "Regenerar
`schema-actual.sql`" del `database/README.md` desde `backend/`. No es obligatorio para
que el módulo funcione.

---

## Prueba de la migración

Aplicar en orden sobre `odontologia_herrera` y verificar:

```sql
-- Las 4 tablas existen con la estructura esperada
SHOW CREATE TABLE plantillas_consentimiento;
SHOW CREATE TABLE consentimiento_sesiones;
SHOW CREATE TABLE consentimientos;
SHOW CREATE TABLE consentimientos_archivo;

-- Seed cargado
SELECT id_plantilla, codigo, titulo, activo FROM plantillas_consentimiento;   -- 3 filas activas

-- Permisos
SELECT codigo_permiso FROM permisos WHERE codigo_permiso LIKE '%consentimientos%';  -- 3 filas
SELECT p.codigo_permiso FROM roles_permisos rp
  JOIN permisos p ON p.id_permiso = rp.id_permiso
  WHERE rp.id_rol = 1 AND p.codigo_permiso LIKE '%consentimientos%';                 -- 3 filas

-- Reejecutable: correr las 3 migraciones de nuevo → 0 errores, 0 filas duplicadas
```

Verificar además que las FKs rechazan basura:

```sql
-- debe fallar: tratamiento inexistente
INSERT INTO consentimiento_sesiones
  (id_consultorio, id_tratamiento, id_paciente, token_hash, token_expira, id_usuario_genera)
  VALUES (1, 999999, 1, REPEAT('a',64), NOW() + INTERVAL 30 MINUTE, 1);
```

---

## Checklist de aceptación (Conversación 1)

- [ ] `011_consentimientos.sql`: 4 tablas creadas, `ENGINE=InnoDB`, `utf8mb4_general_ci`, FKs con nombre, índices declarados.
- [ ] Ninguna tabla existente alterada (solo FKs entrantes hacia `consultorios`/`tratamientos`/`pacientes`/`usuarios`).
- [ ] `012_seed_...`: 3 plantillas activas en el consultorio 1 con el texto **real** provisto por el dueño (o migración marcada como bloqueada si falta el texto).
- [ ] `013_permisos_...`: 3 permisos + asignación al rol administrador; decisión sobre rol empleado registrada.
- [ ] Las 3 migraciones son **reejecutables** (probado: segunda corrida = 0 errores, 0 duplicados).
- [ ] FKs verificadas: rechazan ids inexistentes.
- [ ] `database/README.md` actualizado (tabla + comandos).
- [ ] `schema-actual.sql` regenerado *(opcional)*.

---

## Qué queda para la Conversación 2

Con las tablas y el seed listos, la **Conversación 2** construye el módulo backend
autenticado (`modules/consentimientos/`): generar la sesión de firma + QR, listar por
tratamiento, servir el PDF, anular, cancelar. Ver [`02-backend-panel.md`](02-backend-panel.md).
