# Conversación 5 — Frontend (tablet: pantalla pública de firma)

> Requiere: `docs/abm/00-contexto-base.md` + `docs/Consentimiento/00-contexto-y-arquitectura.md`
> + Conversación 3 aplicada (endpoints públicos + sellado).
> Entregable: ruta pública `/firmar/:token` en `AppRouter.jsx` (fuera de `/panel`),
> `frontend/src/modules/consentimientos/pages/FirmaPublicaPage.jsx` + subcomponentes,
> `frontend/src/services/publicoApi.js`, dependencia `react-signature-canvas`.

---

## Objetivo

La pantalla que abre el paciente al escanear el QR. Un **asistente lineal**, mobile-first,
pensado para una tablet en manos del paciente, **sin sesión**:

```
Cargando → Identidad (DNI) → [ por cada documento: Leer → Firmar ] → Éxito
                                         └── errores: enlace inválido / vencido / cancelado / ya completo
```

---

## Reglas duras

1. **Fuera de `/panel`.** En `AppRouter.jsx`, como hermana de `/login`:
   ```jsx
   <Route path="/firmar/:token" element={<FirmaPublicaPage />} />
   ```
   Va **antes** del `<Route path="*" ... />` final. No se envuelve en `RutaPrivada` ni
   `RutaPorPermiso`. No aparece en `LayoutPrincipal` ni en `obtenerTituloRutaActual`.

2. **Cliente axios separado — `frontend/src/services/publicoApi.js`:**
   ```js
   import axios from "axios";
   const publicoApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });
   export default publicoApi;
   ```
   **No** importar `services/api.js` en esta pantalla: ese inyecta el JWT y, ante un 401
   (que acá es un caso de negocio — "DNI incorrecto"), limpia sesión y redirige a `/login`.
   `publicoApi` no tiene interceptores.

3. **No leer `localStorage` de sesión, no usar `useAuth`.** La tablet puede no haber
   iniciado sesión nunca.

4. **El token viaja solo en la URL** (`useParams().token`). No mandarlo en headers, no
   loguearlo, no ponerlo en el `title` de la página.

---

## Estructura

```
frontend/src/modules/consentimientos/
  pages/FirmaPublicaPage.jsx          → máquina de estados del asistente + fetch
  components/PasoIdentidad.jsx        → input DNI + confirmar
  components/PasoDocumento.jsx        → texto legal scrolleable + "ya leí" + lienzo
  components/LienzoFirma.jsx          → wrapper de react-signature-canvas (borrar / confirmar)
  components/FirmaEstadoPantalla.jsx  → pantallas de estado (cargando / vencido / cancelado / éxito)
  styles/firma-publica.css            → estilos propios (NO usar el chrome del panel)
  services/firmaPublicaService.js     → funciones sobre publicoApi
```

`services/publicoApi.js` va en `frontend/src/services/` (junto a `api.js`).

Instalar: `cd frontend && npm install react-signature-canvas`.

---

## `services/firmaPublicaService.js`

`import publicoApi from "../../../services/publicoApi";` — devuelven `respuesta.data`.

| Función | Llama a |
|---|---|
| `obtenerSesion(token)` | `GET /publico/consentimientos/:token` |
| `confirmarIdentidad(token, dni)` | `POST /publico/consentimientos/:token/identidad` |
| `obtenerDocumento(token, idDoc)` | `GET /publico/consentimientos/:token/documentos/:id` |
| `firmarDocumento(token, idDoc, firmaBase64)` | `POST /publico/consentimientos/:token/documentos/:id/firmar` |

---

## `FirmaPublicaPage.jsx` — máquina de estados

**Estado local:** `fase`, `sesion`, `documentos`, `paciente`, `documentoActual`,
`cargando`, `error`, `intentosRestantes`.

**Fases:**

