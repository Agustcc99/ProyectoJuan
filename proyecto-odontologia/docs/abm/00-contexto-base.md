# Contexto base para desarrollo de ABMs — Odontología Herrera

> **Pegá / referenciá este archivo al inicio de CADA conversación de ABM, antes del archivo de la entidad.**
> Es el contrato de arquitectura. Seguilo al pie de la letra para que todos los módulos queden iguales.

---

## Rol

Actuá como **desarrollador full-stack senior** sobre un sistema ya en producción con datos reales.
Agregás el ABM de UNA entidad **respetando exactamente** los patrones existentes. No refactorices
código ajeno, no agregues librerías, no renombres nada. Si el pedido choca con el código o la BD
existente, avisá antes de tocar.

## Stack (no agregar nada fuera de esto)

- **Backend:** Node.js + Express 5, `mysql2/promise` con SQL crudo (sin ORM), JWT + bcrypt.
- **Frontend:** React 19, react-router-dom 7, axios, Bootstrap 5, `lucide-react`.
- **BD:** MySQL, base `odontologia_herrera` (correr el servidor antes de probar).

## Base de datos — REGLAS CRÍTICAS

**Todas las tablas ya existen y tienen datos.** Verificá el estado real con:
```
node -e "require('dotenv').config();const m=require('mysql2/promise');(async()=>{const c=await m.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});const [t]=await c.query('SHOW TABLES');for(const r of t){const n=Object.values(r)[0];const [x]=await c.query('SHOW CREATE TABLE `'+n+'`');console.log(x[0]['Create Table'],'\n')}await c.end()})()"
```
(desde `backend/`).

1. **NUNCA `CREATE TABLE` sobre una tabla existente, nunca `DROP`, nunca renombrar columnas.**
   Solo `ALTER TABLE <tabla> ADD COLUMN ...` aditivo.
2. Toda migración va en **`database/migrations/NNN_descripcion.sql`** (NNN incremental: 001, 002…).
   El ABM 01 crea la carpeta `database/` + `database/schema-actual.sql` (dump de referencia, solo lectura).
3. **Nombres de tabla tal cual están** (irregulares): `estados_tratamiento` (singular),
   `medios_pago`, `tipos_gasto`, `tipos_tratamiento`, `pacientes`, `tratamientos`, `pagos`, `gastos`.
4. **Columnas de dominio en MAYÚSCULAS** (`ID_PACIENTE`, `NOMBRE`, `DNI`, `ACTIVO`, `PRECIO_PACIENTE`…).
   MySQL las trata case-insensitive → **en los `service` escribí el SQL en minúsculas**, igual que
   `backend/src/modules/auth/auth.service.js` hoy (`SELECT id_usuario, email FROM usuarios`).
5. **Multi-tenant en entidades de negocio.** Hoy las tablas de negocio y los catálogos no tienen
   `id_consultorio`. **Cada ABM de negocio** (`pacientes`, `tratamientos`, `pagos`, `gastos`)
   agrega en su migración `id_consultorio INT NOT NULL` + `FOREIGN KEY (id_consultorio) REFERENCES
   consultorios(id_consultorio)`, con `UPDATE ... SET id_consultorio = 1` para las filas
   existentes. Todas sus queries filtran por `req.usuario.id_consultorio` y todo INSERT lo estampa
   (junto con `id_usuario` como autor). Igual que `roles.service.js` / `usuarios.service.js`.
   **Los catálogos NO llevan `id_consultorio`** (son listas globales compartidas).
6. Convenciones para columnas nuevas: `activo` TINYINT(1) NOT NULL DEFAULT 1 · `anulado` TINYINT(1)
   NOT NULL DEFAULT 0 · timestamps DATETIME DEFAULT CURRENT_TIMESTAMP.
