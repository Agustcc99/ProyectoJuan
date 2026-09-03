-- ============================================================================
-- 005_tratamientos.sql  ·  ABM 03 — Tratamientos (entidad transaccional)
-- ----------------------------------------------------------------------------
-- Migración ADITIVA. No hace DROP ni RENAME, no borra datos existentes.
--
-- 1) Multi-tenant: se agrega id_consultorio + FK a consultorios, alineando la
--    tabla con el aislamiento por consultorio del Sprint 2 (igual que pacientes,
--    usuarios y roles). Las filas existentes quedan en el consultorio 1.
-- 2) fecha_actualizacion: timestamp que se refresca en cada UPDATE, para poder
--    ordenar el listado por "última actividad".
-- 3) motivo_cancelacion: texto obligatorio al pasar un tratamiento a «cancelado»
--    (la baja lógica de esta entidad es el estado cancelado, no una columna
--    `activo`).
-- 4) auditoria_cambios: tabla genérica de auditoría que usan las tres entidades
--    transaccionales (tratamientos, pagos, gastos). Guarda actor, acción, campo,
--    valor anterior / nuevo y motivo. La escritura ocurre dentro de la misma
--    transacción que el cambio auditado.
--
-- `ADD COLUMN IF NOT EXISTS` hace la parte de columnas reejecutable (MariaDB
-- 10.4). Para las claves foráneas, MariaDB 10.4 no acepta
-- `ADD CONSTRAINT IF NOT EXISTS` con `FOREIGN KEY`, así que se las agrega con un
-- guard contra information_schema (mismo patrón que 003_pacientes.sql).
-- ============================================================================

-- ── 1) tratamientos.id_consultorio + FK ─────────────────────────────────────

ALTER TABLE tratamientos
  ADD COLUMN IF NOT EXISTS id_consultorio INT NOT NULL DEFAULT 1;

UPDATE tratamientos
   SET id_consultorio = 1
 WHERE id_consultorio IS NULL OR id_consultorio = 0;

ALTER TABLE tratamientos
  ALTER COLUMN id_consultorio DROP DEFAULT;

-- ── 2) tratamientos.fecha_actualizacion ─────────────────────────────────────

ALTER TABLE tratamientos
  ADD COLUMN IF NOT EXISTS fecha_actualizacion DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ── 3) tratamientos.motivo_cancelacion ──────────────────────────────────────

ALTER TABLE tratamientos
  ADD COLUMN IF NOT EXISTS motivo_cancelacion VARCHAR(255) NULL;

-- ── FK tratamientos.id_consultorio → consultorios.id_consultorio ────────────

SET @existe_fk_trat_consultorio := (
  SELECT COUNT(*) FROM information_schema.table_constraints
   WHERE table_schema = DATABASE()
     AND table_name = 'tratamientos'
     AND constraint_name = 'fk_tratamientos_consultorio'
);
SET @sql_fk_trat_consultorio := IF(@existe_fk_trat_consultorio > 0,
  'SELECT 1',
  'ALTER TABLE tratamientos ADD CONSTRAINT fk_tratamientos_consultorio FOREIGN KEY (id_consultorio) REFERENCES consultorios (id_consultorio)'
);
PREPARE stmt_fk_trat_consultorio FROM @sql_fk_trat_consultorio;
EXECUTE stmt_fk_trat_consultorio;
DEALLOCATE PREPARE stmt_fk_trat_consultorio;

-- ── 4) auditoria_cambios (tabla nueva, genérica) ───────────────────────────

CREATE TABLE IF NOT EXISTS auditoria_cambios (
  id_auditoria   INT AUTO_INCREMENT PRIMARY KEY,
  entidad        VARCHAR(40)  NOT NULL,   -- 'tratamientos','pagos','gastos'
  id_entidad     INT          NOT NULL,
  id_usuario     INT          NOT NULL,   -- actor del cambio
  accion         VARCHAR(20)  NOT NULL,   -- 'alta','modificacion','cambio_estado','cancelacion'
  campo          VARCHAR(60)  NULL,
  valor_anterior VARCHAR(255) NULL,
  valor_nuevo    VARCHAR(255) NULL,
  motivo         VARCHAR(255) NULL,
  fecha          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_entidad (entidad, id_entidad),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (ID_USUARIO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
