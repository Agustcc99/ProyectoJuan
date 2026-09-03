-- ============================================================================
-- schema-actual.sql  .  Odontologia Herrera  .  base odontologia_herrera
-- ----------------------------------------------------------------------------
-- DUMP DE REFERENCIA - SOLO LECTURA. No forma parte del flujo de despliegue.
-- Generado con SHOW CREATE TABLE el 2026-09-02 (MySQL/MariaDB).
-- Retrata el esquema ANTES de aplicar database/migrations/. El esquema vigente
-- es este archivo MAS todas las migraciones aplicadas en orden (ver README.md).
-- No ejecutar sobre una base con datos: las tablas y sus filas ya existen.
-- ============================================================================

CREATE TABLE `consultorios` (
  `id_consultorio` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `color_principal` varchar(20) DEFAULT '#0d6efd',
  `color_secundario` varchar(20) DEFAULT '#6c757d',
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_consultorio`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `estados_tratamiento` (
  `ID_ESTADO` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE_ESTADO` varchar(20) NOT NULL,
  PRIMARY KEY (`ID_ESTADO`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `gastos` (
  `ID_GASTO` int(11) NOT NULL AUTO_INCREMENT,
  `ID_TRATAMIENTO` int(11) DEFAULT NULL,
  `ID_TIPO_GASTO` int(11) NOT NULL,
  `MONTO` decimal(10,2) NOT NULL,
  `DESCRIPCION` text DEFAULT NULL,
  `FECHA_GASTO` datetime NOT NULL DEFAULT current_timestamp(),
  `ID_USUARIO` int(11) NOT NULL,
  PRIMARY KEY (`ID_GASTO`),
  KEY `FK_GASTOS_TRATAMIENTOS` (`ID_TRATAMIENTO`),
  KEY `FK_GASTOS_TIPOS_GASTO` (`ID_TIPO_GASTO`),
  KEY `FK_GASTOS_USUARIOS` (`ID_USUARIO`),
  CONSTRAINT `FK_GASTOS_TIPOS_GASTO` FOREIGN KEY (`ID_TIPO_GASTO`) REFERENCES `tipos_gasto` (`ID_TIPO_GASTO`),
  CONSTRAINT `FK_GASTOS_TRATAMIENTOS` FOREIGN KEY (`ID_TRATAMIENTO`) REFERENCES `tratamientos` (`ID_TRATAMIENTO`),
  CONSTRAINT `FK_GASTOS_USUARIOS` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuarios` (`ID_USUARIO`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `medios_pago` (
  `ID_MEDIO_PAGO` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE_MEDIO` varchar(20) NOT NULL,
  PRIMARY KEY (`ID_MEDIO_PAGO`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `pacientes` (
  `ID_PACIENTE` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE` varchar(50) NOT NULL,
  `APELLIDO` varchar(50) NOT NULL,
  `DNI` varchar(20) DEFAULT NULL,
  `TELEFONO` varchar(20) DEFAULT NULL,
  `EMAIL` varchar(100) DEFAULT NULL,
  `OBRA_SOCIAL` varchar(50) DEFAULT NULL,
  `OBSERVACIONES` text DEFAULT NULL,
  `ACTIVO` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`ID_PACIENTE`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `pagos` (
  `ID_PAGO` int(11) NOT NULL AUTO_INCREMENT,
  `ID_TRATAMIENTO` int(11) NOT NULL,
  `MONTO` decimal(10,2) NOT NULL,
  `ID_MEDIO_PAGO` int(11) NOT NULL,
  `FECHA_PAGO` datetime NOT NULL DEFAULT current_timestamp(),
  `NOTAS` text DEFAULT NULL,
  `ID_USUARIO` int(11) NOT NULL,
  PRIMARY KEY (`ID_PAGO`),
  KEY `FK_PAGOS_TRATAMIENTOS` (`ID_TRATAMIENTO`),
  KEY `FK_PAGOS_MEDIOS_PAGO` (`ID_MEDIO_PAGO`),
  KEY `FK_PAGOS_USUARIOS` (`ID_USUARIO`),
  CONSTRAINT `FK_PAGOS_MEDIOS_PAGO` FOREIGN KEY (`ID_MEDIO_PAGO`) REFERENCES `medios_pago` (`ID_MEDIO_PAGO`),
  CONSTRAINT `FK_PAGOS_TRATAMIENTOS` FOREIGN KEY (`ID_TRATAMIENTO`) REFERENCES `tratamientos` (`ID_TRATAMIENTO`),
  CONSTRAINT `FK_PAGOS_USUARIOS` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuarios` (`ID_USUARIO`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `permisos` (
  `id_permiso` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_permiso` varchar(100) NOT NULL,
  `nombre_permiso` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `codigo_permiso` (`codigo_permiso`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `roles` (
  `ID_ROL` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE_ROL` varchar(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `id_consultorio` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`ID_ROL`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `roles_permisos` (
  `id_rol` int(11) NOT NULL,
  `id_permiso` int(11) NOT NULL,
  `fecha_asignacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_rol`,`id_permiso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tipos_gasto` (
  `ID_TIPO_GASTO` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE_TIPO` varchar(20) NOT NULL,
  PRIMARY KEY (`ID_TIPO_GASTO`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tipos_tratamiento` (
  `ID_TIPO_TRATAMIENTO` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE` varchar(50) NOT NULL,
  `DESCRIPCION` text DEFAULT NULL,
  `ACTIVO` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`ID_TIPO_TRATAMIENTO`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tratamientos` (
  `ID_TRATAMIENTO` int(11) NOT NULL AUTO_INCREMENT,
  `ID_PACIENTE` int(11) NOT NULL,
  `ID_TIPO_TRATAMIENTO` int(11) NOT NULL,
  `DESCRIPCION` text DEFAULT NULL,
  `PRECIO_PACIENTE` decimal(10,2) NOT NULL,
  `ID_ESTADO` int(11) NOT NULL,
  `FECHA_INICIO` date DEFAULT NULL,
  `FECHA_FIN` date DEFAULT NULL,
  `OBSERVACIONES` text DEFAULT NULL,
  `ID_USUARIO` int(11) NOT NULL,
  `FECHA_CREACION` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ID_TRATAMIENTO`),
  KEY `FK_TRATAMIENTOS_PACIENTES` (`ID_PACIENTE`),
  KEY `FK_TRATAMIENTOS_TIPOS_TRATAMIENTO` (`ID_TIPO_TRATAMIENTO`),
  KEY `FK_TRATAMIENTOS_ESTADOS` (`ID_ESTADO`),
  KEY `FK_TRATAMIENTOS_USUARIOS` (`ID_USUARIO`),
  CONSTRAINT `FK_TRATAMIENTOS_ESTADOS` FOREIGN KEY (`ID_ESTADO`) REFERENCES `estados_tratamiento` (`ID_ESTADO`),
  CONSTRAINT `FK_TRATAMIENTOS_PACIENTES` FOREIGN KEY (`ID_PACIENTE`) REFERENCES `pacientes` (`ID_PACIENTE`),
  CONSTRAINT `FK_TRATAMIENTOS_TIPOS_TRATAMIENTO` FOREIGN KEY (`ID_TIPO_TRATAMIENTO`) REFERENCES `tipos_tratamiento` (`ID_TIPO_TRATAMIENTO`),
  CONSTRAINT `FK_TRATAMIENTOS_USUARIOS` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuarios` (`ID_USUARIO`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `usuarios` (
  `ID_USUARIO` int(11) NOT NULL AUTO_INCREMENT,
  `NOMBRE` varchar(50) NOT NULL,
  `APELLIDO` varchar(50) NOT NULL,
  `EMAIL` varchar(100) NOT NULL,
  `CONTRASENA_HASH` varchar(250) NOT NULL,
  `ID_ROL` int(11) NOT NULL,
  `id_consultorio` int(11) NOT NULL DEFAULT 1,
  `ACTIVO` tinyint(1) NOT NULL DEFAULT 1,
  `FECHA_CREACION` datetime NOT NULL DEFAULT current_timestamp(),
  `token_recuperacion_hash` varchar(255) DEFAULT NULL,
  `token_recuperacion_expira` datetime DEFAULT NULL,
  PRIMARY KEY (`ID_USUARIO`),
  UNIQUE KEY `UQ_USUARIOS_EMAIL` (`EMAIL`),
  KEY `FK_USUARIOS_ROLES` (`ID_ROL`),
  CONSTRAINT `FK_USUARIOS_ROLES` FOREIGN KEY (`ID_ROL`) REFERENCES `roles` (`ID_ROL`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

