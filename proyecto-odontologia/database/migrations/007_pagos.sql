-- ============================================================================
-- 007_pagos.sql  ·  ABM 04 — Pagos (entidad transaccional)
-- ----------------------------------------------------------------------------
-- Migración ADITIVA. No hace DROP ni RENAME, no borra datos existentes.
--
-- 1) Multi-tenant: se agrega id_consultorio + FK a consultorios, alineando la
--    tabla con el aislamiento por consultorio del Sprint 2 (igual que pacientes
--    y tratamientos). Las filas existentes quedan en el consultorio 1.
-- 2) Baja lógica = anulación: anulado + motivo_anulacion + id_usuario_anula
--    (FK a usuarios) + fecha_anulacion. Un pago anulado deja de contar para el
--    saldo del tratamiento y para la caja. No hay "reactivar".
-- 3) fecha_creacion: momento en que se registró la fila (distinta de FECHA_PAGO,
--    que es la fecha contable del cobro y sí puede fijarla el usuario).
--
-- `ADD COLUMN IF NOT EXISTS` hace la parte de columnas reejecutable (MariaDB
-- 10.4). Para las claves foráneas, MariaDB 10.4 no acepta
-- `ADD CONSTRAINT IF NOT EXISTS` con `FOREIGN KEY`, así que se las agrega con un
-- guard contra information_schema (mismo patrón que 003_pacientes.sql /
-- 005_tratamientos.sql).
--
-- La tabla genérica `auditoria_cambios` ya existe (creada en 005_tratamientos):
-- este ABM la reutiliza con `entidad = 'pagos'`, no hay cambio de esquema ahí.
-- ============================================================================

-- ── 1) pagos.id_consultorio + FK ───────────────────────────────────────────

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS id_consultorio INT NOT NULL DEFAULT 1;

UPDATE pagos
   SET id_consultorio = 1
 WHERE id_consultorio IS NULL OR id_consultorio = 0;

ALTER TABLE pagos
  ALTER COLUMN id_consultorio DROP DEFAULT;

-- ── 2) pagos: baja lógica por anulación ────────────────────────────────────

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS anulado TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS motivo_anulacion VARCHAR(255) NULL;

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS id_usuario_anula INT NULL;

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS fecha_anulacion DATETIME NULL;

-- ── 3) pagos.fecha_creacion ───────────────────────────────────────────────

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── FK pagos.id_consultorio → consultorios.id_consultorio ──────────────────

SET @existe_fk_pagos_consultorio := (
  SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name = 'pagos'
     AND constraint_name = 'fk_pagos_consultorio'
);
SET @sql_fk_pagos_consultorio := IF(@existe_fk_pagos_consultorio > 0,
  'SELECT 1',
  'ALTER TABLE pagos ADD CONSTRAINT fk_pagos_consultorio FOREIGN KEY (id_consultorio) REFERENCES consultorios (id_consultorio)'
);
PREPARE stmt_fk_pagos_consultorio FROM @sql_fk_pagos_consultorio;
EXECUTE stmt_fk_pagos_consultorio;
DEALLOCATE PREPARE stmt_fk_pagos_consultorio;

-- ── FK pagos.id_usuario_anula → usuarios.ID_USUARIO ───────────────────────

SET @existe_fk_pagos_usuario_anula := (
  SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name = 'pagos'
     AND constraint_name = 'fk_pagos_usuario_anula'
);
SET @sql_fk_pagos_usuario_anula := IF(@existe_fk_pagos_usuario_anula > 0,
  'SELECT 1',
  'ALTER TABLE pagos ADD CONSTRAINT fk_pagos_usuario_anula FOREIGN KEY (id_usuario_anula) REFERENCES usuarios (ID_USUARIO)'
);
PREPARE stmt_fk_pagos_usuario_anula FROM @sql_fk_pagos_usuario_anula;
EXECUTE stmt_fk_pagos_usuario_anula;
DEALLOCATE PREPARE stmt_fk_pagos_usuario_anula;
