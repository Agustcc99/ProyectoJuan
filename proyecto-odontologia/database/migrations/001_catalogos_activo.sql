-- ============================================================================
-- 001_catalogos_activo.sql  ·  ABM 01 — Catálogos de soporte
-- ----------------------------------------------------------------------------
-- Migración ADITIVA. No hace DROP ni RENAME, no toca datos existentes.
--
-- estados_tratamiento, medios_pago y tipos_gasto no tenían baja lógica:
-- se les agrega `activo` (las filas existentes quedan activas por el DEFAULT).
-- Además se agrega `descripcion` a esos tres para poder documentar cada ítem
-- desde la UI (tipos_tratamiento ya tiene NOMBRE, DESCRIPCION y ACTIVO).
--
-- `ADD COLUMN IF NOT EXISTS` hace la migración reejecutable sin error
-- (soportado por MariaDB 10.x, el motor de esta base).
-- ============================================================================

ALTER TABLE estados_tratamiento
  ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE estados_tratamiento
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255) NULL;

ALTER TABLE medios_pago
  ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE medios_pago
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255) NULL;

ALTER TABLE tipos_gasto
  ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE tipos_gasto
  ADD COLUMN IF NOT EXISTS descripcion VARCHAR(255) NULL;

-- tipos_tratamiento: sin cambios (ya tiene ACTIVO y DESCRIPCION).