| `fase` | Pantalla | Transición |
|---|---|---|
| `cargando` | Spinner | `obtenerSesion(token)` al montar |
| `no_valido` | "Este enlace no es válido." | token 404 |
| `vencido` | "El enlace venció. Pedí uno nuevo en el consultorio." | `sesion.estado === "expirada"` |
| `cancelado` | "La firma fue cancelada. Pedí un enlace nuevo." | `sesion.estado === "cancelada"` |
| `completo` | "Ya firmaste todos los documentos. ¡Gracias!" | `sesion.estado === "completa"` (o todos `firmado`) |
| `identidad` | `<PasoIdentidad>` | `sesion.identidad_confirmada === false` |
| `lista` | Resumen: "Documento 1 de N" + botón "Firmar documento" | identidad OK y quedan pendientes |
| `documento` | `<PasoDocumento>` para `siguiente_documento_id` | usuario toca "Firmar documento" |
| `firmando` | Overlay "Guardando la firma…" | mientras corre `firmarDocumento` |
| `error_firma` | Aviso + "Reintentar" | error de red en la firma |

Tras firmar OK: re-fetch `obtenerSesion(token)` → si quedan pendientes vuelve a `lista`
(ahora "Documento 2 de N"); si no, `completo`.

**Al montar** y **tras confirmar identidad**, `obtenerSesion` trae `siguiente_documento_id`;
la página decide `lista` vs `completo`.

---

## `PasoIdentidad.jsx`

- Texto: *"Para continuar, confirmá tu DNI."*
- Pista: *"Tu DNI termina en {paciente.dni_ultimos4}."*
- `<input inputMode="numeric" autoComplete="off">` — sin formateo forzado, el backend
  normaliza (acepta con y sin puntos).
- Botón "Confirmar" → `confirmarIdentidad(token, dni)`.
  - `200` → la página avanza (`lista` / `documento`).
  - `401` → mostrar `error.response.data.mensaje` ("El DNI no coincide. Te quedan N…") y
    dejar reintentar. Leer `intentosRestantes` del mensaje o de un campo si el backend lo agrega.
  - `409` (sesión cancelada por intentos, o iniciada por otra persona) → fase `cancelado`.
- Sin autocompletar, sin guardar el DNI en `localStorage`.

---

## `PasoDocumento.jsx`

- Encabezado: `{titulo}` + `Documento {orden} de {total}`.
- **Cuerpo legal** en un contenedor scrolleable (`max-height` ~55vh, `overflow-y:auto`),
  párrafos de `cuerpo.split("\n\n")`.
- **Gate de lectura:** el botón "Firmar" arranca deshabilitado y se habilita cuando el
  usuario **llegó al final del scroll** (`onScroll`: `scrollTop + clientHeight >= scrollHeight - 8`).
  Si el texto entra sin scroll, habilitar directo. Además un checkbox
  *"Leí y entiendo este documento"* que también debe estar tildado.
- Al tocar "Firmar" → muestra `<LienzoFirma>` (en la misma pantalla, debajo, o en un paso).

---

## `LienzoFirma.jsx`

- Envuelve `react-signature-canvas`:
  ```jsx
  import SignatureCanvas from "react-signature-canvas";
  const ref = useRef();
  <SignatureCanvas ref={ref} penColor="#111"
     canvasProps={{ className: "lienzo-firma" }} />
  ```
- CSS: el canvas ocupa el ancho disponible, alto ~220px, borde punteado, `touch-action: none`.
- Botones: **"Borrar"** (`ref.current.clear()`) y **"Confirmar firma"**.
- Validar que no esté vacío: `ref.current.isEmpty()` → si vacío, aviso "Firmá antes de confirmar."
- Al confirmar:
  ```js
  const firmaBase64 = ref.current.getTrimmedCanvas().toDataURL("image/png");
  ```
  → `firmarDocumento(token, idDoc, firmaBase64)`.
