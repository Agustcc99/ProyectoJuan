# `database/` — Esquema y migraciones

Sistema **Odontología Herrera**. Base MySQL/MariaDB `odontologia_herrera`.

La base **ya existe y tiene datos reales**. Este directorio no recrea la base: la
versiona de forma **incremental y aditiva**.

```
database/
  schema-actual.sql     Dump de referencia (SOLO LECTURA) del esquema previo a las migraciones.
  migrations/            Cambios de esquema numerados. Se aplican en orden, una sola vez cada uno.
  README.md             Este archivo.
```

## Regla de oro

- **Nunca** `CREATE TABLE` sobre una tabla existente, **nunca** `DROP`, **nunca**
  renombrar columnas.
- Todo cambio de esquema es un `ALTER TABLE ... ADD COLUMN ...` (o una tabla
  nueva) dentro de un archivo `migrations/NNN_descripcion.sql`.
- `NNN` es incremental con ceros a la izquierda: `001`, `002`, `003`…
- Cada migración se escribe para poder reejecutarse sin romper
  (`ADD COLUMN IF NOT EXISTS`, `INSERT IGNORE`, etc.).

## `schema-actual.sql`

Foto del esquema (`SHOW CREATE TABLE` de las 13 tablas) **antes** de la primera
migración. Sirve como referencia para leer el modelo; **no se ejecuta** en un
entorno con datos. El esquema vigente es:

```
schema-actual.sql  +  migrations/001…  +  migrations/002…  +  …  (en orden)
```

## Aplicar las migraciones

Desde este directorio, en orden:

```bash
mysql -u root -p odontologia_herrera < migrations/001_catalogos_activo.sql
mysql -u root -p odontologia_herrera < migrations/002_permisos_catalogos.sql
mysql -u root -p odontologia_herrera < migrations/003_pacientes.sql
mysql -u root -p odontologia_herrera < migrations/004_permisos_pacientes.sql
mysql -u root -p odontologia_herrera < migrations/005_tratamientos.sql
mysql -u root -p odontologia_herrera < migrations/006_permisos_tratamientos.sql
mysql -u root -p odontologia_herrera < migrations/007_pagos.sql
mysql -u root -p odontologia_herrera < migrations/008_permisos_pagos.sql
mysql -u root -p odontologia_herrera < migrations/009_gastos.sql
mysql -u root -p odontologia_herrera < migrations/010_permisos_gastos.sql
```

(o pegar el contenido en el cliente SQL habitual — phpMyAdmin, DBeaver, etc.).

## Migraciones

| NNN | Archivo | ABM | Qué hace |
|----:|---------|-----|----------|
| 001 | `001_catalogos_activo.sql`   | 01 catálogos | Agrega `activo` y `descripcion` a `estados_tratamiento`, `medios_pago` y `tipos_gasto`. |
| 002 | `002_permisos_catalogos.sql` | 01 catálogos | Alta de los permisos `ver_catalogos` y `gestionar_catalogos` y asignación al rol administrador. |
| 003 | `003_pacientes.sql`          | 02 pacientes | Agrega `id_consultorio` (+ FK), `fecha_alta`, `id_usuario_alta` (+ FK) y `fecha_nacimiento` a `pacientes`. |
| 004 | `004_permisos_pacientes.sql` | 02 pacientes | Alta de los permisos `desactivar_pacientes` y `reactivar_pacientes` y asignación al rol administrador. |
| 005 | `005_tratamientos.sql`       | 03 tratamientos | Agrega `id_consultorio` (+ FK), `fecha_actualizacion` y `motivo_cancelacion` a `tratamientos`; crea la tabla genérica `auditoria_cambios`. |
| 006 | `006_permisos_tratamientos.sql` | 03 tratamientos | Alta de los permisos `cambiar_estado_tratamientos` y `cancelar_tratamientos` y asignación al rol administrador. |
| 007 | `007_pagos.sql`              | 04 pagos | Agrega `id_consultorio` (+ FK), `anulado`, `motivo_anulacion`, `id_usuario_anula` (+ FK), `fecha_anulacion` y `fecha_creacion` a `pagos`. Reutiliza `auditoria_cambios` (`entidad='pagos'`). |
| 008 | `008_permisos_pagos.sql`     | 04 pagos | Alta de los permisos `ver_pagos`, `editar_pagos` y `anular_pagos` y asignación al rol administrador. |
| 009 | `009_gastos.sql`             | 05 gastos | Agrega `id_consultorio` (+ FK), `anulado`, `motivo_anulacion`, `id_usuario_anula` (+ FK), `fecha_anulacion` y `fecha_creacion` a `gastos`. Reutiliza `auditoria_cambios` (`entidad='gastos'`). |
| 010 | `010_permisos_gastos.sql`    | 05 gastos | Alta de los permisos `ver_gastos`, `editar_gastos` y `anular_gastos` y asignación al rol administrador. |

## Regenerar `schema-actual.sql`

Solo si se necesita actualizar la foto de referencia, desde `backend/`:

```bash
node -e "require('dotenv').config();const m=require('mysql2/promise');(async()=>{const c=await m.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});const[t]=await c.query('SHOW TABLES');let o='';for(const r of t){const n=Object.values(r)[0];const[x]=await c.query('SHOW CREATE TABLE \`'+n+'\`');o+=x[0]['Create Table']+';\n\n'}require('fs').writeFileSync('../database/schema-actual.sql',o);await c.end()})()"
```
