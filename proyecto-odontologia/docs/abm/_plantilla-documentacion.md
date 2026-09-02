# Plantilla de documentación SprintLog por ABM

> Cada conversación de ABM, además del código, genera **un documento `.docx`** que replica
> EXACTAMENTE el formato del documento modelo del proyecto.
>
> **Modelo de referencia (leerlo antes de generar):** [`docs/abm/modelo/com.docx`](modelo/com.docx)
> — es el documento real del proyecto (Sprint 3 = auditoría; **Sprint 4 = ABM de Tratamiento**,
> que es el patrón a imitar). Wireframes de ejemplo en [`docs/abm/modelo/mockups-ejemplo/`](modelo/mockups-ejemplo/).
> Leerlo con: `pandoc -t markdown docs/abm/modelo/com.docx` o el script `python-docx` habitual.
>
> El modelo es un export de **Google Docs**, así que el `.docx` que generemos tiene que abrir
> limpio en Google Docs (tablas en DXA, nunca porcentaje; sin `\n`; una imagen por `Paragraph`).

Salida: `docs/abm/entregas/<NN>-<entidad>/SprintLog-<Entidad>.docx`
+ los mockups en `docs/abm/entregas/<NN>-<entidad>/mockups/*.png`.

Generación: usar el skill **`docx`** (docx-js). Renderizar a PDF al final y revisar visualmente.

---

## 1. Especificación de estilo (calcada de `com.docx`)

### Página
- Tamaño **A4** (`size: { width: 11906, height: 16838 }` en DXA), orientación vertical.
- Márgenes **1417 DXA** (2,5 cm) en los 4 lados. `header: 708`, `footer: 708`.

### Fuente base / párrafos
- **Calibri 11 pt** (`size: 22` en half-points), interlineado **1.15** (`line: 276, lineRule: "auto"`).
- Párrafos de texto corrido: **justificados** (`alignment: AlignmentType.JUSTIFIED`), `spacing.after: 160`.
- Nunca usar `\n`: cada línea es un `Paragraph` aparte.

### Encabezados (con estos colores y tamaños exactos)

| Nivel | Uso | Fuente | Tamaño | Color | Negrita/Itálica | Espaciado |
|---|---|---|---|---|---|---|
| **Heading 1** | `SPRINT N — <título>` | Calibri | 15 pt (`size: 30`) | `#1F3864` | **negrita** | before 240 / after 200 |
| **Heading 2** | Secciones (Objetivo, Sprint Backlog, …) | Calibri | 13 pt (`size: 26`) | `#1F3864` | **negrita** | before 200 / after 160 |
| **Heading 3** | `HUxx – <título>` | Calibri | 11,5 pt (`size: 23`) | `#000000` | **negrita** | before 160 / after 120 |
| **Heading 4** | "Criterios de aceptación" · "Prototipo de interfaz" · "Subtareas técnicas con estimación" | Calibri | 11 pt (`size: 22`) | `#2E74B5` | *itálica* (NO negrita) | sin espaciado extra |

- Sub-rótulo **"Descripción (formato Scrum)"**: NO es un heading — es un párrafo en **negrita 11,5 pt** (`size: 23`, `bold: true`), color negro.
- **"Criterio N: <nombre>"**: párrafo con el texto en **negrita** (Calibri 11 pt).
- Líneas Gherkin y Scrum: **la primera palabra en negrita**, el resto normal:
  - `**Como** <rol>` / `**quiero** <acción>` / `**para** <objetivo>.`
  - `**Dado** <…>` / `**Cuando** <…>` / `**Entonces** <…>`

### Encabezado y pie de página (header/footer del documento)
- **Header:** texto `Agustin Tacconi Gianello - Desarrollo Web`, Calibri **9 pt** (`size: 18`), color `#555555`,
  con **borde inferior** `#AAAAAA` (0,5 pt, `single`).
- **Footer:** número de página **centrado**, Calibri 9 pt, color `#555555`.