7. **Seeds existentes (usar estos IDs, no recrearlos):**
   - estados_tratamiento: 1 pendiente · 2 en proceso · 3 finalizado · 4 cancelado
   - medios_pago: 1 efectivo · 2 transferencia · 3 tarjeta · 4 obra social
   - tipos_gasto: 1 insumo · 2 laboratorio · 3 protesis · 4 servicio externo · 5 otro
   - tipos_tratamiento: 1 limpieza · 2 endodoncia · 3 perno y corona · 4 extraccion · 5 ortodoncia
8. **Permisos:** 17 ya sembrados (ver `00-roadmap.md` §1). Reutilizarlos. Los nuevos van en
   `database/migrations/NNN_permisos_<entidad>.sql` con `INSERT INTO permisos (...)` +
   `INSERT INTO roles_permisos` para el rol administrador (`id_rol = 1`).
   Nomenclatura establecida: `ver_X`, `crear_X` (o `registrar_X` en movimientos), `editar_X`,
   `desactivar_X`, `reactivar_X`.

## Estructura de un módulo backend

```
backend/src/modules/<entidad>/
  <entidad>.routes.js      → endpoints: verificarToken + verificarPermiso + llamada al service. SIN try/catch.
  <entidad>.service.js     → reglas de negocio + acceso a datos con poolDeConexiones. Lanza Error con .statusCode.
  <entidad>.validator.js   → middlewares de validación: arman array `errores` y responden enviarError(res, 400, ..., errores).
```
Referencia canónica: **`backend/src/modules/roles/`** + **`backend/src/modules/auth/auth.validator.js`**.
El scaffold de `pacientes/` tiene `.controller.js` y `.repository.js` **vacíos** → borrarlos.

### Reglas backend obligatorias

1. **Respuestas** con `src/utils/response.js`:
   ```js
   const { enviarExito } = require("../../utils/response");
   enviarExito(res, 200, "Pacientes obtenidos correctamente.", { pacientes });
   // → { ok: true, mensaje, pacientes }
   ```
   Validación: `enviarError(res, 400, "Los datos enviados no son válidos.", errores)`.
2. **Nunca `try/catch` en las rutas.** El service lanza `const e = new Error("..."); e.statusCode = 404; throw e;`
   y el `errorMiddleware` (ya en `app.js`) lo captura. Express 5 reenvía las promesas rechazadas solo.
3. **Auth:** `const { verificarToken, verificarPermiso } = require("../../middlewares/authMiddleware");`
   ```js
   router.get("/", verificarToken, verificarPermiso("ver_<entidad>"), async (req, res) => { ... });
   ```
4. **SQL parametrizado siempre** (`poolDeConexiones.query(sql, [valores])`). Nunca interpolar.
5. **Transacciones** (`getConnection` + `beginTransaction/commit/rollback/release`) cuando se escribe
   en más de una tabla — ver `roles.service.js` → `actualizarPermisosDeRol`. La escritura de
   auditoría va DENTRO de la transacción del cambio.
6. **Baja lógica:** `PATCH /:id/desactivar` + `PATCH /:id/reactivar` con `activo`. Nunca `DELETE` físico.
   En movimientos (`pagos`, `gastos`) la baja se llama **anular** (`PATCH /:id/anular` con `{ motivo }`).
7. Registrar la ruta en `backend/src/app.js`:
   ```js
   const <entidad>Routes = require("./modules/<entidad>/<entidad>.routes");
   app.use("/api/<entidad>", <entidad>Routes);
   ```
8. Nombres en español, largos y descriptivos: `listarPacientes`, `crearPaciente`, `poolDeConexiones`.

### Plantilla de service

```js
const { poolDeConexiones } = require("../../config/db");

async function listar<Entidad>(filtros = {}) {
  const [filas] = await poolDeConexiones.query(
    `SELECT ... FROM <tabla> WHERE ... ORDER BY ...`, [/* params */]
  );
  return filas;
}

async function crear<Entidad>(datos, idUsuario) {
  // 1. normalizar/trim  2. validaciones de negocio → throw Error con .statusCode
  // 3. chequeo de duplicados (SELECT ... LIMIT 1)  4. INSERT parametrizado (estampar id_usuario)
  // 5. return del objeto creado (insertId)
}

module.exports = { listar<Entidad>, crear<Entidad>, ... };
```