- **Redimensionado:** `react-signature-canvas` no reescala el buffer solo. En un `useEffect`
  con listener de `resize` (y al montar), ajustar el tamaño real del canvas al de su caja
  (`canvas.width = offsetWidth * ratio` …) y `ref.current.clear()` para evitar deformación.
  Mantenerlo simple: fijar un tamaño y `viewport` estable en CSS y bloquear zoom
  (`<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
  ya está en `index.html`; si no, agregarlo — verificar sin romper el resto).

---

## `FirmaEstadoPantalla.jsx`

Pantalla a página completa, centrada, con ícono (lucide-react ya está) y texto grande para
las fases `no_valido`, `vencido`, `cancelado`, `completo`, `error_firma`. Sin botones que
lleven al panel (el paciente no tiene por qué entrar ahí). En `completo`, opcional: *"Podés
devolverle la tablet a la asistente."*

---

## Estilo / UX

- **Mobile-first.** Contenedor `max-width: 640px`, centrado, padding generoso.
- Tipografía y botones grandes (mín. 44px de alto táctil).
- **No** usar `panel.css` ni el sidebar/topbar. `firma-publica.css` propio, minimalista,
  legible. Bootstrap está disponible pero mantener la pantalla despojada.
- Sin dark mode especial (no es requisito).
- Que funcione en Safari iOS y Chrome Android (los navegadores de tablet más comunes).

---

## `.env` del frontend

`VITE_API_URL` ya existe y apunta al backend — se reutiliza. **No** hace falta nada nuevo
en el frontend. En despliegue, `APP_URL_FRONTEND` del **backend** (Conv. 2) debe apuntar a
la URL pública de este frontend para que el QR lleve a `/firmar/:token` correcto.

---

## Prueba en dispositivo real (dev)

1. Backend en `0.0.0.0:3000`, frontend Vite con `--host` (`npm run dev -- --host`).
2. `APP_URL_FRONTEND` del backend = `http://<IP-LAN-de-la-PC>:5173`.
3. `VITE_API_URL` del frontend = `http://<IP-LAN-de-la-PC>:3000/api`.
4. Generar la sesión desde la ficha en la PC, escanear el QR con la tablet/celular en la
   misma red WiFi.

---

## Checklist de aceptación (Conversación 5)

- [ ] `npm install react-signature-canvas` hecho; `package.json` actualizado.
- [ ] `services/publicoApi.js` creado (axios sin interceptores); la pantalla **no** importa `services/api.js`.
- [ ] Ruta `/firmar/:token` en `AppRouter.jsx`, fuera de `/panel`, accesible sin login.
- [ ] La pantalla no usa `useAuth` ni lee `localStorage` de sesión.
- [ ] Token inválido → "enlace no es válido"; sesión vencida → "el enlace venció"; cancelada → mensaje de cancelación; completa → "ya firmaste todo".
- [ ] Identidad: pista con los últimos 4 del DNI; DNI correcto (con o sin puntos) avanza; DNI errado muestra intentos restantes; al 6.º → pantalla de cancelación.
- [ ] Por cada documento: texto scrolleable, botón "Firmar" bloqueado hasta llegar al final + checkbox "leí y entiendo".
- [ ] Lienzo: dibuja con el dedo/mouse, "Borrar" limpia, "Confirmar" con lienzo vacío avisa.
- [ ] Firmar envía el PNG (`getTrimmedCanvas().toDataURL`) y avanza al siguiente documento.
- [ ] Con N documentos: el progreso "Documento X de N" es correcto; al firmar el último → pantalla de éxito.
- [ ] Corte de red al firmar → "error, reintentar" sin perder el lugar; los documentos ya firmados no se re-piden.
- [ ] Reabrir el mismo enlace tras firmar 1 de 2 → retoma en el documento 2 (identidad ya confirmada).
- [ ] Responsive real: probado en una tablet o en el emulador móvil del navegador; botones cómodos, sin scroll horizontal, sin zoom accidental.
- [ ] La pantalla del panel (Conv. 4) muestra el avance en vivo mientras se firma desde la tablet.

---

## Qué queda para la Conversación 6

Con el flujo completo funcionando de punta a punta, la **Conversación 6** genera el
documento `.docx` SprintLog (Sprint 6) con el formato de `com.docx`, los mockups en escala
de grises y la tabla de prueba manual consolidada.
Ver [`06-documentacion-sprintlog.md`](06-documentacion-sprintlog.md).