### Tablas (estilo "Table1")
- Ancho fijo **9075 DXA** (`layout: FIXED`), suma de columnas = 9075.
- Bordes: todos (`top,left,bottom,right,insideH,insideV`) **`single`, 0,5 pt (`size: 4`), color `#999999`**.
- **Fila de encabezado:** `tableHeader: true`, relleno `shading: { type: ShadingType.CLEAR, fill: "D9D9D9" }`,
  celdas centradas verticalmente, márgenes de celda `top/bottom: 80`, `left/right: 100` (DXA).
- Texto de encabezado: **Calibri negrita 10 pt** (`size: 20`).
- Texto de celda: Calibri 10 pt (`size: 20`), normal.
- `width` en DXA en cada celda además de `columnWidths` en la tabla (si no, Google Docs lo rompe).
- Nunca `ShadingType.SOLID` (renderiza negro).

### Portada / bloque de identificación (se repite al inicio de cada Sprint)
Cuatro párrafos `normal` (Calibri 11 pt), uno por línea:
```
Instituto Superior Santo Domingo
Agustin Tacconi Gianello - Practica Profesionalizante
Desarrollo Web - 5to Semestre 2026
Docente - Nadia Gallardo
```

### Mockups / prototipos
- **Wireframe en escala de grises** (estilo del modelo: fondo blanco, bordes finos negros/grises,
  botón primario relleno gris oscuro, textos gris). Sin color de marca.
- Layout del sistema: sidebar "Consultorio Herrera" (Dashboard / Pacientes / Tratamientos / Reportes /
  Administración) + topbar con breadcrumb (`Panel / <Módulo> / <ID>`) y chip de usuario
  (`Julieta · Asistente`).
- Generarlos como **HTML/CSS** y renderizar a PNG (p. ej. con el browser del entorno o
  `soffice`), guardarlos en `mockups/`. Insertarlos con `ImageRun` (`type: "png"`), un
  `Paragraph` por imagen, precedidos del pie: `Figura N – Prototipo de la pantalla «<nombre>» (HUxx)`.

### Constantes docx-js (copiar al script generador)

```js
const FONT = "Calibri";
const COLOR_H1_H2 = "1F3864";
const COLOR_H3 = "000000";
const COLOR_H4 = "2E74B5";
const COLOR_TENUE = "555555";
const BORDE_TABLA = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const SHADING_HEADER = { type: ShadingType.CLEAR, fill: "D9D9D9" };
const PAGE_A4 = { width: 11906, height: 16838 };
const MARGIN = 1417;
const styles = {
  default: { document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 276 } } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 30, bold: true, color: COLOR_H1_H2 },
      paragraph: { spacing: { before: 240, after: 200 } } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 26, bold: true, color: COLOR_H1_H2 },
      paragraph: { spacing: { before: 200, after: 160 } } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 23, bold: true, color: COLOR_H3 },
      paragraph: { spacing: { before: 160, after: 120 } } },
    { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { font: FONT, size: 22, italics: true, color: COLOR_H4 },
      paragraph: { spacing: { before: 0, after: 0 } } },
  ],
};
```

---

## 2. Estructura del documento (orden exacto, calcado de Sprint 4)