## Estructura de un módulo frontend

```
frontend/src/modules/<entidad>/
  pages/<Pagina>.jsx
  services/<entidad>Service.js   → funciones axios, devuelven respuesta.data
  components/                    → formulario, modal de confirmación
  styles/<entidad>.css           → si hace falta
```
Referencia canónica: **`frontend/src/modules/roles/`** (`RolesPage.jsx`, `rolesService.js`,
`components/ConfirmacionAccionModal.jsx`, `styles/roles.css`).

### Reglas frontend obligatorias

1. **Service:** `import api from "../../../services/api";` — `api` ya inyecta el JWT y maneja el 401.
   No tocar `services/api.js`. Las funciones devuelven `respuesta.data` (`{ ok, mensaje, <datos> }`).
2. **Ruta** en `frontend/src/routes/AppRouter.jsx`, dentro de `<Route path="/panel">`:
   ```jsx
   <Route path="<entidad>" element={
     <RutaPorPermiso permisoRequerido="ver_<entidad>"><Pagina<Entidad> /></RutaPorPermiso>
   } />
   ```
   Varios permisos: `permisosRequeridos={["a","b"]} modo="todos"`.
3. **Menú lateral** en `frontend/src/components/layout/LayoutPrincipal.jsx`:
   agregar al array `itemsNav` con `mostrar: tienePermiso("ver_<entidad>")` + título en
   `obtenerTituloRutaActual(pathname)`.
4. **Permisos en pantalla:** `const { tienePermiso } = useAuth();` → ocultar/deshabilitar botones.
5. **Estados de página estándar** (ver `RolesPage.jsx`): `cargando`, `mensajeError`, `mensajeExito`,
   `busqueda`, `filtroEstado` (`todos`/`activos`/`inactivos`), modal de confirmación para baja/reactivación.
6. **Error:** leer `error.response?.data?.mensaje`; el 403 → "No tenés permisos…".
7. Estilo: Bootstrap 5 + clases del panel (`page-header`, `panel-card`, `panel-btn-primary`) que ya
   usa `PaginaPacientes.jsx`.

## Entregables de CADA conversación de ABM

1. **Backend:** `<entidad>.routes.js`, `.service.js`, `.validator.js` + alta en `app.js`.
2. **Frontend:** `pages/`, `services/`, `components/` + ruta en `AppRouter.jsx` + ítem en `LayoutPrincipal.jsx`.
3. **SQL:** migración(es) en `database/migrations/NNN_*.sql` (columnas nuevas + permisos nuevos).
4. **Documento SprintLog `.docx`:** seguir `docs/abm/_plantilla-documentacion.md` al pie de la
   letra (replica el formato de `com.docx`: Calibri, encabezados `#1F3864`/`#2E74B5`, tablas
   `#999999` con header `#D9D9D9`, mockups en escala de grises). Usar el skill `docx`. Salida en
   `docs/abm/entregas/<NN>-<entidad>/SprintLog-<Entidad>.docx`. Confirmar con el usuario el
   número de Sprint y el HU inicial antes de generarlo.
5. **Checklist de aceptación** + tabla de prueba manual de la API (endpoint, método, body, respuesta esperada).
6. **No** tocar módulos de otras entidades salvo los 3 puntos de integración (app.js, AppRouter.jsx, LayoutPrincipal.jsx).

## Flujo de trabajo esperado

1. Mostrame primero el **plan**: archivos a crear/editar, migración SQL, endpoints, permisos nuevos,
   y el esqueleto del documento SprintLog. Esperá mi OK.
2. Backend completo.
3. Frontend completo.
4. Documento SprintLog.
5. Checklist de aceptación + cómo probarlo.
