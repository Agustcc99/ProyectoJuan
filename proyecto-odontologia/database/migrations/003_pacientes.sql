-- ============================================================================
-- 003_pacientes.sql  ·  ABM 02 — Pacientes (entidad maestra)
-- ----------------------------------------------------------------------------
-- Migración ADITIVA. No hace DROP ni RENAME, no borra datos existentes.
--
-- 1) Multi-tenant: se agrega id_consultorio + FK a consultorios, alineando la
--    tabla con el aislamiento por consultorio del Sprint 2 (igual que usuarios
--    y roles). Las filas existentes quedan en el consultorio 1.
-- 2) Trazabilidad del alta: fecha_alta + id_usuario_alta (FK a usuarios), como
--    el resto del sistema, que estampa autor en cada INSERT.
-- 3) fecha_nacimiento: dato pedido en el documento de diseño original.
--
-- `ADD COLUMN IF NOT EXISTS` hace la parte de columnas reejecutable sin error
-- (MariaDB 10.4, el motor de esta base). Para las claves foráneas, MariaDB 10.4
-- todavía no acepta `ADD CONSTRAINT IF NOT EXISTS` con `FOREIGN KEY`, así que se
-- las agrega con un guard contra information_schema para que la migración siga
-- siendo reejecutable.
--
-- DNI: hoy es NULL y sin unicidad. La política elegida es "DNI obligatorio y
-- único por consultorio (case/space-insensitive)", validada por APLICACIÓN en
-- pacientes.service.js. NO se agrega UNIQUE(DNI) a nivel motor porque la
-- unicidad es por consultorio, no global, y una UNIQUE global rompería el
-- escenario multi-consultorio.
-- ============================================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS id_consultorio INT NOT NULL DEFAULT 1;

UPDATE pacientes
   SET id_consultorio = 1
 WHERE id_consultorio IS NULL OR id_consultorio = 0;

ALTER TABLE pacientes
  ALTER COLUMN id_consultorio DROP DEFAULT;

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS fecha_alta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS id_usuario_alta INT NULL;

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE NULL;

SET @existe_fk_consultorio := (
  SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name = 'pacientes'
     AND constraint_name = 'fk_pacientes_consultorio'
);
SET @sql_fk_consultorio := IF(@existe_fk_consultorio > 0,
  'SELECT 1',
  'ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_consultorio FOREIGN KEY (id_consultorio) REFERENCES consultorios (id_consultorio)'
);
PREPARE stmt_fk_consultorio FROM @sql_fk_consultorio;
EXECUTE stmt_fk_consultorio;
DEALLOCATE PREPARE stmt_fk_consultorio;

SET @existe_fk_usuario := (
  SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name = 'pacientes'
     AND constraint_name = 'fk_pacientes_usuario'
);
SET @sql_fk_usuario := IF(@existe_fk_usuario > 0,
  'SELECT 1',
  'ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_usuario FOREIGN KEY (id_usuario_alta) REFERENCES usuarios (ID_USUARIO)'
);
PREPARE stmt_fk_usuario FROM @sql_fk_usuario;
EXECUTE stmt_fk_usuario;
DEALLOCATE PREPARE stmt_fk_usuario;