```
[bloque de identificación — 4 párrafos normal]

H1  SPRINT <N> — ABM de <Entidad>
normal  <subtítulo: "Registro, modificación, consulta y baja lógica de <Entidad>">
normal  Agustin Tacconi Gianello - Practica Profesionalizante
normal  Desarrollo Web - 5to Semestre 2026
normal  Docente - Nadia Gallardo

H2  Objetivo del Sprint
normal  1–2 párrafos: qué implementa este ABM y por qué esta entidad importa en el negocio.

# --- SOLO entidades transaccionales (tratamientos, pagos, gastos): ---
H2  Entidad transaccional seleccionada: <Entidad>
normal  Intro: el material distingue soporte vs. transaccional; esta tabla lo justifica.
TABLA  [ Señal exigida | Cómo la cumple <Entidad> ]
        Es un evento de negocio        | …
        Afecta procesos y métricas     | …
        Tiene actores                  | …
        Tiene ciclo de estados         | …
normal  Cierre (relación con pagos/gastos).
# --- fin bloque transaccional ---

H2  Sprint Backlog
TABLA  [ Nro | Historia de Usuario | Prioridad | Estimación | Dependencias ]
        HUxx | Como <rol> quiero <…> para <…>. | Alta/Media/Baja | XS/S/M/L (o "S/M") | HU… / Ninguna

H2  Descripción de cada Historia de Usuario

  H3  HUxx – <título>
  bold-11.5  Descripción (formato Scrum)
  normal(just)  **Como** <rol>
  normal(just)  **quiero** <acción>
  normal(just)  **para** <objetivo>.

    H4  Criterios de aceptación
    bold  Criterio 1: <nombre>
    normal  **Dado** <contexto>
    normal  **Cuando** <acción>
    normal  **Entonces** <resultado + mensaje esperado>
    bold  Criterio 2: <nombre>
    …  (2–3 criterios: al menos 1 positivo + 1 de validación/bloqueo)

    H4  Prototipo de interfaz
    normal  Figura <n> – Prototipo de la pantalla «<nombre>» (HUxx)
    [imagen PNG del wireframe]

    H4  Subtareas técnicas con estimación
    TABLA  [ Subtarea técnica | Descripción | Tamaño ]
            <subtarea backend/DB> | <qué hace> | XS/S/M/L
            …
            (vacío) | Total | <talla agregada>

  … (repetir H3 por cada HU)

H2  Consideración para el Sprint <N+1>: <siguiente ABM>
normal  Qué queda para la iteración siguiente, con el mismo formato.
```

### HU mínimas por ABM

| HU | Tema |
|---|---|
| Alta de \<entidad\> | campos obligatorios, valor por defecto, confirmación + ID visible |
| Modificación | campos editables, reglas de bloqueo, se refleja en detalle y listado |
| Consulta / filtros | filtrar + buscar + ordenar; caso "Sin resultados"; aislamiento por consultorio |
| Baja lógica | `desactivar`/`reactivar` (o `anular` en movimientos, o `cancelar` en tratamientos) con motivo; conserva historial |
| (transaccionales) Transiciones de estado | matriz de estados válidos; bloqueo de transición inválida |

### Escala TSHIRT (la del modelo)

`XS` · `S` · `M` · `L` — y combinaciones tipo `S/M` para el total. **No usar horas.**
Si una subtarea da `XL`, partirla en subtareas más chicas.

---

## 3. Reglas de generación

1. El documento se genera **después** del código, con los nombres reales de archivo / endpoint /
   permiso / columna que quedaron implementados.
2. Los **Criterios de aceptación** del `.docx` coinciden 1:1 con el **checklist de aceptación**
   del archivo `0X-<entidad>.md`, redactados en Gherkin.
3. Datos concretos en los criterios usando los **seeds reales**: paciente *Ana Pérez*,
   tipo *endodoncia*, tratamiento de *$50.000,00* con *$20.000,00* cobrados, etc.
4. Numeración de HU **continua** con el proyecto: Sprint 1 = HU1–HU6, Sprint 2 = HU7–HU12,
   Sprint 3 = HT1–HT9, Sprint 4 = HU13–HU16 (Tratamientos, ya documentado en `com.docx`).
   → confirmar con el usuario el `Sprint N` y el `HU` inicial de cada ABM antes de generar.
5. Transaccionales: agregar además las secciones del PDF `PP - Material ABM Transaccional.pdf`
   (Reglas de negocio con matriz de transiciones + Pruebas de criterios con Datos/Pasos/Resultado).
6. Al terminar: `soffice --convert-to pdf` + `pdftoppm` y **revisar visualmente** que los
   encabezados, colores, tablas y mockups coincidan con `com.docx`.
